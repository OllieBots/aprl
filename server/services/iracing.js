const crypto = require('crypto');
const db = require('../db/db');

const IRACING_BASE = 'https://members-ng.iracing.com';

function hashPassword(password, email) {
  return crypto
    .createHash('sha256')
    .update(password + email.toLowerCase())
    .digest('base64');
}

async function getStoredCookie() {
  const league = await db.get('SELECT iracing_session_cookie, iracing_cookie_expiry FROM league WHERE id = 1');
  const now = Math.floor(Date.now() / 1000);
  if (league?.iracing_session_cookie && league?.iracing_cookie_expiry > now) {
    return league.iracing_session_cookie;
  }
  return null;
}

async function authenticate(email, password) {
  const hashedPassword = hashPassword(password, email);

  const response = await fetch(`${IRACING_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: hashedPassword }),
  });

  if (!response.ok) throw new Error(`iRacing auth failed: ${response.status}`);

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error('No session cookie returned from iRacing');

  const expiry = Math.floor(Date.now() / 1000) + 86400;
  await db.run(
    'UPDATE league SET iracing_session_cookie = ?, iracing_cookie_expiry = ? WHERE id = 1',
    setCookie, expiry
  );

  return { cookie: setCookie, expiry };
}

async function fetchFromIRacing(endpoint) {
  const cookie = await getStoredCookie();
  if (!cookie) throw new Error('Not authenticated with iRacing. Please connect first.');

  const response = await fetch(`${IRACING_BASE}/data/${endpoint}`, {
    headers: { Cookie: cookie },
  });

  if (response.status === 401) {
    await db.run('UPDATE league SET iracing_session_cookie = NULL WHERE id = 1');
    throw new Error('iRacing session expired. Please reconnect.');
  }

  if (!response.ok) throw new Error(`iRacing API error: ${response.status}`);

  const linkData = await response.json();

  if (linkData.link) {
    const dataResponse = await fetch(linkData.link, { headers: { Cookie: cookie } });
    if (!dataResponse.ok) throw new Error(`iRacing data fetch error: ${dataResponse.status}`);
    return dataResponse.json();
  }

  return linkData;
}

const DEFAULT_SCORING = {
  p1: 50, p2: 40, p3: 35, p4: 30, p5: 27, p6: 24, p7: 22, p8: 20,
  p9: 18, p10: 16, p11: 14, p12: 12, p13: 10, p14: 9, p15: 8,
  p16: 7, p17: 6, p18: 5, p19: 4, p20: 3, pole: 3, fl: 1,
};

async function importRaceResults(raceId, subsessionId) {
  const data = await fetchFromIRacing(`results/get?subsession_id=${subsessionId}`);

  const race = await db.get('SELECT * FROM races WHERE id = ?', raceId);
  if (!race) throw new Error('Race not found');

  const session = data.session_results?.find(s => s.simsession_name === 'RACE');
  if (!session) throw new Error('No race session found in iRacing data');

  // Load scoring config for this season
  const season = await db.get('SELECT scoring_config FROM seasons WHERE id = ?', race.season_id);
  let scoring = DEFAULT_SCORING;
  if (season?.scoring_config) {
    try {
      const parsed = typeof season.scoring_config === 'string'
        ? JSON.parse(season.scoring_config)
        : season.scoring_config;
      scoring = { ...DEFAULT_SCORING, ...parsed };
    } catch {}
  }

  await db.run('DELETE FROM race_results WHERE race_id = ?', raceId);

  // Insert all results first, then calculate points
  for (const entry of session.results || []) {
    let driver = await db.get('SELECT id FROM drivers WHERE iracing_cust_id = ?', entry.cust_id);
    if (!driver) {
      const res = await db.insert(
        'INSERT INTO drivers (iracing_cust_id, name, irating, status) VALUES (?, ?, ?, ?)',
        entry.cust_id, entry.display_name, entry.newi_rating || 0, 'active'
      );
      driver = { id: res.lastInsertRowid };
    }

    await db.run(
      `INSERT INTO race_results
        (race_id, driver_id, finish_position, starting_position, laps_completed,
         laps_led, fastest_lap_time, incidents, points_awarded, points_adjustment, dnf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      raceId,
      driver.id,
      entry.finish_position_in_class + 1,
      entry.starting_position_in_class + 1,
      entry.laps_complete,
      entry.laps_lead,
      entry.best_lap_time > 0 ? entry.best_lap_time / 10000 : null,
      entry.incidents,
      entry.reason_out_id !== 0 ? 1 : 0
    );
  }

  // Now calculate and apply points
  await applyPoints(raceId, scoring);

  await db.run(
    'UPDATE races SET status = ?, iracing_subsession_id = ?, results_synced_at = ? WHERE id = ?',
    'completed', subsessionId, Math.floor(Date.now() / 1000), raceId
  );
}

async function applyPoints(raceId, scoring) {
  const results = await db.all(
    'SELECT * FROM race_results WHERE race_id = ? ORDER BY finish_position ASC',
    raceId
  );

  // Find fastest lap (ignore nulls and -1s from iRacing)
  const fastestLapResult = results.reduce((best, r) => {
    if (!r.fastest_lap_time || r.fastest_lap_time <= 0) return best;
    return (!best || r.fastest_lap_time < best.fastest_lap_time) ? r : best;
  }, null);

  for (const result of results) {
    const posKey = `p${result.finish_position}`;
    let points = scoring[posKey] ?? 0;

    // Pole bonus (starting position 1)
    if (result.starting_position === 1) points += scoring.pole ?? 0;

    // Fastest lap bonus
    if (fastestLapResult && result.driver_id === fastestLapResult.driver_id) {
      points += scoring.fl ?? 0;
    }

    await db.run(
      'UPDATE race_results SET points_awarded = ? WHERE race_id = ? AND driver_id = ?',
      points, raceId, result.driver_id
    );
  }
}

// Import upcoming sessions from an iRacing league season into the APRL schedule
async function importLeagueSchedule(aprlSeasonId, iracingLeagueId, iracingSeasonId) {
  const data = await fetchFromIRacing(
    `league/season/sessions?league_id=${iracingLeagueId}&season_id=${iracingSeasonId}&results_only=false`
  );

  const sessions = data.sessions || [];
  if (!sessions.length) throw new Error('No sessions found for that iRacing league/season');

  // Save the iRacing IDs on the league and season for future use
  await db.run('UPDATE league SET iracing_league_id = ? WHERE id = 1', iracingLeagueId);
  await db.run('UPDATE seasons SET iracing_season_id = ? WHERE id = ?', iracingSeasonId, aprlSeasonId);

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const track = s.track || {};
    const weather = s.weather || {};

    // Convert iRacing's launch_at ISO string to unix timestamp
    const scheduledAt = s.launch_at ? Math.floor(new Date(s.launch_at).getTime() / 1000) : null;

    // Don't overwrite completed races
    if (s.subsession_id || s.has_results) {
      skipped++;
      continue;
    }

    // Check if this session already exists by iracing_league_session_id
    const existing = s.league_session_id
      ? await db.get('SELECT id, status FROM races WHERE iracing_league_session_id = ?', s.league_session_id)
      : null;

    const raceData = {
      track_name: track.track_name || 'TBD',
      track_config: track.config_name || null,
      scheduled_at: scheduledAt,
      laps: s.race_laps || s.laps || null,
      session_name: s.session_name || null,
      iracing_league_session_id: s.league_session_id || null,
      weather_temp: weather.temp_value ?? null,
      weather_temp_units: weather.temp_units ?? null,
      weather_humidity: weather.rel_humidity ?? null,
      weather_wind_speed: weather.wind_value ?? null,
      weather_wind_units: weather.wind_units ?? null,
      weather_sky: weather.skies ?? null,
      time_of_day: s.time_of_day ?? null,
    };

    if (existing) {
      if (existing.status === 'completed') { skipped++; continue; }
      await db.run(`
        UPDATE races SET
          track_name = ?, track_config = ?, scheduled_at = ?, laps = ?, session_name = ?,
          weather_temp = ?, weather_temp_units = ?, weather_humidity = ?,
          weather_wind_speed = ?, weather_wind_units = ?, weather_sky = ?, time_of_day = ?
        WHERE id = ?`,
        raceData.track_name, raceData.track_config, raceData.scheduled_at, raceData.laps, raceData.session_name,
        raceData.weather_temp, raceData.weather_temp_units, raceData.weather_humidity,
        raceData.weather_wind_speed, raceData.weather_wind_units, raceData.weather_sky, raceData.time_of_day,
        existing.id
      );
    } else {
      await db.insert(`
        INSERT INTO races (
          season_id, round_number, track_name, track_config, scheduled_at, laps,
          status, session_name, iracing_league_session_id,
          weather_temp, weather_temp_units, weather_humidity,
          weather_wind_speed, weather_wind_units, weather_sky, time_of_day
        ) VALUES (?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        aprlSeasonId, i + 1,
        raceData.track_name, raceData.track_config, raceData.scheduled_at, raceData.laps,
        raceData.session_name, raceData.iracing_league_session_id,
        raceData.weather_temp, raceData.weather_temp_units, raceData.weather_humidity,
        raceData.weather_wind_speed, raceData.weather_wind_units, raceData.weather_sky, raceData.time_of_day
      );
    }
    imported++;
  }

  return { imported, skipped, total: sessions.length };
}

module.exports = { authenticate, fetchFromIRacing, importRaceResults, importLeagueSchedule };

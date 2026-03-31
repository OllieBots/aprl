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
  const league = db.prepare('SELECT iracing_session_cookie, iracing_cookie_expiry FROM league WHERE id = 1').get();
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

  if (!response.ok) {
    throw new Error(`iRacing auth failed: ${response.status}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie returned from iRacing');
  }

  // Store cookie + expiry (24 hours from now)
  const expiry = Math.floor(Date.now() / 1000) + 86400;
  db.prepare('UPDATE league SET iracing_session_cookie = ?, iracing_cookie_expiry = ? WHERE id = 1')
    .run(setCookie, expiry);

  return { cookie: setCookie, expiry };
}

async function fetchFromIRacing(endpoint) {
  const cookie = await getStoredCookie();
  if (!cookie) throw new Error('Not authenticated with iRacing. Please connect first.');

  // First request to get the data link
  const response = await fetch(`${IRACING_BASE}/data/${endpoint}`, {
    headers: { Cookie: cookie },
  });

  if (response.status === 401) {
    db.prepare('UPDATE league SET iracing_session_cookie = NULL WHERE id = 1').run();
    throw new Error('iRacing session expired. Please reconnect.');
  }

  if (!response.ok) throw new Error(`iRacing API error: ${response.status}`);

  const linkData = await response.json();

  // iRacing two-step fetch: first response has a "link" field
  if (linkData.link) {
    const dataResponse = await fetch(linkData.link, {
      headers: { Cookie: cookie },
    });
    if (!dataResponse.ok) throw new Error(`iRacing data fetch error: ${dataResponse.status}`);
    return dataResponse.json();
  }

  return linkData;
}

async function importRaceResults(raceId, subsessionId) {
  const data = await fetchFromIRacing(`results/get?subsession_id=${subsessionId}`);

  // Map iRacing result fields to our schema
  const race = db.prepare('SELECT * FROM races WHERE id = ?').get(raceId);
  if (!race) throw new Error('Race not found');

  const session = data.session_results?.find(s => s.simsession_name === 'RACE');
  if (!session) throw new Error('No race session found in iRacing data');

  db.prepare('DELETE FROM race_results WHERE race_id = ?').run(raceId);

  const insertResult = db.prepare(`
    INSERT INTO race_results (race_id, driver_id, finish_position, starting_position,
    laps_completed, laps_led, fastest_lap_time, incidents, points_awarded, dnf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entry of session.results || []) {
    // Find or create driver by iRacing customer ID
    let driver = db.prepare('SELECT id FROM drivers WHERE iracing_cust_id = ?').get(entry.cust_id);
    if (!driver) {
      const res = db.prepare(`
        INSERT INTO drivers (iracing_cust_id, name, irating) VALUES (?, ?, ?)
      `).run(entry.cust_id, entry.display_name, entry.newi_rating || 0);
      driver = { id: res.lastInsertRowid };
    }

    insertResult.run(
      raceId,
      driver.id,
      entry.finish_position_in_class + 1,
      entry.starting_position_in_class + 1,
      entry.laps_complete,
      entry.laps_lead,
      entry.best_lap_time / 10000, // iRacing stores in 10ths of ms
      entry.incidents,
      0, // Points calculated separately
      entry.reason_out_id !== 0 ? 1 : 0
    );
  }

  // Update race status
  db.prepare('UPDATE races SET status = ?, iracing_subsession_id = ?, results_synced_at = ? WHERE id = ?')
    .run('completed', subsessionId, Math.floor(Date.now() / 1000), raceId);
}

module.exports = { authenticate, fetchFromIRacing, importRaceResults };

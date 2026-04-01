const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse DATABASE_URL manually so special characters in passwords don't break URL parsing
function buildPoolConfig(url) {
  try {
    const u = new URL(url);
    return {
      host:     u.hostname,
      port:     parseInt(u.port) || 5432,
      database: u.pathname.replace(/^\//, ''),
      user:     decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      ssl:      { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString: url, ssl: { rejectUnauthorized: false } };
  }
}

const pool = new Pool(buildPoolConfig(process.env.DATABASE_URL));

// Convert SQLite-style ? placeholders to Postgres $1, $2, ...
function toPgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function flatten(params) {
  return params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
}

const db = {
  // Returns array of rows
  async all(sql, ...params) {
    const p = flatten(params);
    const { rows } = await pool.query(toPgParams(sql), p.length ? p : undefined);
    return rows;
  },

  // Returns first row or null
  async get(sql, ...params) {
    const p = flatten(params);
    const { rows } = await pool.query(toPgParams(sql), p.length ? p : undefined);
    return rows[0] || null;
  },

  // Runs a statement, no return value needed (UPDATE, DELETE)
  async run(sql, ...params) {
    const p = flatten(params);
    await pool.query(toPgParams(sql), p.length ? p : undefined);
  },

  // INSERT — appends RETURNING id and returns { lastInsertRowid }
  async insert(sql, ...params) {
    const p = flatten(params);
    const { rows } = await pool.query(toPgParams(sql) + ' RETURNING id', p.length ? p : undefined);
    return { lastInsertRowid: rows[0]?.id };
  },

  pool,
};

// ---------------------------------------------------------------------------
// Initialize schema + seed data on first boot
// ---------------------------------------------------------------------------
async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  // Migrate existing tables — safe to run repeatedly
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE`);
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id)`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`);

  // Migrate league_memberships with per-league driver profile fields
  await pool.query(`ALTER TABLE league_memberships ADD COLUMN IF NOT EXISTS invited_iracing_cust_id INTEGER`);
  await pool.query(`ALTER TABLE league_memberships ADD COLUMN IF NOT EXISTS display_name TEXT`);
  await pool.query(`ALTER TABLE league_memberships ADD COLUMN IF NOT EXISTS car_number TEXT`);
  await pool.query(`ALTER TABLE league_memberships ADD COLUMN IF NOT EXISTS car_model TEXT`);
  await pool.query(`ALTER TABLE league_memberships ADD COLUMN IF NOT EXISTS team_name TEXT`);
  // Unique car number per league (partial index ignores NULLs automatically)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_league_car_number ON league_memberships(league_id, car_number) WHERE car_number IS NOT NULL`);

  // League appearance
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS primary_color TEXT`);
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS secondary_color TEXT`);
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS banner_url TEXT`);
  await pool.query(`ALTER TABLE league ADD COLUMN IF NOT EXISTS logo_url TEXT`);

  // IRT reviewer access + voting/discussion tables
  await pool.query(`ALTER TABLE league_memberships ADD COLUMN IF NOT EXISTS irt_reviewer BOOLEAN DEFAULT false`);
  await pool.query(`CREATE TABLE IF NOT EXISTS incident_votes (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incident_reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    vote TEXT NOT NULL,
    created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT,
    UNIQUE(incident_id, user_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS incident_comments (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incident_reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    body TEXT NOT NULL,
    created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT
  )`);

  // Migrate races table with iRacing session details
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS iracing_league_session_id INTEGER`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS weather_temp REAL`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS weather_temp_units INTEGER`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS weather_humidity INTEGER`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS weather_wind_speed REAL`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS weather_wind_units INTEGER`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS weather_sky INTEGER`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS time_of_day INTEGER`);
  await pool.query(`ALTER TABLE races ADD COLUMN IF NOT EXISTS session_name TEXT`);

  // Give league.id an auto-increment sequence (it was originally a single hardcoded row)
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS league_id_seq`);
  await pool.query(`SELECT setval('league_id_seq', COALESCE((SELECT MAX(id) FROM league), 1))`);
  await pool.query(`ALTER TABLE league ALTER COLUMN id SET DEFAULT nextval('league_id_seq')`);

  // Seed default league row
  const league = await db.get('SELECT id FROM league WHERE id = 1');
  if (!league) {
    await db.run("INSERT INTO league (id, name, slug) VALUES (1, 'Apex Pro Racing League', 'aprl')");
  }

  // Ensure slug is set on existing league row
  await db.run("UPDATE league SET slug = 'aprl' WHERE id = 1 AND slug IS NULL");

  // Seed default season
  const season = await db.get('SELECT id FROM seasons LIMIT 1');
  if (!season) {
    const defaultScoring = JSON.stringify({
      p1: 50, p2: 40, p3: 35, p4: 30, p5: 27, p6: 24, p7: 22, p8: 20,
      p9: 18, p10: 16, p11: 14, p12: 12, p13: 10, p14: 9, p15: 8,
      p16: 7, p17: 6, p18: 5, p19: 4, p20: 3, pole: 3, fl: 1,
    });
    await db.run(
      'INSERT INTO seasons (league_id, name, series, car_class, is_active, scoring_config) VALUES (1, ?, ?, ?, 1, ?)',
      'Season 1 - 2025', 'GT3 Championship', 'GT3', defaultScoring
    );
  }

  // Seed mock drivers
  const driverCount = await db.get('SELECT COUNT(*)::int as cnt FROM drivers');
  if (driverCount.cnt === 0) {
    const drivers = [
      ['Alex Mercer',   '44', 'BMW M4 GT3',              4823, 'A', 3.72, 'active'],
      ['Jordan Walsh',  '7',  'Porsche 911 GT3 R',       4456, 'A', 4.10, 'active'],
      ['Sam Torres',    '19', 'Ferrari 296 GT3',         3991, 'A', 3.45, 'active'],
      ['Riley Chen',    '31', 'Audi R8 LMS GT3',         3654, 'B', 4.89, 'active'],
      ['Casey Morgan',  '55', 'Mercedes-AMG GT3',        3421, 'B', 3.22, 'active'],
      ['Drew Harlow',   '8',  'Lamborghini Huracan GT3', 3187, 'B', 2.98, 'active'],
      ['Taylor Brooks', '23', 'BMW M4 GT3',              2934, 'C', 4.21, 'active'],
      ['Morgan Price',  '12', 'Porsche 911 GT3 R',       2711, 'C', 3.67, 'inactive'],
    ];
    for (const [name, car_number, car_model, irating, src, srv, status] of drivers) {
      await db.run(
        'INSERT INTO drivers (name, car_number, car_model, irating, safety_rating_class, safety_rating_value, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        name, car_number, car_model, irating, src, srv, status
      );
    }
  }

  // Seed mock races
  const raceCount = await db.get('SELECT COUNT(*)::int as cnt FROM races');
  if (raceCount.cnt === 0) {
    const season1 = await db.get('SELECT id FROM seasons LIMIT 1');
    const now = Math.floor(Date.now() / 1000);
    const races = [
      [season1.id, 1, 'Nürburgring',                   'Grand Prix',  now - 86400 * 30, 30, 'completed'],
      [season1.id, 2, 'Spa-Francorchamps',              'Full Circuit', now - 86400 * 16, 25, 'completed'],
      [season1.id, 3, 'Monza',                          'Full Circuit', now - 86400 * 2,  35, 'completed'],
      [season1.id, 4, 'Silverstone',                    'Grand Prix',  now + 86400 * 5,  28, 'upcoming'],
      [season1.id, 5, 'Circuit de Barcelona-Catalunya', 'Grand Prix',  now + 86400 * 19, 32, 'upcoming'],
      [season1.id, 6, 'Suzuka Circuit',                 'Grand Prix',  now + 86400 * 33, 30, 'upcoming'],
    ];
    for (const [sid, rn, track, cfg, sat, laps, status] of races) {
      await db.run(
        'INSERT INTO races (season_id, round_number, track_name, track_config, scheduled_at, laps, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        sid, rn, track, cfg, sat, laps, status
      );
    }
  }

  // Seed mock race results
  const resultCount = await db.get('SELECT COUNT(*)::int as cnt FROM race_results');
  if (resultCount.cnt === 0) {
    const completedRaces = await db.all("SELECT id FROM races WHERE status = 'completed'");
    const allDrivers = await db.all('SELECT id FROM drivers');
    const pointsMap = [50, 40, 35, 30, 27, 24, 22, 20];

    for (const race of completedRaces) {
      const shuffled = [...allDrivers].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await db.run(
          `INSERT INTO race_results
            (race_id, driver_id, finish_position, starting_position, laps_completed,
             laps_led, fastest_lap_time, incidents, points_awarded, dnf)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          race.id, shuffled[i].id, i + 1,
          Math.floor(Math.random() * 8) + 1,
          30 - Math.floor(Math.random() * 3),
          i === 0 ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 5),
          90 + Math.random() * 10,
          Math.floor(Math.random() * 6),
          pointsMap[i] || 0
        );
      }
    }
  }

  // Seed activity log
  const logCount = await db.get('SELECT COUNT(*)::int as cnt FROM activity_log');
  if (logCount.cnt === 0) {
    const logs = [
      ['result',   'Race results imported for Round 3 — Monza'],
      ['driver',   'Driver Morgan Price status changed to Inactive'],
      ['discord',  'Standings posted to #standings channel'],
      ['result',   'Race results imported for Round 2 — Spa-Francorchamps'],
      ['settings', 'Scoring system updated by admin'],
      ['driver',   'Drew Harlow joined the league roster'],
      ['result',   'Race results imported for Round 1 — Nürburgring'],
      ['discord',  'Bot connected to APRL Discord server'],
    ];
    for (const [type, message] of logs) {
      await db.run('INSERT INTO activity_log (type, message) VALUES (?, ?)', type, message);
    }
  }

  console.log('[DB] Supabase connected and schema ready');
}

module.exports = db;
module.exports.initDb = initDb;

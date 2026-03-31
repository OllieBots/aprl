-- League config
CREATE TABLE IF NOT EXISTS league (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Apex Pro Racing League',
  iracing_league_id INTEGER,
  discord_guild_id TEXT,
  discord_bot_token TEXT,
  iracing_session_cookie TEXT,
  iracing_cookie_expiry INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Seasons
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER REFERENCES league(id),
  name TEXT NOT NULL,
  series TEXT,
  car_class TEXT,
  iracing_season_id INTEGER,
  is_active INTEGER DEFAULT 1,
  scoring_config TEXT  -- JSON blob: {p1: 50, p2: 40, ..., pole: 3, fl: 1}
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  iracing_cust_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  discord_user_id TEXT,
  irating INTEGER,
  safety_rating_class TEXT,
  safety_rating_value REAL,
  car_number TEXT,
  car_model TEXT,
  status TEXT DEFAULT 'active',  -- active | inactive | suspended
  joined_at INTEGER DEFAULT (unixepoch())
);

-- Races
CREATE TABLE IF NOT EXISTS races (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER REFERENCES seasons(id),
  round_number INTEGER NOT NULL,
  track_name TEXT NOT NULL,
  track_config TEXT,
  scheduled_at INTEGER,
  laps INTEGER,
  iracing_subsession_id INTEGER,
  status TEXT DEFAULT 'upcoming',  -- upcoming | completed | cancelled
  results_synced_at INTEGER
);

-- Race results
CREATE TABLE IF NOT EXISTS race_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id INTEGER REFERENCES races(id),
  driver_id INTEGER REFERENCES drivers(id),
  finish_position INTEGER,
  starting_position INTEGER,
  laps_completed INTEGER,
  laps_led INTEGER,
  fastest_lap_time REAL,
  incidents INTEGER,
  points_awarded INTEGER,
  points_adjustment INTEGER DEFAULT 0,
  points_adjustment_reason TEXT,
  dnf INTEGER DEFAULT 0
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,  -- result | driver | discord | settings
  message TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

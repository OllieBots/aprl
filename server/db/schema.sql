-- League config
CREATE TABLE IF NOT EXISTS league (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Apex Pro Racing League',
  slug TEXT UNIQUE,
  description TEXT,
  owner_user_id INTEGER,
  iracing_league_id INTEGER,
  discord_guild_id TEXT,
  discord_bot_token TEXT,
  iracing_session_cookie TEXT,
  iracing_cookie_expiry BIGINT,
  created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT
);

-- Users (driver accounts)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  iracing_cust_id INTEGER UNIQUE,
  iracing_verified BOOLEAN DEFAULT false,
  created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT
);

-- Seasons
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES league(id),
  name TEXT NOT NULL,
  series TEXT,
  car_class TEXT,
  iracing_season_id INTEGER,
  is_active INTEGER DEFAULT 1,
  scoring_config TEXT
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  iracing_cust_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  discord_user_id TEXT,
  irating INTEGER,
  safety_rating_class TEXT,
  safety_rating_value DOUBLE PRECISION,
  car_number TEXT,
  car_model TEXT,
  status TEXT DEFAULT 'active',
  joined_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT
);

-- League memberships
CREATE TABLE IF NOT EXISTS league_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  league_id INTEGER REFERENCES league(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  role TEXT DEFAULT 'driver',
  created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT,
  UNIQUE(user_id, league_id)
);

-- Races
CREATE TABLE IF NOT EXISTS races (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  round_number INTEGER NOT NULL,
  track_name TEXT NOT NULL,
  track_config TEXT,
  scheduled_at BIGINT,
  laps INTEGER,
  iracing_subsession_id INTEGER,
  status TEXT DEFAULT 'upcoming',
  results_synced_at BIGINT
);

-- Race results
CREATE TABLE IF NOT EXISTS race_results (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES races(id),
  driver_id INTEGER REFERENCES drivers(id),
  finish_position INTEGER,
  starting_position INTEGER,
  laps_completed INTEGER,
  laps_led INTEGER,
  fastest_lap_time DOUBLE PRECISION,
  incidents INTEGER,
  points_awarded INTEGER,
  points_adjustment INTEGER DEFAULT 0,
  points_adjustment_reason TEXT,
  dnf INTEGER DEFAULT 0
);

-- Incident reports
CREATE TABLE IF NOT EXISTS incident_reports (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES league(id) ON DELETE CASCADE,
  reporter_user_id INTEGER REFERENCES users(id),
  race_id INTEGER REFERENCES races(id),
  involved_drivers TEXT,
  session_type TEXT,
  lap_number INTEGER,
  explanation TEXT NOT NULL,
  clip_url TEXT,
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  type TEXT,
  message TEXT,
  created_at BIGINT DEFAULT floor(extract(epoch from now()))::BIGINT
);

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'aprl.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Seed default league row if empty
const league = db.prepare('SELECT id FROM league WHERE id = 1').get();
if (!league) {
  db.prepare(`
    INSERT INTO league (id, name) VALUES (1, 'Apex Pro Racing League')
  `).run();
}

// Seed default season if empty
const season = db.prepare('SELECT id FROM seasons LIMIT 1').get();
if (!season) {
  const defaultScoring = JSON.stringify({
    p1: 50, p2: 40, p3: 35, p4: 30, p5: 27, p6: 24, p7: 22, p8: 20,
    p9: 18, p10: 16, p11: 14, p12: 12, p13: 10, p14: 9, p15: 8,
    p16: 7, p17: 6, p18: 5, p19: 4, p20: 3, pole: 3, fl: 1
  });
  db.prepare(`
    INSERT INTO seasons (league_id, name, series, car_class, is_active, scoring_config)
    VALUES (1, 'Season 1 - 2025', 'GT3 Championship', 'GT3', 1, ?)
  `).run(defaultScoring);
}

// Seed mock drivers if empty
const driverCount = db.prepare('SELECT COUNT(*) as cnt FROM drivers').get();
if (driverCount.cnt === 0) {
  const drivers = [
    { name: 'Alex Mercer', car_number: '44', car_model: 'BMW M4 GT3', irating: 4823, safety_rating_class: 'A', safety_rating_value: 3.72, status: 'active' },
    { name: 'Jordan Walsh', car_number: '7', car_model: 'Porsche 911 GT3 R', irating: 4456, safety_rating_class: 'A', safety_rating_value: 4.10, status: 'active' },
    { name: 'Sam Torres', car_number: '19', car_model: 'Ferrari 296 GT3', irating: 3991, safety_rating_class: 'A', safety_rating_value: 3.45, status: 'active' },
    { name: 'Riley Chen', car_number: '31', car_model: 'Audi R8 LMS GT3', irating: 3654, safety_rating_class: 'B', safety_rating_value: 4.89, status: 'active' },
    { name: 'Casey Morgan', car_number: '55', car_model: 'Mercedes-AMG GT3', irating: 3421, safety_rating_class: 'B', safety_rating_value: 3.22, status: 'active' },
    { name: 'Drew Harlow', car_number: '8', car_model: 'Lamborghini Huracan GT3', irating: 3187, safety_rating_class: 'B', safety_rating_value: 2.98, status: 'active' },
    { name: 'Taylor Brooks', car_number: '23', car_model: 'BMW M4 GT3', irating: 2934, safety_rating_class: 'C', safety_rating_value: 4.21, status: 'active' },
    { name: 'Morgan Price', car_number: '12', car_model: 'Porsche 911 GT3 R', irating: 2711, safety_rating_class: 'C', safety_rating_value: 3.67, status: 'inactive' },
  ];
  const insert = db.prepare(`
    INSERT INTO drivers (name, car_number, car_model, irating, safety_rating_class, safety_rating_value, status)
    VALUES (@name, @car_number, @car_model, @irating, @safety_rating_class, @safety_rating_value, @status)
  `);
  drivers.forEach(d => insert.run(d));
}

// Seed mock races if empty
const raceCount = db.prepare('SELECT COUNT(*) as cnt FROM races').get();
if (raceCount.cnt === 0) {
  const season1 = db.prepare('SELECT id FROM seasons LIMIT 1').get();
  const now = Math.floor(Date.now() / 1000);
  const races = [
    { season_id: season1.id, round_number: 1, track_name: 'Nürburgring', track_config: 'Grand Prix', scheduled_at: now - 86400 * 30, laps: 30, status: 'completed' },
    { season_id: season1.id, round_number: 2, track_name: 'Spa-Francorchamps', track_config: 'Full Circuit', scheduled_at: now - 86400 * 16, laps: 25, status: 'completed' },
    { season_id: season1.id, round_number: 3, track_name: 'Monza', track_config: 'Full Circuit', scheduled_at: now - 86400 * 2, laps: 35, status: 'completed' },
    { season_id: season1.id, round_number: 4, track_name: 'Silverstone', track_config: 'Grand Prix', scheduled_at: now + 86400 * 5, laps: 28, status: 'upcoming' },
    { season_id: season1.id, round_number: 5, track_name: 'Circuit de Barcelona-Catalunya', track_config: 'Grand Prix', scheduled_at: now + 86400 * 19, laps: 32, status: 'upcoming' },
    { season_id: season1.id, round_number: 6, track_name: 'Suzuka Circuit', track_config: 'Grand Prix', scheduled_at: now + 86400 * 33, laps: 30, status: 'upcoming' },
  ];
  const insert = db.prepare(`
    INSERT INTO races (season_id, round_number, track_name, track_config, scheduled_at, laps, status)
    VALUES (@season_id, @round_number, @track_name, @track_config, @scheduled_at, @laps, @status)
  `);
  races.forEach(r => insert.run(r));
}

// Seed mock race results if empty
const resultCount = db.prepare('SELECT COUNT(*) as cnt FROM race_results').get();
if (resultCount.cnt === 0) {
  const completedRaces = db.prepare("SELECT id FROM races WHERE status = 'completed'").all();
  const drivers = db.prepare('SELECT id FROM drivers').all();

  const insertResult = db.prepare(`
    INSERT INTO race_results (race_id, driver_id, finish_position, starting_position, laps_completed, laps_led, fastest_lap_time, incidents, points_awarded, dnf)
    VALUES (@race_id, @driver_id, @finish_position, @starting_position, @laps_completed, @laps_led, @fastest_lap_time, @incidents, @points_awarded, @dnf)
  `);

  const pointsMap = [50, 40, 35, 30, 27, 24, 22, 20];
  completedRaces.forEach(race => {
    const shuffled = [...drivers].sort(() => Math.random() - 0.5);
    shuffled.forEach((driver, i) => {
      insertResult.run({
        race_id: race.id,
        driver_id: driver.id,
        finish_position: i + 1,
        starting_position: Math.floor(Math.random() * 8) + 1,
        laps_completed: 30 - Math.floor(Math.random() * 3),
        laps_led: i === 0 ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 5),
        fastest_lap_time: 90 + Math.random() * 10,
        incidents: Math.floor(Math.random() * 6),
        points_awarded: pointsMap[i] || 0,
        dnf: 0,
      });
    });
  });
}

// Seed activity log if empty
const logCount = db.prepare('SELECT COUNT(*) as cnt FROM activity_log').get();
if (logCount.cnt === 0) {
  const logs = [
    { type: 'result', message: 'Race results imported for Round 3 — Monza' },
    { type: 'driver', message: 'Driver Morgan Price status changed to Inactive' },
    { type: 'discord', message: 'Standings posted to #standings channel' },
    { type: 'result', message: 'Race results imported for Round 2 — Spa-Francorchamps' },
    { type: 'settings', message: 'Scoring system updated by admin' },
    { type: 'driver', message: 'Drew Harlow joined the league roster' },
    { type: 'result', message: 'Race results imported for Round 1 — Nürburgring' },
    { type: 'discord', message: 'Bot connected to APRL Discord server' },
  ];
  const insert = db.prepare('INSERT INTO activity_log (type, message) VALUES (@type, @message)');
  logs.forEach(l => insert.run(l));
}

module.exports = db;

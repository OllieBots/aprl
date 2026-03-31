const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/races
router.get('/', (req, res) => {
  const { season_id, status } = req.query;
  let query = 'SELECT * FROM races WHERE 1=1';
  const params = [];
  if (season_id) { query += ' AND season_id = ?'; params.push(season_id); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY round_number ASC';
  const races = db.prepare(query).all(...params);
  res.json(races);
});

// POST /api/races
router.post('/', (req, res) => {
  const { season_id, round_number, track_name, track_config, scheduled_at, laps } = req.body;
  const result = db.prepare(`
    INSERT INTO races (season_id, round_number, track_name, track_config, scheduled_at, laps, status)
    VALUES (?, ?, ?, ?, ?, ?, 'upcoming')
  `).run(season_id, round_number, track_name, track_config, scheduled_at, laps);
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('settings', ?)").run(
    `Race scheduled: Round ${round_number} — ${track_name}`
  );
  res.json({ id: result.lastInsertRowid });
});

// PUT /api/races/:id
router.put('/:id', (req, res) => {
  const { round_number, track_name, track_config, scheduled_at, laps, status, iracing_subsession_id } = req.body;
  db.prepare(`
    UPDATE races SET round_number = ?, track_name = ?, track_config = ?, scheduled_at = ?,
    laps = ?, status = ?, iracing_subsession_id = ? WHERE id = ?
  `).run(round_number, track_name, track_config, scheduled_at, laps, status, iracing_subsession_id, req.params.id);
  res.json({ success: true });
});

// DELETE /api/races/:id
router.delete('/:id', (req, res) => {
  const race = db.prepare('SELECT * FROM races WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM race_results WHERE race_id = ?').run(req.params.id);
  db.prepare('DELETE FROM races WHERE id = ?').run(req.params.id);
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('settings', ?)").run(
    `Race deleted: Round ${race?.round_number} — ${race?.track_name}`
  );
  res.json({ success: true });
});

// GET /api/races/:id/results
router.get('/:id/results', (req, res) => {
  const race = db.prepare('SELECT * FROM races WHERE id = ?').get(req.params.id);
  if (!race) return res.status(404).json({ error: 'Race not found' });

  const results = db.prepare(`
    SELECT rr.*, d.name as driver_name, d.car_number, d.car_model
    FROM race_results rr
    JOIN drivers d ON rr.driver_id = d.id
    WHERE rr.race_id = ?
    ORDER BY rr.finish_position ASC
  `).all(req.params.id);

  res.json({ race, results });
});

// POST /api/races/:id/results/import
router.post('/:id/results/import', async (req, res) => {
  const { subsession_id } = req.body;
  // iRacing import stub — full implementation in iracing service
  try {
    const iracingService = require('../services/iracing');
    await iracingService.importRaceResults(req.params.id, subsession_id);
    db.prepare("INSERT INTO activity_log (type, message) VALUES ('result', ?)").run(
      `Results imported from iRacing subsession #${subsession_id}`
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/races/:id/results/:driverId
router.put('/:id/results/:driverId', (req, res) => {
  const { finish_position, laps_led, fastest_lap_time, incidents, points_awarded, points_adjustment, points_adjustment_reason } = req.body;
  db.prepare(`
    UPDATE race_results SET finish_position = ?, laps_led = ?, fastest_lap_time = ?,
    incidents = ?, points_awarded = ?, points_adjustment = ?, points_adjustment_reason = ?
    WHERE race_id = ? AND driver_id = ?
  `).run(finish_position, laps_led, fastest_lap_time, incidents, points_awarded, points_adjustment, points_adjustment_reason, req.params.id, req.params.driverId);
  res.json({ success: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/races
router.get('/', async (req, res) => {
  try {
    const { season_id, status } = req.query;
    let query = 'SELECT * FROM races WHERE 1=1';
    const params = [];
    if (season_id) { query += ' AND season_id = ?'; params.push(season_id); }
    if (status)    { query += ' AND status = ?';    params.push(status); }
    query += ' ORDER BY round_number ASC';
    const races = await db.all(query, ...params);
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/races
router.post('/', async (req, res) => {
  try {
    const { season_id, round_number, track_name, track_config, scheduled_at, laps } = req.body;
    const result = await db.insert(
      "INSERT INTO races (season_id, round_number, track_name, track_config, scheduled_at, laps, status) VALUES (?, ?, ?, ?, ?, ?, 'upcoming')",
      season_id, round_number, track_name, track_config, scheduled_at, laps
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', ?)",
      `Race scheduled: Round ${round_number} — ${track_name}`);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/races/:id
router.put('/:id', async (req, res) => {
  try {
    const { round_number, track_name, track_config, scheduled_at, laps, status, iracing_subsession_id } = req.body;
    await db.run(
      'UPDATE races SET round_number = ?, track_name = ?, track_config = ?, scheduled_at = ?, laps = ?, status = ?, iracing_subsession_id = ? WHERE id = ?',
      round_number, track_name, track_config, scheduled_at, laps, status, iracing_subsession_id, req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/races/:id
router.delete('/:id', async (req, res) => {
  try {
    const race = await db.get('SELECT * FROM races WHERE id = ?', req.params.id);
    await db.run('DELETE FROM race_results WHERE race_id = ?', req.params.id);
    await db.run('DELETE FROM races WHERE id = ?', req.params.id);
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', ?)",
      `Race deleted: Round ${race?.round_number} — ${race?.track_name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/races/:id/results
router.get('/:id/results', async (req, res) => {
  try {
    const race = await db.get('SELECT * FROM races WHERE id = ?', req.params.id);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    const results = await db.all(`
      SELECT rr.*, d.name as driver_name, d.car_number, d.car_model
      FROM race_results rr
      JOIN drivers d ON rr.driver_id = d.id
      WHERE rr.race_id = ?
      ORDER BY rr.finish_position ASC
    `, req.params.id);

    res.json({ race, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/races/:id/results/import
router.post('/:id/results/import', async (req, res) => {
  const { subsession_id } = req.body;
  try {
    const iracingService = require('../services/iracing');
    await iracingService.importRaceResults(req.params.id, subsession_id);
    await db.run("INSERT INTO activity_log (type, message) VALUES ('result', ?)",
      `Results imported from iRacing subsession #${subsession_id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/races/:id/results/:driverId
router.put('/:id/results/:driverId', async (req, res) => {
  try {
    const { finish_position, laps_led, fastest_lap_time, incidents, points_awarded, points_adjustment, points_adjustment_reason } = req.body;
    await db.run(
      `UPDATE race_results SET finish_position = ?, laps_led = ?, fastest_lap_time = ?,
       incidents = ?, points_awarded = ?, points_adjustment = ?, points_adjustment_reason = ?
       WHERE race_id = ? AND driver_id = ?`,
      finish_position, laps_led, fastest_lap_time, incidents, points_awarded,
      points_adjustment, points_adjustment_reason, req.params.id, req.params.driverId
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/league
router.get('/', (req, res) => {
  const league = db.prepare('SELECT * FROM league WHERE id = 1').get();
  res.json(league);
});

// PUT /api/league
router.put('/', (req, res) => {
  const { name, iracing_league_id, discord_guild_id } = req.body;
  db.prepare(`
    UPDATE league SET name = ?, iracing_league_id = ?, discord_guild_id = ? WHERE id = 1
  `).run(name, iracing_league_id, discord_guild_id);
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('settings', 'League settings updated')").run();
  res.json({ success: true });
});

// GET /api/seasons
router.get('/seasons', (req, res) => {
  const seasons = db.prepare('SELECT * FROM seasons ORDER BY id DESC').all();
  res.json(seasons);
});

// POST /api/seasons
router.post('/seasons', (req, res) => {
  const { name, series, car_class, iracing_season_id, scoring_config } = req.body;
  // Deactivate current seasons
  db.prepare('UPDATE seasons SET is_active = 0').run();
  const result = db.prepare(`
    INSERT INTO seasons (league_id, name, series, car_class, iracing_season_id, is_active, scoring_config)
    VALUES (1, ?, ?, ?, ?, 1, ?)
  `).run(name, series, car_class, iracing_season_id, JSON.stringify(scoring_config));
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('settings', ?)").run(`New season created: ${name}`);
  res.json({ id: result.lastInsertRowid });
});

// PUT /api/seasons/:id
router.put('/seasons/:id', (req, res) => {
  const { name, series, car_class, scoring_config, is_active } = req.body;
  db.prepare(`
    UPDATE seasons SET name = ?, series = ?, car_class = ?, scoring_config = ?, is_active = ? WHERE id = ?
  `).run(name, series, car_class, JSON.stringify(scoring_config), is_active, req.params.id);
  res.json({ success: true });
});

module.exports = router;

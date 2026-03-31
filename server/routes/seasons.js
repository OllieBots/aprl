const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/seasons
router.get('/', (req, res) => {
  const seasons = db.prepare('SELECT * FROM seasons ORDER BY id DESC').all();
  res.json(seasons);
});

// POST /api/seasons
router.post('/', (req, res) => {
  const { name, series, car_class, iracing_season_id, scoring_config } = req.body;
  db.prepare('UPDATE seasons SET is_active = 0').run();
  const result = db.prepare(`
    INSERT INTO seasons (league_id, name, series, car_class, iracing_season_id, is_active, scoring_config)
    VALUES (1, ?, ?, ?, ?, 1, ?)
  `).run(name, series, car_class, iracing_season_id, JSON.stringify(scoring_config));
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('settings', ?)").run(`New season created: ${name}`);
  res.json({ id: result.lastInsertRowid });
});

// PUT /api/seasons/:id
router.put('/:id', (req, res) => {
  const { name, series, car_class, scoring_config, is_active } = req.body;
  db.prepare(`
    UPDATE seasons SET name = ?, series = ?, car_class = ?, scoring_config = ?, is_active = ? WHERE id = ?
  `).run(name, series, car_class, JSON.stringify(scoring_config), is_active, req.params.id);
  res.json({ success: true });
});

module.exports = router;

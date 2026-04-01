const express = require('express');
const router = express.Router();
const db = require('../db/db');
const adminLeague = require('../middleware/adminLeague');

router.use(adminLeague);

// GET /api/seasons
router.get('/', async (req, res) => {
  try {
    const seasons = await db.all('SELECT * FROM seasons WHERE league_id = ? ORDER BY id DESC', req.leagueId);
    res.json(seasons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seasons
router.post('/', async (req, res) => {
  try {
    const { name, series, car_class, iracing_season_id, scoring_config } = req.body;
    await db.run('UPDATE seasons SET is_active = 0 WHERE league_id = ?', req.leagueId);
    const result = await db.insert(
      'INSERT INTO seasons (league_id, name, series, car_class, iracing_season_id, is_active, scoring_config) VALUES (?, ?, ?, ?, ?, 1, ?)',
      req.leagueId, name, series, car_class, iracing_season_id, JSON.stringify(scoring_config)
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', ?)", `New season created: ${name}`);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/seasons/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, series, car_class, scoring_config, is_active } = req.body;
    await db.run(
      'UPDATE seasons SET name = ?, series = ?, car_class = ?, scoring_config = ?, is_active = ? WHERE id = ? AND league_id = ?',
      name, series, car_class, JSON.stringify(scoring_config), is_active, req.params.id, req.leagueId
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

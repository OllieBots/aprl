const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/league
router.get('/', async (req, res) => {
  try {
    const league = await db.get('SELECT * FROM league WHERE id = 1');
    res.json(league);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/league
router.put('/', async (req, res) => {
  try {
    const { name, iracing_league_id, discord_guild_id } = req.body;
    await db.run(
      'UPDATE league SET name = ?, iracing_league_id = ?, discord_guild_id = ? WHERE id = 1',
      name, iracing_league_id, discord_guild_id
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', 'League settings updated')");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

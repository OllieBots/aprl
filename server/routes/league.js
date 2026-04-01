const express = require('express');
const router = express.Router();
const db = require('../db/db');
const adminLeague = require('../middleware/adminLeague');

router.use(adminLeague);

// GET /api/league
router.get('/', async (req, res) => {
  try {
    const league = await db.get('SELECT * FROM league WHERE id = ?', req.leagueId);
    res.json(league);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/league
router.put('/', async (req, res) => {
  try {
    const { name, iracing_league_id, discord_guild_id, primary_color, secondary_color, banner_url } = req.body;
    await db.run(
      'UPDATE league SET name = ?, iracing_league_id = ?, discord_guild_id = ?, primary_color = ?, secondary_color = ?, banner_url = ? WHERE id = ?',
      name, iracing_league_id, discord_guild_id, primary_color || null, secondary_color || null, banner_url || null, req.leagueId
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', 'League settings updated')");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

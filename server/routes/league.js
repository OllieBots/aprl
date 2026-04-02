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
    const {
      name, iracing_league_id, discord_guild_id,
      primary_color, secondary_color, banner_url, logo_url,
      is_recruiting, race_day, race_time, irating_min, irating_max,
      open_spots, total_spots, skill_level, recruitment_blurb,
    } = req.body;
    await db.run(
      `UPDATE league SET
        name = ?, iracing_league_id = ?, discord_guild_id = ?,
        primary_color = ?, secondary_color = ?, banner_url = ?, logo_url = ?,
        is_recruiting = ?, race_day = ?, race_time = ?,
        irating_min = ?, irating_max = ?, open_spots = ?, total_spots = ?,
        skill_level = ?, recruitment_blurb = ?
       WHERE id = ?`,
      name,
      iracing_league_id ? parseInt(iracing_league_id) : null,
      discord_guild_id || null,
      primary_color || null,
      secondary_color || null,
      banner_url || null,
      logo_url || null,
      is_recruiting ? true : false,
      race_day || null,
      race_time || null,
      irating_min ? parseInt(irating_min) : null,
      irating_max ? parseInt(irating_max) : null,
      open_spots ? parseInt(open_spots) : null,
      total_spots ? parseInt(total_spots) : null,
      skill_level || null,
      recruitment_blurb || null,
      req.leagueId
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', 'League settings updated')");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

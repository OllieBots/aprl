const express = require('express');
const router = express.Router();
const db = require('../db/db');
const iracingService = require('../services/iracing');
const adminLeague = require('../middleware/adminLeague');

router.use(adminLeague);

// POST /api/iracing/connect
router.post('/connect', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    await iracingService.authenticate(email, password);
    res.json({ success: true, message: 'Connected to iRacing successfully' });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// GET /api/iracing/status
router.get('/status', async (req, res) => {
  try {
    const league = await db.get('SELECT iracing_session_cookie, iracing_cookie_expiry FROM league WHERE id = ?', req.leagueId);
    const now = Math.floor(Date.now() / 1000);
    const connected = !!(league?.iracing_session_cookie && league?.iracing_cookie_expiry > now);
    const lastSync = await db.get("SELECT created_at FROM activity_log WHERE type = 'result' ORDER BY created_at DESC LIMIT 1");
    res.json({
      connected,
      last_sync: lastSync?.created_at || null,
      cookie_expiry: league?.iracing_cookie_expiry || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/iracing/sync/:raceId
router.post('/sync/:raceId', async (req, res) => {
  try {
    const race = await db.get('SELECT * FROM races WHERE id = ?', req.params.raceId);
    if (!race) return res.status(404).json({ error: 'Race not found' });
    if (!race.iracing_subsession_id) return res.status(400).json({ error: 'No subsession ID set for this race' });

    await iracingService.importRaceResults(req.params.raceId, race.iracing_subsession_id);
    await db.run("INSERT INTO activity_log (type, message) VALUES ('result', ?)",
      `Race results synced for Round ${race.round_number} — ${race.track_name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/iracing/config
router.get('/config', async (req, res) => {
  try {
    const league = await db.get('SELECT iracing_cookie_expiry FROM league WHERE id = ?', req.leagueId);
    res.json({
      auto_sync: true,
      sync_delay_minutes: 15,
      discord_post_on_sync: true,
      irating_update_frequency: 'weekly',
      cookie_expiry: league?.iracing_cookie_expiry,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/iracing/config
router.put('/config', async (req, res) => {
  res.json({ success: true });
});

module.exports = router;

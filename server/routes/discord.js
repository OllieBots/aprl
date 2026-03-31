const express = require('express');
const router = express.Router();
const db = require('../db/db');

// POST /api/discord/config
router.post('/config', (req, res) => {
  const { bot_token, guild_id, command_prefix } = req.body;
  db.prepare('UPDATE league SET discord_bot_token = ?, discord_guild_id = ? WHERE id = 1')
    .run(bot_token, guild_id);
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('discord', 'Discord bot configuration updated')").run();
  res.json({ success: true });
});

// GET /api/discord/status
router.get('/status', (req, res) => {
  const league = db.prepare('SELECT discord_bot_token, discord_guild_id FROM league WHERE id = 1').get();
  // Stub: in production check actual bot connection
  res.json({
    online: !!(league?.discord_bot_token),
    guild_id: league?.discord_guild_id || null,
    bot_token_set: !!(league?.discord_bot_token),
  });
});

// POST /api/discord/test
router.post('/test', async (req, res) => {
  try {
    const discordService = require('../services/discord');
    await discordService.sendTestMessage();
    db.prepare("INSERT INTO activity_log (type, message) VALUES ('discord', 'Test message sent to Discord')").run();
    res.json({ success: true, message: 'Test message sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/logs
router.get('/logs', (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM activity_log WHERE type = 'discord' ORDER BY created_at DESC LIMIT 50
  `).all();
  res.json(logs);
});

// GET /api/discord/channels
router.get('/channels', (req, res) => {
  // Return channel mapping config
  res.json({
    announcements: 'announcements',
    results: 'race-results',
    standings: 'standings',
    general: 'general',
    admin_logs: 'admin-logs',
  });
});

// POST /api/discord/channels
router.post('/channels', (req, res) => {
  // Store channel mapping — future: persist to DB
  res.json({ success: true });
});

module.exports = router;

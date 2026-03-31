const express = require('express');
const router = express.Router();
const db = require('../db/db');

// POST /api/discord/config
router.post('/config', async (req, res) => {
  try {
    const { guild_id } = req.body;
    await db.run('UPDATE league SET discord_guild_id = ? WHERE id = 1', guild_id);
    await db.run("INSERT INTO activity_log (type, message) VALUES ('discord', 'Discord server ID updated')");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/invite-url
router.get('/invite-url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return res.json({ url: null });
  const perms = 18432; // Send Messages (2048) + Embed Links (16384)
  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands`;
  res.json({ url });
});

// GET /api/discord/status
router.get('/status', async (req, res) => {
  try {
    const league = await db.get('SELECT discord_guild_id FROM league WHERE id = 1');
    res.json({
      online: !!(process.env.DISCORD_BOT_TOKEN),
      guild_id: league?.discord_guild_id || null,
      bot_token_set: !!(process.env.DISCORD_BOT_TOKEN),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/test
router.post('/test', async (req, res) => {
  try {
    const discordService = require('../services/discord');
    await discordService.sendTestMessage();
    await db.run("INSERT INTO activity_log (type, message) VALUES ('discord', 'Test message sent to Discord')");
    res.json({ success: true, message: 'Test message sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await db.all("SELECT * FROM activity_log WHERE type = 'discord' ORDER BY created_at DESC LIMIT 50");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/channels
router.get('/channels', (req, res) => {
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
  res.json({ success: true });
});

// POST /api/discord/post-standings
router.post('/post-standings', async (req, res) => {
  try {
    const { channel } = req.body;
    const discordService = require('../services/discord');
    await discordService.postStandings(channel || 'standings');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

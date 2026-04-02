const db = require('../db/db');

async function createNotification(userId, leagueId, type, message, linkPath = null) {
  try {
    await db.run(
      'INSERT INTO notifications (user_id, league_id, type, message, link_path) VALUES (?, ?, ?, ?, ?)',
      userId, leagueId || null, type, message, linkPath
    );
  } catch (err) {
    console.error('[notify] Failed to create notification:', err.message);
  }
}

async function notifyMany(userIds, leagueId, type, message, linkPath = null) {
  for (const userId of userIds) {
    if (userId) await createNotification(userId, leagueId, type, message, linkPath);
  }
}

module.exports = { createNotification, notifyMany };

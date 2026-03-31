const cron = require('node-cron');
const db = require('../db/db');
const iracingService = require('./iracing');

let syncTask = null;

function startAutoSync() {
  // Check for completed races without results every 15 minutes
  syncTask = cron.schedule('*/15 * * * *', async () => {
    console.log('[Sync] Checking for races to sync...');
    const races = db.prepare(`
      SELECT * FROM races
      WHERE status = 'upcoming'
      AND iracing_subsession_id IS NOT NULL
      AND scheduled_at < ?
    `).all(Math.floor(Date.now() / 1000) - 900); // 15 min after scheduled time

    for (const race of races) {
      try {
        console.log(`[Sync] Syncing race ${race.id} — ${race.track_name}`);
        await iracingService.importRaceResults(race.id, race.iracing_subsession_id);
        db.prepare("INSERT INTO activity_log (type, message) VALUES ('result', ?)").run(
          `Auto-synced results for Round ${race.round_number} — ${race.track_name}`
        );
      } catch (err) {
        console.error(`[Sync] Failed to sync race ${race.id}:`, err.message);
      }
    }
  });

  console.log('[Sync] Auto-sync scheduler started (every 15 minutes)');
}

function stopAutoSync() {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('[Sync] Auto-sync scheduler stopped');
  }
}

module.exports = { startAutoSync, stopAutoSync };

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../../server/db/db');
const iracingService = require('../../server/services/iracing');

// GET /api/cron/sync — called by Vercel Cron every 15 minutes
module.exports = async (req, res) => {
  // Basic security: Vercel sends this header on cron invocations
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);

  // Find races that:
  // - are still marked upcoming
  // - have a subsession ID pre-set (admin entered it when scheduling)
  // - finished at least 15 minutes ago (give iRacing time to post results)
  const races = await db.all(`
    SELECT * FROM races
    WHERE status = 'upcoming'
    AND iracing_subsession_id IS NOT NULL
    AND scheduled_at < ?
  `, now - 900);

  const results = [];

  for (const race of races) {
    try {
      await iracingService.importRaceResults(race.id, race.iracing_subsession_id);
      await db.run("INSERT INTO activity_log (type, message) VALUES ('result', ?)",
        `Auto-synced results for Round ${race.round_number} — ${race.track_name}`);
      results.push({ race_id: race.id, status: 'ok' });
    } catch (err) {
      console.error(`[Cron] Failed to sync race ${race.id}:`, err.message);
      results.push({ race_id: race.id, status: 'error', error: err.message });
    }
  }

  res.json({ synced: results.length, results });
};

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/standings?season_id=x
router.get('/', async (req, res) => {
  try {
    const { season_id } = req.query;

    let sid = season_id;
    if (!sid) {
      const active = await db.get('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1');
      sid = active?.id;
    }

    if (!sid) return res.json([]);

    const standings = await db.all(`
      SELECT
        d.id,
        d.name as driver_name,
        d.car_number,
        d.car_model,
        d.irating,
        COUNT(DISTINCT rr.race_id)::int as starts,
        SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END)::int as wins,
        SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END)::int as podiums,
        COUNT(CASE WHEN rr.finish_position = (
          SELECT MIN(rr2.finish_position) FROM race_results rr2
          JOIN races r2 ON rr2.race_id = r2.id
          WHERE r2.id = rr.race_id
        ) THEN 1 END)::int as poles,
        COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0)::int as total_points,
        AVG(rr.incidents)::float as avg_incidents
      FROM drivers d
      LEFT JOIN race_results rr ON d.id = rr.driver_id
      LEFT JOIN races r ON rr.race_id = r.id AND r.season_id = ?
      WHERE d.status = 'active'
      GROUP BY d.id, d.name, d.car_number, d.car_model, d.irating
      ORDER BY total_points DESC
    `, sid);

    const leader_pts = standings[0]?.total_points ?? 0;
    const result = standings.map((s, i) => ({
      ...s,
      position: i + 1,
      gap: i === 0 ? 0 : leader_pts - s.total_points,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/standings/progression?season_id=x
router.get('/progression', async (req, res) => {
  try {
    const { season_id } = req.query;

    let sid = season_id;
    if (!sid) {
      const active = await db.get('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1');
      sid = active?.id;
    }

    if (!sid) return res.json([]);

    const races = await db.all(
      "SELECT id, round_number, track_name FROM races WHERE season_id = ? AND status = 'completed' ORDER BY round_number ASC",
      sid
    );

    const drivers = await db.all("SELECT id, name FROM drivers WHERE status = 'active'");

    const progression = await Promise.all(drivers.map(async (driver) => {
      let cumPoints = 0;
      const points = await Promise.all(races.map(async (race) => {
        const result = await db.get(
          'SELECT points_awarded + points_adjustment as pts FROM race_results WHERE race_id = ? AND driver_id = ?',
          race.id, driver.id
        );
        cumPoints += result?.pts || 0;
        return { round: race.round_number, track: race.track_name, points: cumPoints };
      }));
      return { driver_id: driver.id, driver_name: driver.name, points };
    }));

    res.json({ races, progression });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

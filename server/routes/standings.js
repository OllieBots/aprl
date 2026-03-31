const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/standings?season_id=x
router.get('/', (req, res) => {
  const { season_id } = req.query;

  // Get active season if not specified
  let sid = season_id;
  if (!sid) {
    const active = db.prepare('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1').get();
    sid = active?.id;
  }

  if (!sid) return res.json([]);

  const standings = db.prepare(`
    SELECT
      d.id,
      d.name as driver_name,
      d.car_number,
      d.car_model,
      d.irating,
      COUNT(DISTINCT rr.race_id) as starts,
      SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END) as podiums,
      COUNT(CASE WHEN rr.finish_position = (
        SELECT MIN(rr2.finish_position) FROM race_results rr2
        JOIN races r2 ON rr2.race_id = r2.id
        WHERE r2.id = rr.race_id
      ) THEN 1 END) as poles,
      COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0) as total_points,
      AVG(rr.incidents) as avg_incidents
    FROM drivers d
    LEFT JOIN race_results rr ON d.id = rr.driver_id
    LEFT JOIN races r ON rr.race_id = r.id AND r.season_id = ?
    WHERE d.status = 'active'
    GROUP BY d.id
    ORDER BY total_points DESC
  `).all(sid);

  // Calculate gap to leader
  const leader_pts = standings[0]?.total_points || 0;
  const result = standings.map((s, i) => ({
    ...s,
    position: i + 1,
    gap: i === 0 ? 0 : leader_pts - s.total_points,
  }));

  res.json(result);
});

// GET /api/standings/progression?season_id=x
router.get('/progression', (req, res) => {
  const { season_id } = req.query;

  let sid = season_id;
  if (!sid) {
    const active = db.prepare('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1').get();
    sid = active?.id;
  }

  if (!sid) return res.json([]);

  const races = db.prepare(`
    SELECT id, round_number, track_name FROM races
    WHERE season_id = ? AND status = 'completed'
    ORDER BY round_number ASC
  `).all(sid);

  const drivers = db.prepare("SELECT id, name FROM drivers WHERE status = 'active'").all();

  const progression = drivers.map(driver => {
    let cumPoints = 0;
    const points = races.map(race => {
      const result = db.prepare(`
        SELECT points_awarded + points_adjustment as pts
        FROM race_results WHERE race_id = ? AND driver_id = ?
      `).get(race.id, driver.id);
      cumPoints += result?.pts || 0;
      return { round: race.round_number, track: race.track_name, points: cumPoints };
    });
    return { driver_id: driver.id, driver_name: driver.name, points };
  });

  res.json({ races, progression });
});

module.exports = router;

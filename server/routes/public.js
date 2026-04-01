const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { optionalAuth } = require('../middleware/auth');

// GET /api/public/leagues — list all leagues (for home page recruitment section)
router.get('/leagues', async (req, res) => {
  try {
    const leagues = await db.all(`
      SELECT l.id, l.name, l.slug, l.description,
        COUNT(DISTINCT lm.user_id)::int as member_count
      FROM league l
      LEFT JOIN league_memberships lm ON l.id = lm.league_id AND lm.status = 'active'
      WHERE l.slug IS NOT NULL
      GROUP BY l.id, l.name, l.slug, l.description
    `);
    res.json(leagues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/leagues/:slug — league overview
router.get('/leagues/:slug', async (req, res) => {
  try {
    const league = await db.get('SELECT id, name, slug, description, primary_color, secondary_color, banner_url, logo_url FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const season = await db.get('SELECT id, name, series, car_class FROM seasons WHERE league_id = ? AND is_active = 1 LIMIT 1', league.id);
    const memberCount = await db.get('SELECT COUNT(*)::int as cnt FROM league_memberships WHERE league_id = ? AND status = ?', league.id, 'active');
    const completedRaces = await db.get(`
      SELECT COUNT(*)::int as cnt FROM races r
      JOIN seasons s ON r.season_id = s.id
      WHERE s.league_id = ? AND r.status = 'completed'
    `, league.id);

    res.json({ ...league, season, member_count: memberCount.cnt, completed_races: completedRaces.cnt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/leagues/:slug/standings
router.get('/leagues/:slug/standings', async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const season = await db.get('SELECT id FROM seasons WHERE league_id = ? AND is_active = 1 LIMIT 1', league.id);
    if (!season) return res.json([]);

    const standings = await db.all(`
      SELECT
        d.id, d.name as driver_name, d.car_number, d.car_model, d.irating,
        COUNT(DISTINCT rr.race_id)::int as starts,
        SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END)::int as wins,
        SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END)::int as podiums,
        COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0)::int as total_points,
        AVG(rr.incidents)::float as avg_incidents
      FROM drivers d
      LEFT JOIN race_results rr ON d.id = rr.driver_id
      LEFT JOIN races r ON rr.race_id = r.id AND r.season_id = ?
      WHERE d.status = 'active'
      GROUP BY d.id, d.name, d.car_number, d.car_model, d.irating
      ORDER BY total_points DESC
    `, season.id);

    const leader_pts = standings[0]?.total_points ?? 0;
    res.json(standings.map((s, i) => ({ ...s, position: i + 1, gap: i === 0 ? 0 : leader_pts - s.total_points })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/leagues/:slug/schedule
router.get('/leagues/:slug/schedule', async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const season = await db.get('SELECT id FROM seasons WHERE league_id = ? AND is_active = 1 LIMIT 1', league.id);
    if (!season) return res.json([]);

    const races = await db.all(
      'SELECT id, round_number, track_name, track_config, scheduled_at, laps, status FROM races WHERE season_id = ? ORDER BY round_number ASC',
      season.id
    );
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/leagues/:slug/results
router.get('/leagues/:slug/results', async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const season = await db.get('SELECT id FROM seasons WHERE league_id = ? AND is_active = 1 LIMIT 1', league.id);
    if (!season) return res.json([]);

    const races = await db.all(
      "SELECT id, round_number, track_name, track_config, scheduled_at, laps FROM races WHERE season_id = ? AND status = 'completed' ORDER BY round_number DESC",
      season.id
    );

    const racesWithResults = await Promise.all(races.map(async (race) => {
      const results = await db.all(`
        SELECT rr.finish_position, rr.points_awarded, rr.points_adjustment, rr.incidents, rr.fastest_lap_time,
          d.name as driver_name, d.car_model
        FROM race_results rr
        JOIN drivers d ON rr.driver_id = d.id
        WHERE rr.race_id = ?
        ORDER BY rr.finish_position ASC
      `, race.id);
      return { ...race, results };
    }));

    res.json(racesWithResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

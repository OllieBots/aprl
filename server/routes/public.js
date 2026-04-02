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

// GET /api/public/drivers?q= — search drivers by name
router.get('/drivers', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const term = `%${q.trim()}%`;
    const drivers = await db.all(`
      SELECT d.id, d.name, d.car_number, d.car_model, d.irating,
        d.safety_rating_class, d.safety_rating_value,
        u.iracing_cust_id,
        COUNT(DISTINCT lm.league_id)::int as active_leagues
      FROM drivers d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN league_memberships lm ON lm.user_id = u.id AND lm.status = 'active'
      WHERE d.name ILIKE ? AND d.status = 'active'
      GROUP BY d.id, d.name, d.car_number, d.car_model, d.irating,
        d.safety_rating_class, d.safety_rating_value, u.iracing_cust_id
      ORDER BY d.name ASC
      LIMIT 12
    `, term);
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/drivers/:id — driver profile
router.get('/drivers/:id', async (req, res) => {
  try {
    const driver = await db.get(`
      SELECT d.*, u.iracing_cust_id, u.id as user_id
      FROM drivers d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `, req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const stats = await db.get(`
      SELECT
        COUNT(DISTINCT rr.race_id)::int as starts,
        SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END)::int as wins,
        SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END)::int as podiums,
        COALESCE(SUM(rr.points_awarded + COALESCE(rr.points_adjustment, 0)), 0)::int as total_points,
        ROUND(AVG(rr.finish_position)::numeric, 1)::float as avg_finish,
        ROUND(AVG(rr.incidents)::numeric, 2)::float as avg_incidents
      FROM race_results rr WHERE rr.driver_id = ?
    `, driver.id);

    const recentResults = await db.all(`
      SELECT rr.finish_position, rr.points_awarded, rr.incidents, rr.dnf,
        r.round_number, r.track_name, r.scheduled_at,
        l.name as league_name, l.slug as league_slug
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      JOIN seasons s ON r.season_id = s.id
      JOIN league l ON s.league_id = l.id
      WHERE rr.driver_id = ?
      ORDER BY r.scheduled_at DESC
      LIMIT 10
    `, driver.id);

    let leagues = [];
    if (driver.user_id) {
      leagues = await db.all(`
        SELECT lm.status, l.name as league_name, l.slug,
          s.name as season_name, s.series, s.car_class
        FROM league_memberships lm
        JOIN league l ON lm.league_id = l.id
        LEFT JOIN seasons s ON s.league_id = l.id AND s.is_active = 1
        WHERE lm.user_id = ? AND lm.status = 'active'
      `, driver.user_id);
    }

    res.json({ driver, stats, recentResults, leagues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/user/dashboard — everything needed for the driver dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Leagues this user is in
    const memberships = await db.all(`
      SELECT lm.id, lm.status, lm.role, lm.created_at,
        l.id as league_id, l.name as league_name, l.slug,
        s.name as season_name, s.series
      FROM league_memberships lm
      JOIN league l ON lm.league_id = l.id
      LEFT JOIN seasons s ON s.league_id = l.id AND s.is_active = 1
      WHERE lm.user_id = ?
      ORDER BY lm.created_at DESC
    `, userId);

    // Stats across all leagues
    const driver = await db.get('SELECT * FROM drivers WHERE user_id = ?', userId);
    let stats = null;
    if (driver) {
      stats = await db.get(`
        SELECT
          COUNT(DISTINCT rr.race_id)::int as starts,
          SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END)::int as wins,
          SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END)::int as podiums,
          COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0)::int as total_points,
          AVG(rr.incidents)::float as avg_incidents
        FROM race_results rr WHERE rr.driver_id = ?
      `, driver.id);
    }

    // Pending invites
    const invites = await db.all(`
      SELECT lm.id, l.name as league_name, l.slug
      FROM league_memberships lm
      JOIN league l ON lm.league_id = l.id
      WHERE lm.user_id = ? AND lm.status = 'invited'
    `, userId);

    // Upcoming races in leagues they're active in
    const activeSlugs = memberships.filter(m => m.status === 'active').map(m => m.league_id);
    let upcomingRaces = [];
    if (activeSlugs.length > 0) {
      upcomingRaces = await db.all(`
        SELECT r.id, r.round_number, r.track_name, r.track_config, r.scheduled_at, r.laps, r.status,
          l.name as league_name, l.slug as league_slug
        FROM races r
        JOIN seasons s ON r.season_id = s.id
        JOIN league l ON s.league_id = l.id
        WHERE s.league_id = ANY(?) AND r.status = 'upcoming'
        ORDER BY r.scheduled_at ASC
        LIMIT 5
      `, [activeSlugs]);
    }

    res.json({ memberships, stats, driver, invites, upcomingRaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/leagues — create a league (makes user the owner)
router.post('/leagues', requireAuth, async (req, res) => {
  try {
    const { name, description, series, car_class } = req.body;
    if (!name) return res.status(400).json({ error: 'League name is required' });

    // Check user doesn't already own one
    const existing = await db.get('SELECT id FROM league WHERE owner_user_id = ?', req.user.id);
    if (existing) return res.status(400).json({ error: 'You already own a league' });

    // Generate a slug from the name
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let i = 2;
    while (await db.get('SELECT id FROM league WHERE slug = ?', slug)) {
      slug = `${baseSlug}-${i++}`;
    }

    const result = await db.insert(
      'INSERT INTO league (name, slug, description, owner_user_id) VALUES (?, ?, ?, ?)',
      name, slug, description || null, req.user.id
    );
    const leagueId = result.lastInsertRowid;

    // Create default season
    const defaultScoring = JSON.stringify({
      p1: 50, p2: 40, p3: 35, p4: 30, p5: 27, p6: 24, p7: 22, p8: 20,
      p9: 18, p10: 16, p11: 14, p12: 12, p13: 10, p14: 9, p15: 8,
      p16: 7, p17: 6, p18: 5, p19: 4, p20: 3, pole: 3, fl: 1,
    });
    await db.run(
      'INSERT INTO seasons (league_id, name, series, car_class, is_active, scoring_config) VALUES (?, ?, ?, ?, 1, ?)',
      leagueId, 'Season 1', series || null, car_class || null, defaultScoring
    );

    // Add owner as active member
    await db.run(
      'INSERT INTO league_memberships (user_id, league_id, status, role) VALUES (?, ?, ?, ?)',
      req.user.id, leagueId, 'active', 'owner'
    );

    // Create/link driver record
    const existingDriver = await db.get('SELECT id FROM drivers WHERE user_id = ? OR iracing_cust_id = ?', req.user.id, req.user.iracing_cust_id);
    if (!existingDriver) {
      await db.run(
        'INSERT INTO drivers (user_id, iracing_cust_id, name, status) VALUES (?, ?, ?, ?)',
        req.user.id, req.user.iracing_cust_id, req.user.name, 'active'
      );
    } else {
      await db.run('UPDATE drivers SET user_id = ? WHERE id = ?', req.user.id, existingDriver.id);
    }

    const league = await db.get('SELECT id, name, slug FROM league WHERE id = ?', leagueId);
    res.json({ league });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/leagues/:slug/join — request to join a league
router.post('/leagues/:slug/join', requireAuth, async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const existing = await db.get(
      'SELECT id, status FROM league_memberships WHERE user_id = ? AND league_id = ?',
      req.user.id, league.id
    );
    if (existing) {
      const msgs = { active: 'You are already a member', pending: 'You already have a pending request', invited: 'You have a pending invite' };
      return res.status(400).json({ error: msgs[existing.status] || 'Already associated with this league' });
    }

    await db.run(
      'INSERT INTO league_memberships (user_id, league_id, status, role) VALUES (?, ?, ?, ?)',
      req.user.id, league.id, 'pending', 'driver'
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/invites/:id/accept
router.post('/invites/:id/accept', requireAuth, async (req, res) => {
  try {
    const membership = await db.get(
      'SELECT * FROM league_memberships WHERE id = ? AND user_id = ? AND status = ?',
      req.params.id, req.user.id, 'invited'
    );
    if (!membership) return res.status(404).json({ error: 'Invite not found' });

    await db.run('UPDATE league_memberships SET status = ? WHERE id = ?', 'active', req.params.id);

    // Create driver record if needed
    const existing = await db.get('SELECT id FROM drivers WHERE user_id = ?', req.user.id);
    if (!existing) {
      await db.run(
        'INSERT INTO drivers (user_id, iracing_cust_id, name, status) VALUES (?, ?, ?, ?)',
        req.user.id, req.user.iracing_cust_id || null, req.user.name, 'active'
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/invites/:id/decline
router.post('/invites/:id/decline', requireAuth, async (req, res) => {
  try {
    await db.run(
      'DELETE FROM league_memberships WHERE id = ? AND user_id = ? AND status = ?',
      req.params.id, req.user.id, 'invited'
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

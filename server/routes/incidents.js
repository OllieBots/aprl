const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/public/leagues/:slug/incidents — list (members only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    // Must be an active member or owner
    const membership = await db.get(
      "SELECT id FROM league_memberships WHERE user_id = ? AND league_id = ? AND status = 'active'",
      req.user.id, league.id
    );
    const isOwner = await db.get('SELECT id FROM league WHERE id = ? AND owner_user_id = ?', league.id, req.user.id);
    if (!membership && !isOwner) return res.status(403).json({ error: 'You must be a league member to view incident reports' });

    const incidents = await db.all(`
      SELECT ir.*,
        u.name as reporter_name,
        r.round_number, r.track_name
      FROM incident_reports ir
      JOIN users u ON ir.reporter_user_id = u.id
      LEFT JOIN races r ON ir.race_id = r.id
      WHERE ir.league_id = ?
      ORDER BY ir.created_at DESC
    `, league.id);

    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/leagues/:slug/incidents — submit (active members only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const membership = await db.get(
      "SELECT id FROM league_memberships WHERE user_id = ? AND league_id = ? AND status = 'active'",
      req.user.id, league.id
    );
    const isOwner = await db.get('SELECT id FROM league WHERE id = ? AND owner_user_id = ?', league.id, req.user.id);
    if (!membership && !isOwner) return res.status(403).json({ error: 'You must be an active league member to submit incident reports' });

    const { race_id, involved_drivers, session_type, lap_number, explanation, clip_url } = req.body;
    if (!explanation) return res.status(400).json({ error: 'Explanation is required' });

    const result = await db.insert(
      `INSERT INTO incident_reports
        (league_id, reporter_user_id, race_id, involved_drivers, session_type, lap_number, explanation, clip_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      league.id, req.user.id,
      race_id || null,
      JSON.stringify(involved_drivers || []),
      session_type || null,
      lap_number || null,
      explanation,
      clip_url || null
    );

    await db.run("INSERT INTO activity_log (type, message) VALUES ('incident', ?)",
      `Incident report submitted by ${req.user.name} for league ${league.id}`);

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/public/leagues/:slug/incidents/:id — update status (owner/admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const league = await db.get('SELECT id FROM league WHERE slug = ?', req.params.slug);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const isOwner = await db.get('SELECT id FROM league WHERE id = ? AND owner_user_id = ?', league.id, req.user.id);
    if (!isOwner) return res.status(403).json({ error: 'Only league admins can update incident reports' });

    const { status, admin_notes } = req.body;
    await db.run(
      'UPDATE incident_reports SET status = ?, admin_notes = ? WHERE id = ? AND league_id = ?',
      status, admin_notes || null, req.params.id, league.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

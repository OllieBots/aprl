const express = require('express');
const router = express.Router();
const db = require('../db/db');
const adminLeague = require('../middleware/adminLeague');

router.use(adminLeague);

// GET /api/irt — list all incidents for this admin's league
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ir.*,
        u.name as reporter_name,
        u.iracing_cust_id as reporter_iracing_id,
        r.round_number, r.track_name
      FROM incident_reports ir
      JOIN users u ON ir.reporter_user_id = u.id
      LEFT JOIN races r ON ir.race_id = r.id
      WHERE ir.league_id = ?
    `;
    const params = [req.leagueId];
    if (status) { query += ' AND ir.status = ?'; params.push(status); }
    query += ' ORDER BY ir.created_at DESC';

    const incidents = await db.all(query, ...params);
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/irt/counts — status counts for badge display
router.get('/counts', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT status, COUNT(*)::int as count FROM incident_reports WHERE league_id = ? GROUP BY status',
      req.leagueId
    );
    const counts = { open: 0, under_review: 0, resolved: 0, dismissed: 0 };
    rows.forEach(r => { counts[r.status] = r.count; });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/irt/:id — update status and/or admin notes
router.put('/:id', async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    const incident = await db.get(
      'SELECT id FROM incident_reports WHERE id = ? AND league_id = ?',
      req.params.id, req.leagueId
    );
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    await db.run(
      'UPDATE incident_reports SET status = ?, admin_notes = ? WHERE id = ?',
      status, admin_notes ?? null, req.params.id
    );

    await db.run("INSERT INTO activity_log (type, message) VALUES ('incident', ?)",
      `Incident #${req.params.id} updated to ${status}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

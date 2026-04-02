const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const adminLeague = require('../middleware/adminLeague');
const { createNotification } = require('../lib/notify');

// Determine IRT role for a user in a league: 'admin' | 'reviewer' | null
async function getIRTRole(userId, leagueId) {
  const isOwner = await db.get('SELECT id FROM league WHERE id = ? AND owner_user_id = ?', leagueId, userId);
  if (isOwner) return 'admin';
  const m = await db.get(
    "SELECT id FROM league_memberships WHERE user_id = ? AND league_id = ? AND irt_reviewer = true AND status = 'active'",
    userId, leagueId
  );
  return m ? 'reviewer' : null;
}

// Middleware: authenticated + has IRT access (admin or reviewer) for the relevant league
function irtAccess(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      let leagueId;
      if (req.params.id) {
        const incident = await db.get('SELECT league_id FROM incident_reports WHERE id = ?', req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });
        leagueId = incident.league_id;
      } else {
        // List/count endpoints — derive from ownership or reviewer membership
        leagueId = req.user.ownedLeagueId;
        if (!leagueId) {
          const m = await db.get(
            "SELECT league_id FROM league_memberships WHERE user_id = ? AND irt_reviewer = true AND status = 'active' LIMIT 1",
            req.user.id
          );
          leagueId = m?.league_id;
        }
      }
      if (!leagueId) return res.status(403).json({ error: 'No IRT access found' });

      const role = await getIRTRole(req.user.id, leagueId);
      if (!role) return res.status(403).json({ error: 'IRT access required' });

      req.leagueId = leagueId;
      req.irtRole = role;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

function adminOnly(req, res, next) {
  if (req.irtRole !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// GET /api/irt — list incidents (admin or reviewer)
router.get('/', irtAccess, async (req, res) => {
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
    res.json(await db.all(query, ...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/irt/counts
router.get('/counts', irtAccess, async (req, res) => {
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

// GET /api/irt/reviewers — list active members with their IRT status (admin only)
router.get('/reviewers', adminLeague, async (req, res) => {
  try {
    const reviewers = await db.all(`
      SELECT lm.id as membership_id, lm.irt_reviewer, u.id as user_id, u.name, u.iracing_cust_id
      FROM league_memberships lm
      JOIN users u ON lm.user_id = u.id
      WHERE lm.league_id = ? AND lm.status = 'active'
        AND u.id != (SELECT owner_user_id FROM league WHERE id = ?)
      ORDER BY lm.irt_reviewer DESC, u.name ASC
    `, req.leagueId, req.leagueId);
    res.json(reviewers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/irt/reviewers/:membershipId — grant or revoke IRT access (admin only)
router.put('/reviewers/:membershipId', adminLeague, async (req, res) => {
  try {
    const { irt_reviewer } = req.body;
    await db.run(
      'UPDATE league_memberships SET irt_reviewer = ? WHERE id = ? AND league_id = ?',
      irt_reviewer, req.params.membershipId, req.leagueId
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('settings', ?)",
      `IRT reviewer access ${irt_reviewer ? 'granted' : 'revoked'} for membership ${req.params.membershipId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/irt/:id — full incident detail with votes + comments
router.get('/:id', irtAccess, async (req, res) => {
  try {
    const incident = await db.get(`
      SELECT ir.*, u.name as reporter_name, r.round_number, r.track_name
      FROM incident_reports ir
      JOIN users u ON ir.reporter_user_id = u.id
      LEFT JOIN races r ON ir.race_id = r.id
      WHERE ir.id = ? AND ir.league_id = ?
    `, req.params.id, req.leagueId);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const votes = await db.all(`
      SELECT iv.vote, iv.created_at, u.id as user_id, u.name
      FROM incident_votes iv
      JOIN users u ON iv.user_id = u.id
      WHERE iv.incident_id = ?
      ORDER BY iv.created_at ASC
    `, req.params.id);

    const comments = await db.all(`
      SELECT ic.id, ic.body, ic.created_at, u.id as user_id, u.name
      FROM incident_comments ic
      JOIN users u ON ic.user_id = u.id
      WHERE ic.incident_id = ?
      ORDER BY ic.created_at ASC
    `, req.params.id);

    res.json({ ...incident, votes, comments, userRole: req.irtRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/irt/:id — update status + admin notes (admin only)
router.put('/:id', irtAccess, adminOnly, async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    const incident = await db.get(
      'SELECT reporter_user_id, status as old_status FROM incident_reports WHERE id = ? AND league_id = ?',
      req.params.id, req.leagueId
    );
    await db.run(
      'UPDATE incident_reports SET status = ?, admin_notes = ? WHERE id = ? AND league_id = ?',
      status, admin_notes ?? null, req.params.id, req.leagueId
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('incident', ?)",
      `Incident #${req.params.id} updated to ${status}`);
    // Notify the reporter if status changed
    if (incident && status !== incident.old_status) {
      const statusLabel = { open: 'Open', under_review: 'Under Review', resolved: 'Resolved', dismissed: 'Dismissed' }[status] || status;
      await createNotification(incident.reporter_user_id, req.leagueId, 'irt_status',
        `Your incident report #${req.params.id} has been marked as: ${statusLabel}`, null);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/irt/:id/vote — cast or update vote
router.post('/:id/vote', irtAccess, async (req, res) => {
  try {
    const { vote } = req.body;
    if (!['guilty', 'not_guilty', 'abstain'].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote value' });
    }
    const existing = await db.get(
      'SELECT id FROM incident_votes WHERE incident_id = ? AND user_id = ?',
      req.params.id, req.user.id
    );
    if (existing) {
      await db.run('UPDATE incident_votes SET vote = ? WHERE id = ?', vote, existing.id);
    } else {
      await db.insert(
        'INSERT INTO incident_votes (incident_id, user_id, vote) VALUES (?, ?, ?)',
        req.params.id, req.user.id, vote
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/irt/:id/vote — remove own vote
router.delete('/:id/vote', irtAccess, async (req, res) => {
  try {
    await db.run(
      'DELETE FROM incident_votes WHERE incident_id = ? AND user_id = ?',
      req.params.id, req.user.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/irt/:id/comments — add a comment
router.post('/:id/comments', irtAccess, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    const result = await db.insert(
      'INSERT INTO incident_comments (incident_id, user_id, body) VALUES (?, ?, ?)',
      req.params.id, req.user.id, body.trim()
    );
    const comment = await db.get(`
      SELECT ic.id, ic.body, ic.created_at, u.id as user_id, u.name
      FROM incident_comments ic JOIN users u ON ic.user_id = u.id
      WHERE ic.id = ?
    `, result.lastInsertRowid);
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

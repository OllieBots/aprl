const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

async function requireOwner(req, res, leagueId) {
  const league = await db.get('SELECT id FROM league WHERE id = ? AND owner_user_id = ?', leagueId, req.user.id);
  if (!league) { res.status(403).json({ error: 'Not authorized' }); return false; }
  return true;
}

// GET /api/members/:leagueId — list all memberships
router.get('/:leagueId', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    const members = await db.all(`
      SELECT lm.id, lm.status, lm.role, lm.created_at,
        u.id as user_id, u.name, u.email, u.iracing_cust_id, u.iracing_verified
      FROM league_memberships lm
      JOIN users u ON lm.user_id = u.id
      WHERE lm.league_id = ?
      ORDER BY lm.created_at ASC
    `, req.params.leagueId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:leagueId/invite — invite by email
router.post('/:leagueId/invite', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    const { email } = req.body;

    const user = await db.get('SELECT id FROM users WHERE email = ?', email?.toLowerCase());
    if (!user) return res.status(404).json({ error: 'No account found with that email. Ask them to sign up first.' });

    const existing = await db.get(
      'SELECT id, status FROM league_memberships WHERE user_id = ? AND league_id = ?',
      user.id, req.params.leagueId
    );
    if (existing) return res.status(400).json({ error: `This user is already ${existing.status === 'active' ? 'a member' : 'pending'}` });

    await db.run(
      'INSERT INTO league_memberships (user_id, league_id, status, role) VALUES (?, ?, ?, ?)',
      user.id, req.params.leagueId, 'invited', 'driver'
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/:leagueId/:membershipId — approve, reject, or change role
router.put('/:leagueId/:membershipId', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    const { status, role } = req.body;

    const membership = await db.get(
      'SELECT * FROM league_memberships WHERE id = ? AND league_id = ?',
      req.params.membershipId, req.params.leagueId
    );
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    await db.run(
      'UPDATE league_memberships SET status = ?, role = ? WHERE id = ?',
      status || membership.status, role || membership.role, req.params.membershipId
    );

    // If approving, ensure driver record exists
    if (status === 'active' && membership.status !== 'active') {
      const user = await db.get('SELECT * FROM users WHERE id = ?', membership.user_id);
      const existing = await db.get('SELECT id FROM drivers WHERE user_id = ?', user.id);
      if (!existing) {
        await db.run(
          'INSERT INTO drivers (user_id, iracing_cust_id, name, status) VALUES (?, ?, ?, ?)',
          user.id, user.iracing_cust_id || null, user.name, 'active'
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/members/:leagueId/:membershipId — remove member
router.delete('/:leagueId/:membershipId', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    await db.run('DELETE FROM league_memberships WHERE id = ? AND league_id = ?', req.params.membershipId, req.params.leagueId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

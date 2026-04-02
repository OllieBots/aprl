const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../lib/notify');

async function requireOwner(req, res, leagueId) {
  const league = await db.get('SELECT id FROM league WHERE id = ? AND owner_user_id = ?', leagueId, req.user.id);
  if (!league) { res.status(403).json({ error: 'Not authorized' }); return false; }
  return true;
}

// GET /api/members/:leagueId — list all memberships (includes pre-signup invites)
router.get('/:leagueId', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    const members = await db.all(`
      SELECT lm.id, lm.status, lm.role, lm.created_at,
        lm.display_name, lm.car_number, lm.car_model, lm.team_name,
        lm.invited_iracing_cust_id,
        u.id as user_id, u.name, u.email, u.iracing_cust_id, u.iracing_verified
      FROM league_memberships lm
      LEFT JOIN users u ON lm.user_id = u.id
      WHERE lm.league_id = ?
      ORDER BY lm.created_at ASC
    `, req.params.leagueId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/:leagueId/car-numbers — taken car numbers in this league
router.get('/:leagueId/car-numbers', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    const taken = await db.all(
      'SELECT car_number FROM league_memberships WHERE league_id = ? AND car_number IS NOT NULL',
      req.params.leagueId
    );
    res.json(taken.map(r => r.car_number));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:leagueId/invite — invite by iRacing Customer ID
router.post('/:leagueId/invite', requireAuth, async (req, res) => {
  try {
    if (!await requireOwner(req, res, req.params.leagueId)) return;
    const { iracing_cust_id } = req.body;
    if (!iracing_cust_id) return res.status(400).json({ error: 'iRacing Customer ID is required' });

    const user = await db.get('SELECT id FROM users WHERE iracing_cust_id = ?', iracing_cust_id);

    if (user) {
      // User already has an APRL account — link invite directly
      const existing = await db.get(
        'SELECT id, status FROM league_memberships WHERE user_id = ? AND league_id = ?',
        user.id, req.params.leagueId
      );
      if (existing) {
        const label = existing.status === 'active' ? 'already a member' : existing.status;
        return res.status(400).json({ error: `This driver is ${label} in this league` });
      }
      await db.insert(
        'INSERT INTO league_memberships (user_id, league_id, status, role) VALUES (?, ?, ?, ?)',
        user.id, req.params.leagueId, 'invited', 'driver'
      );
      const leagueRow = await db.get('SELECT name FROM league WHERE id = ?', req.params.leagueId);
      await createNotification(user.id, req.params.leagueId, 'invite',
        `You've been invited to join ${leagueRow?.name || 'a league'}`, '/dashboard');
    } else {
      // No account yet — pre-signup invite
      const existing = await db.get(
        'SELECT id FROM league_memberships WHERE invited_iracing_cust_id = ? AND league_id = ?',
        iracing_cust_id, req.params.leagueId
      );
      if (existing) return res.status(400).json({ error: 'An invite has already been sent to this iRacing ID' });

      await db.insert(
        'INSERT INTO league_memberships (invited_iracing_cust_id, league_id, status, role) VALUES (?, ?, ?, ?)',
        iracing_cust_id, req.params.leagueId, 'invited', 'driver'
      );
    }

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

    // Notify user if their membership status changed
    if (membership.user_id) {
      const leagueRow = await db.get('SELECT name FROM league WHERE id = ?', req.params.leagueId);
      if (status === 'active' && membership.status !== 'active') {
        await createNotification(membership.user_id, req.params.leagueId, 'join_approved',
          `Your membership in ${leagueRow?.name || 'a league'} has been approved!`, '/dashboard');
      } else if (status === 'rejected' && membership.status !== 'rejected') {
        await createNotification(membership.user_id, req.params.leagueId, 'join_rejected',
          `Your request to join ${leagueRow?.name || 'a league'} was not approved`, '/dashboard');
      }
    }

    // If approving and user account exists, ensure driver record is present
    if (status === 'active' && membership.status !== 'active' && membership.user_id) {
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

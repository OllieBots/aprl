const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const iracingService = require('../services/iracing');

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, ownedLeagueId: user.owned_league_id || null },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, iracing_cust_id } = req.body;
    if (!email || !password || !name || !iracing_cust_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    const existingIR = await db.get('SELECT id FROM users WHERE iracing_cust_id = ?', iracing_cust_id);
    if (existingIR) return res.status(400).json({ error: 'This iRacing customer ID is already linked to an account' });

    // Try to verify iRacing ID — gracefully falls back if credentials aren't set
    let iracing_verified = false;
    try {
      const member = await iracingService.fetchFromIRacing(`member/get?cust_ids=${iracing_cust_id}&include_licenses=false`);
      iracing_verified = !!(member?.members?.length);
    } catch {}

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.insert(
      'INSERT INTO users (email, password_hash, name, iracing_cust_id, iracing_verified) VALUES (?, ?, ?, ?, ?)',
      email.toLowerCase(), password_hash, name, iracing_cust_id, iracing_verified
    );

    // Link to existing driver record if one exists with the same iRacing ID
    await db.run(
      'UPDATE drivers SET user_id = ? WHERE iracing_cust_id = ? AND user_id IS NULL',
      result.lastInsertRowid, iracing_cust_id
    );

    // Auto-link any pre-signup invites that were waiting for this iRacing ID
    await db.run(
      'UPDATE league_memberships SET user_id = ? WHERE invited_iracing_cust_id = ? AND user_id IS NULL',
      result.lastInsertRowid, iracing_cust_id
    );

    const user = await db.get('SELECT id, email, name, iracing_cust_id, iracing_verified FROM users WHERE id = ?', result.lastInsertRowid);
    res.json({ token: makeToken({ ...user, owned_league_id: null }), user, iracing_verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email?.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Check if they own a league
    const ownedLeague = await db.get('SELECT id, slug FROM league WHERE owner_user_id = ?', user.id);

    const safe = { id: user.id, email: user.email, name: user.name, iracing_cust_id: user.iracing_cust_id, iracing_verified: user.iracing_verified };
    res.json({ token: makeToken({ ...safe, owned_league_id: ownedLeague?.id || null }), user: safe, ownedLeague: ownedLeague || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, name, iracing_cust_id, iracing_verified, created_at FROM users WHERE id = ?', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ownedLeague = await db.get('SELECT id, slug, name FROM league WHERE owner_user_id = ?', user.id);
    res.json({ ...user, ownedLeague: ownedLeague || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/me (update profile)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    await db.run('UPDATE users SET name = ? WHERE id = ?', name, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await db.all(
      `SELECT n.*, l.name as league_name
       FROM notifications n
       LEFT JOIN league l ON n.league_id = l.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      req.user.id
    );
    const unread = notifications.filter(n => !n.read).length;
    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await db.run('UPDATE notifications SET read = true WHERE user_id = ?', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await db.run(
      'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
      req.params.id, req.user.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      req.params.id, req.user.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

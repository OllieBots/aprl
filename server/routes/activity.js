const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/activity
router.get('/', (req, res) => {
  const { limit = 20, type } = req.query;
  let query = 'SELECT * FROM activity_log WHERE 1=1';
  const params = [];
  if (type) { query += ' AND type = ?'; params.push(type); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

module.exports = router;

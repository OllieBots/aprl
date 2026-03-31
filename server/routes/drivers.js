const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await db.all(`
      SELECT d.*,
        COUNT(DISTINCT rr.race_id) as starts,
        SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END) as podiums,
        COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0) as total_points
      FROM drivers d
      LEFT JOIN race_results rr ON d.id = rr.driver_id
      GROUP BY d.id
      ORDER BY total_points DESC
    `);
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drivers
router.post('/', async (req, res) => {
  try {
    const { name, iracing_cust_id, car_number, car_model, irating, safety_rating_class, safety_rating_value } = req.body;
    const result = await db.insert(
      'INSERT INTO drivers (name, iracing_cust_id, car_number, car_model, irating, safety_rating_class, safety_rating_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
      name, iracing_cust_id, car_number, car_model, irating, safety_rating_class, safety_rating_value
    );
    await db.run("INSERT INTO activity_log (type, message) VALUES ('driver', ?)", `${name} added to the roster`);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  try {
    const driver = await db.get('SELECT * FROM drivers WHERE id = ?', req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const history = await db.all(`
      SELECT rr.*, r.track_name, r.track_config, r.round_number, r.scheduled_at
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      WHERE rr.driver_id = ?
      ORDER BY r.scheduled_at DESC
    `, req.params.id);

    res.json({ ...driver, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/drivers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, car_number, car_model, irating, safety_rating_class, safety_rating_value, status } = req.body;
    await db.run(
      'UPDATE drivers SET name = ?, car_number = ?, car_model = ?, irating = ?, safety_rating_class = ?, safety_rating_value = ?, status = ? WHERE id = ?',
      name, car_number, car_model, irating, safety_rating_class, safety_rating_value, status, req.params.id
    );
    if (status) {
      const driver = await db.get('SELECT name FROM drivers WHERE id = ?', req.params.id);
      await db.run("INSERT INTO activity_log (type, message) VALUES ('driver', ?)",
        `Driver ${driver?.name} status changed to ${status}`);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/drivers/:id
router.delete('/:id', async (req, res) => {
  try {
    const driver = await db.get('SELECT name FROM drivers WHERE id = ?', req.params.id);
    await db.run('DELETE FROM race_results WHERE driver_id = ?', req.params.id);
    await db.run('DELETE FROM drivers WHERE id = ?', req.params.id);
    await db.run("INSERT INTO activity_log (type, message) VALUES ('driver', ?)",
      `Driver ${driver?.name} removed from roster`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

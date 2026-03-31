const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/drivers
router.get('/', (req, res) => {
  const drivers = db.prepare(`
    SELECT d.*,
      COUNT(DISTINCT rr.race_id) as starts,
      SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN rr.finish_position <= 3 THEN 1 ELSE 0 END) as podiums,
      COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0) as total_points
    FROM drivers d
    LEFT JOIN race_results rr ON d.id = rr.driver_id
    GROUP BY d.id
    ORDER BY total_points DESC
  `).all();
  res.json(drivers);
});

// POST /api/drivers
router.post('/', (req, res) => {
  const { name, iracing_cust_id, car_number, car_model, irating, safety_rating_class, safety_rating_value } = req.body;
  const result = db.prepare(`
    INSERT INTO drivers (name, iracing_cust_id, car_number, car_model, irating, safety_rating_class, safety_rating_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, iracing_cust_id, car_number, car_model, irating, safety_rating_class, safety_rating_value);
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('driver', ?)").run(`${name} added to the roster`);
  res.json({ id: result.lastInsertRowid });
});

// GET /api/drivers/:id
router.get('/:id', (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const history = db.prepare(`
    SELECT rr.*, r.track_name, r.track_config, r.round_number, r.scheduled_at
    FROM race_results rr
    JOIN races r ON rr.race_id = r.id
    WHERE rr.driver_id = ?
    ORDER BY r.scheduled_at DESC
  `).all(req.params.id);

  res.json({ ...driver, history });
});

// PUT /api/drivers/:id
router.put('/:id', (req, res) => {
  const { name, car_number, car_model, irating, safety_rating_class, safety_rating_value, status } = req.body;
  db.prepare(`
    UPDATE drivers SET name = ?, car_number = ?, car_model = ?, irating = ?,
    safety_rating_class = ?, safety_rating_value = ?, status = ? WHERE id = ?
  `).run(name, car_number, car_model, irating, safety_rating_class, safety_rating_value, status, req.params.id);
  const driver = db.prepare('SELECT name FROM drivers WHERE id = ?').get(req.params.id);
  if (status) {
    db.prepare("INSERT INTO activity_log (type, message) VALUES ('driver', ?)").run(
      `Driver ${driver?.name} status changed to ${status}`
    );
  }
  res.json({ success: true });
});

// DELETE /api/drivers/:id
router.delete('/:id', (req, res) => {
  const driver = db.prepare('SELECT name FROM drivers WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM race_results WHERE driver_id = ?').run(req.params.id);
  db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
  db.prepare("INSERT INTO activity_log (type, message) VALUES ('driver', ?)").run(`Driver ${driver?.name} removed from roster`);
  res.json({ success: true });
});

module.exports = router;

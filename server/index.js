require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/league', require('./routes/league'));
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/races', require('./routes/races'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/iracing', require('./routes/iracing'));
app.use('/api/discord', require('./routes/discord'));
app.use('/api/activity', require('./routes/activity'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`APRL server running on http://localhost:${PORT}`);
});

// Start auto-sync in production
if (process.env.NODE_ENV === 'production') {
  const { startAutoSync } = require('./services/sync');
  startAutoSync();
}

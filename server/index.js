require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/db');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/user',     require('./routes/user'));
app.use('/api/public',   require('./routes/public'));
app.use('/api/public/leagues/:slug/incidents', require('./routes/incidents'));
app.use('/api/members',  require('./routes/members'));
app.use('/api/league',   require('./routes/league'));
app.use('/api/seasons',  require('./routes/seasons'));
app.use('/api/drivers',  require('./routes/drivers'));
app.use('/api/races',    require('./routes/races'));
app.use('/api/standings',require('./routes/standings'));
app.use('/api/iracing',  require('./routes/iracing'));
app.use('/api/discord',  require('./routes/discord'));
app.use('/api/activity', require('./routes/activity'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;

// Only start the local dev server when run directly (not when imported by Vercel)
if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`APRL server running on http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('[DB] Failed to connect to Supabase:', err.message);
      process.exit(1);
    });
}

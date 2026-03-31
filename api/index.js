require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDb } = require('../server/db/db');
const app = require('../server/index');

let initialized = false;

// Wrap app to lazily call initDb() on first request (Vercel serverless has no boot step)
module.exports = async (req, res) => {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return app(req, res);
};

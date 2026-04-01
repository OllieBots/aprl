const { optionalAuth } = require('./auth');

// Attaches req.leagueId from the authenticated user's owned league.
// Falls back to 1 for local dev without auth.
function adminLeague(req, res, next) {
  optionalAuth(req, res, () => {
    req.leagueId = req.user?.ownedLeagueId ?? 1;
    next();
  });
}

module.exports = adminLeague;

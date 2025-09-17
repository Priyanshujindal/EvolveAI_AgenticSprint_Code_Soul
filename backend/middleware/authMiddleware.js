let admin = null;
const { DEV_AUTH_PERMISSIVE } = require('../config/config');
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (_) {
  // firebase-admin not available; middleware will operate in permissive mode
}

function requireAuth(req, res, next) {
  // Support dev mode when firebase-admin is not installed or configured
  if (!admin || DEV_AUTH_PERMISSIVE) {
    // In permissive mode, prefer client-provided userId from body options, then header, then demo
    try {
      const bodyUserId = (req && req.body && req.body.options && req.body.options.userId) || null;
      const headerUserId = req.headers['x-user-id'] || null;
      req.user = { uid: bodyUserId || headerUserId || 'demo' };
    } catch (_) {
      req.user = { uid: req.headers['x-user-id'] || 'demo' };
    }
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing Bearer token' });
  }

  admin
    .auth()
    .verifyIdToken(token)
    .then((decoded) => {
      req.user = { uid: decoded.uid, token: decoded };
      next();
    })
    .catch(() => res.status(401).json({ success: false, error: 'Invalid token' }));
}

module.exports = { requireAuth };



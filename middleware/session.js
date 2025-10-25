// Session Middleware - Attach session to request
const session = require('express-session');
const { RedisStore } = require('connect-redis');

/**
 * Create express-session middleware with Redis store
 * @param {Object} redisClient - ioredis client instance
 * @returns {Function} Express middleware
 */
function createSessionMiddleware(redisClient) {
  const store = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 60 * 60 * 24 * 7, // 7 days
    disableTouch: false,
    disableTTL: false
  });

  return session({
    store: store,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    name: 'poker.sid',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax'
    }
  });
}

/**
 * Middleware to ensure user has a session
 */
async function ensureSession(req, res, next) {
  if (!req.session) {
    return res.status(500).json({ error: 'Session not initialized' });
  }

  // Initialize session data if not present
  if (!req.session.userId) {
    // Check for user from JWT or create guest
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.session.userId = decoded.user_id || decoded.sub;
      } catch (error) {
        // Invalid token, will be treated as guest
      }
    }
    
    // Create guest ID if no user
    if (!req.session.userId) {
      const { v4: uuidv4 } = require('uuid');
      req.session.userId = `guest_${uuidv4()}`;
      req.session.isGuest = true;
    }

    await req.session.save();
  }

  // Attach userId to request for convenience
  req.userId = req.session.userId;
  req.isGuest = req.session.isGuest || false;

  next();
}

/**
 * Middleware to attach SessionService to request
 */
function attachSessionService(sessionService) {
  return (req, res, next) => {
    req.sessionService = sessionService;
    next();
  };
}

module.exports = {
  createSessionMiddleware,
  ensureSession,
  attachSessionService
};


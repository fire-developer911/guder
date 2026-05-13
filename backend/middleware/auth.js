// ===========================
// Guder — AUTH MIDDLEWARE
// ===========================
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Guder-super-secret-jwt-key-change-in-production';

function verifyToken(req, res, next) {
  // Token comes from httpOnly cookie only — never from header/body (security)
  const token = req.cookies?.Guder_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload; // { userId, username, plan }
    next();
  } catch (err) {
    // Clear bad cookie
    res.clearCookie('Guder_token');
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid session. Please log in again.' });
  }
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });
}

module.exports = { verifyToken, signToken };

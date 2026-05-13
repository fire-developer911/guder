// ===========================
// Guder — AUTH ROUTES
// ===========================
const express = require('express');
const router = express.Router();
const { User } = require('../db/models');
const { signToken, verifyToken } = require('../middleware/auth');

const COOKIE_OPTS = {
  httpOnly: true,        // JS cannot read this cookie
  secure: false,         // Set to false for local localhost testing
  sameSite: 'Lax',       // Lax is better for local dev than Strict
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Sanitize helper
function sanitize(str) {
  return typeof str === 'string' ? str.trim().slice(0, 64) : '';
}

// ===========================
// POST /api/auth/login
// ===========================
router.post('/login', async (req, res) => {
  try {
    const username = sanitize(req.body.username);
    const password = req.body.password; // Don't trim password to allow spaces if intended

    console.log(`\n[AUTH] Login Attempt -> User: "${username}" | Pass: "${password}"`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find user and force select passwordHash just in case
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    }).select('+passwordHash');

    if (!user) {
      console.log(`[AUTH] Failure: User "${username}" not found in DB.`);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (!user.isActive) {
      console.log(`[AUTH] Failure: User "${username}" is marked as inactive.`);
      return res.status(401).json({ error: 'Account is disabled.' });
    }

    console.log(`[AUTH] DB match found. DB Password is: "${user.passwordHash}"`);

    const valid = await user.verifyPassword(password);
    
    if (!valid) {
      console.log(`[AUTH] Failure: Password mismatch for "${username}".`);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    console.log(`[AUTH] Success! Signing token for "${username}"`);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = signToken({ 
      userId: user._id.toString(), 
      username: user.username, 
      plan: user.plan, 
      isAdmin: user.isAdmin 
    });

    res.cookie('Guder_token', token, COOKIE_OPTS);
    
    // Return user info and a success flag
    res.json({
      success: true,
      username: user.username,
      plan: user.plan,
      isAdmin: user.isAdmin
    });

  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ===========================
// POST /api/auth/logout
// ===========================
router.post('/logout', (req, res) => {
  res.clearCookie('Guder_token', { httpOnly: true, sameSite: 'Lax' });
  res.json({ message: 'Logged out successfully.' });
});

// ===========================
// GET /api/auth/me
// ===========================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
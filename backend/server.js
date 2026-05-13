// ===========================
// Guder — SERVER ENTRY
// ===========================
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Change these lines:
const authRoutes = require('./routes/auth'); // Removed 'backend/'
const serverRoutes = require('./routes/servers'); // Removed 'backend/'
const { verifyToken } = require('./middleware/auth'); // Removed 'backend/'

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Guder';

// ===========================
// SECURITY MIDDLEWARE
// ===========================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Keep this for <script> tags
      scriptSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      // ADD THIS LINE: This allows onclick, onmouseover, etc.
      scriptSrcAttr: ["'unsafe-inline'"], 
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "discord.com"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({ 
  origin: 'https://guder.netlify.app',
  credentials: true 
}));
app.use(cookieParser(process.env.COOKIE_SECRET || 'Guder-cookie-secret-change-in-prod'));
app.use(express.json({ limit: '10kb' }));

// General rate limiter
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

// Strict limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});

// ===========================
// DATABASE
// ===========================
mongoose.connect(MONGO_URI)
  .then(() => console.log('[DB] Connected to MongoDB:', MONGO_URI))
  .catch(err => { console.error('[DB] Connection failed:', err.message); process.exit(1); });

// ===========================
// ROUTES
// ===========================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/servers', verifyToken, serverRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ===========================
// STATIC FILES
// ===========================
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Cache static assets
    if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Catch-all — serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===========================
// START
// ===========================
app.listen(PORT, () => {
  console.log(`[SERVER] Guder running on http://localhost:${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

// ===========================
// Guder — DATABASE MODELS
// ===========================
const mongoose = require('mongoose');

// ===========================
// USER MODEL
// ===========================
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 32,
    match: /^[a-zA-Z0-9_]+$/
  },
  passwordHash: {
    type: String,
    required: true,
    // select: false is removed so the server can see the plain text
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'ultimate'],
    default: 'free'
  },
  discordId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null }
});

// Never expose password hash in JSON responses (frontend safety)
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

userSchema.methods.verifyPassword = async function(password) {
  console.log(`[MODEL] Comparing entered: "${password}" with stored: "${this.passwordHash}"`);
  // Simple string comparison for plain text
  return password === this.passwordHash;
};

// Kept for compatibility but returns plain text
userSchema.statics.hashPassword = async function(password) {
  return password; 
};

// ===========================
// SERVER MODEL
// ===========================
const serverSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 64
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'ultimate'],
    required: true
  },
  type: {
    type: String,
    enum: ['vanilla', 'paper', 'spigot', 'forge', 'fabric', 'bungeecord', 'waterfall', 'purpur'],
    default: 'paper'
  },
  version: { type: String, default: '1.21.4' },
  region: { type: String, default: 'us-east' },
  maxPlayers: { type: Number, default: 20, min: 1, max: 1000 },
  difficulty: { type: String, enum: ['peaceful','easy','normal','hard'], default: 'normal' },
  gamemode: { type: String, enum: ['survival','creative','adventure','spectator'], default: 'survival' },
  notes: { type: String, maxlength: 1000, default: '' },
  status: {
    type: String,
    enum: ['pending', 'online', 'offline', 'suspended'],
    default: 'pending'
  },
  ip: { type: String, default: null },
  port: { type: Number, default: null },
  ram: { type: String, default: '2GB' },
  storage: { type: String, default: '10GB SSD' },
  createdAt: { type: Date, default: Date.now }
});

serverSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
const Server = mongoose.model('Server', serverSchema);

module.exports = { User, Server };
// ===========================
// Guder — SERVER ROUTES
// ===========================
const express = require('express');
const router = express.Router();
const { Server, User } = require('../db/models');

const PLAN_RAM = { free: '2GB', pro: '4GB', ultimate: '8GB' };
const PLAN_STORAGE = { free: '10GB SSD', pro: '20GB SSD', ultimate: 'Unlimited' };
const PLAN_BACKUPS = { free: 1, pro: 2, ultimate: 999 };

// Sanitize input
function sanitize(str, max = 64) {
  return typeof str === 'string' ? str.trim().slice(0, max) : '';
}

// ===========================
// GET /api/servers — list user's servers
// ===========================
router.get('/', async (req, res) => {
  try {
    const servers = await Server.find({ owner: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(servers);
  } catch (err) {
    console.error('[SERVERS] List error:', err.message);
    res.status(500).json({ error: 'Failed to load servers.' });
  }
});

// ===========================
// POST /api/servers — create a server
// ===========================
router.post('/', async (req, res) => {
  try {
    const { name, plan, type, version, region, maxPlayers, difficulty, gamemode, notes } = req.body;

    // Validate required
    if (!name || !plan) {
      return res.status(400).json({ error: 'Name and plan are required.' });
    }

    const validPlans = ['free', 'pro', 'ultimate'];
    const validTypes = ['vanilla','paper','spigot','forge','fabric','bungeecord','waterfall','purpur'];
    const validVersions = ['1.21.4','1.21.3','1.21.1','1.20.6','1.20.4','1.20.1','1.19.4','1.18.2','1.17.1','1.16.5','1.12.2','1.8.9'];
    const validRegions = ['us-east','us-west','eu-west','eu-central','ap-singapore'];
    const validDiff = ['peaceful','easy','normal','hard'];
    const validGamemodes = ['survival','creative','adventure','spectator'];

    if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });
    if (type && !validTypes.includes(type)) return res.status(400).json({ error: 'Invalid server type.' });
    if (version && !validVersions.includes(version)) return res.status(400).json({ error: 'Invalid version.' });
    if (region && !validRegions.includes(region)) return res.status(400).json({ error: 'Invalid region.' });
    if (difficulty && !validDiff.includes(difficulty)) return res.status(400).json({ error: 'Invalid difficulty.' });
    if (gamemode && !validGamemodes.includes(gamemode)) return res.status(400).json({ error: 'Invalid gamemode.' });

    // Check free server limit (only 1 per account)
    if (plan === 'free') {
      const existingFree = await Server.findOne({ owner: req.user.userId, plan: 'free' });
      if (existingFree) {
        return res.status(400).json({ error: 'You already have a free server. Only 1 free server per account.' });
      }
    }

    const maxPlayersInt = Math.min(Math.max(parseInt(maxPlayers) || 20, 1), 1000);

    const server = new Server({
      owner: req.user.userId,
      name: sanitize(name),
      plan,
      type: type || 'paper',
      version: version || '1.21.4',
      region: region || 'us-east',
      maxPlayers: maxPlayersInt,
      difficulty: difficulty || 'normal',
      gamemode: gamemode || 'survival',
      notes: sanitize(notes || '', 1000),
      status: 'pending',
      ram: PLAN_RAM[plan],
      storage: PLAN_STORAGE[plan]
    });

    await server.save();
    res.status(201).json(server);
  } catch (err) {
    console.error('[SERVERS] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create server.' });
  }
});

// ===========================
// GET /api/servers/:id — get a specific server
// ===========================
router.get('/:id', async (req, res) => {
  try {
    const server = await Server.findOne({ _id: req.params.id, owner: req.user.userId }).lean();
    if (!server) return res.status(404).json({ error: 'Server not found.' });
    res.json(server);
  } catch (err) {
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ===========================
// POST /api/servers/:id/action — start/stop/restart
// ===========================
router.post('/:id/action', async (req, res) => {
  try {
    const { action } = req.body;
    if (!['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const server = await Server.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!server) return res.status(404).json({ error: 'Server not found.' });

    if (server.status === 'pending') {
      return res.status(400).json({ error: 'Server is still being set up.' });
    }

    // In a real implementation, this would call your hosting infrastructure API
    // For now we update status accordingly
    const statusMap = { start: 'online', stop: 'offline', restart: 'online' };
    server.status = statusMap[action];
    await server.save();

    res.json({ message: `Server ${action} successful.`, status: server.status });
  } catch (err) {
    console.error('[SERVERS] Action error:', err.message);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ===========================
// POST /api/servers/:id/console — send a console command
// ===========================
router.post('/:id/console', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== 'string' || command.length > 256) {
      return res.status(400).json({ error: 'Invalid command.' });
    }

    const server = await Server.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!server) return res.status(404).json({ error: 'Server not found.' });

    if (server.status !== 'online') {
      return res.status(400).json({ error: 'Server is not online.' });
    }

    // In production: forward command to your hosting agent / RCON
    res.json({ output: `Command '${command}' sent to server.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ===========================
// POST /api/servers/:id/backup — create backup
// ===========================
router.post('/:id/backup', async (req, res) => {
  try {
    const server = await Server.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!server) return res.status(404).json({ error: 'Server not found.' });

    const maxBackups = PLAN_BACKUPS[server.plan] || 1;
    // In production: check current backup count and trigger backup job

    res.json({ message: `Backup initiated. Max backups for your plan: ${maxBackups}.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ===========================
// DELETE /api/servers/:id — delete a server
// ===========================
router.delete('/:id', async (req, res) => {
  try {
    const server = await Server.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!server) return res.status(404).json({ error: 'Server not found.' });
    res.json({ message: 'Server deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error.' });
  }
});

module.exports = router;

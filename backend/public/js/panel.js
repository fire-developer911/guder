// ===========================
// Guder — PANEL JS
// ===========================

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1504000795761315891/U8A4yjxOFU840FbY0bAjdgVrjpC32XnwCDF2PKLBKGCWg3Zbp0geCkNeLtRMWy4CjJeZ';

let currentUser = null;
let servers = [];
let activeServerId = null;
let selectedPlan = 'free';

// ===========================
// INIT
// ===========================
async function init() {
  const session = getSession();
  if (!session) {
    window.location.href = '/';
    return;
  }
  currentUser = session;
  updateSidebarUser();
  await loadServers();
}

function getSession() {
  try {
    const s = sessionStorage.getItem('Guder_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function updateSidebarUser() {
  if (!currentUser) return;
  const avatarEl = document.getElementById('sidebarAvatar');
  const nameEl = document.getElementById('sidebarUsername');
  const planEl = document.getElementById('sidebarPlan');
  if (avatarEl) avatarEl.textContent = currentUser.username[0].toUpperCase();
  if (nameEl) nameEl.textContent = currentUser.username;
  if (planEl) planEl.textContent = (currentUser.plan || 'free').toUpperCase() + ' PLAN';

  // Update stats
  const statPlan = document.getElementById('statPlan');
  if (statPlan) statPlan.textContent = (currentUser.plan || 'Free').charAt(0).toUpperCase() + (currentUser.plan || 'free').slice(1);
}

// ===========================
// SERVERS
// ===========================
async function loadServers() {
  try {
    const res = await apiFetch('/api/servers');
    if (res.ok) {
      servers = await res.json();
      renderServers();
      updateStats();
    }
  } catch (err) {
    console.error('Failed to load servers:', err);
    showToast('Failed to load servers', 'error');
  }
}

function updateStats() {
  const total = servers.length;
  const online = servers.filter(s => s.status === 'online').length;
  const hasFreeServer = servers.some(s => s.plan === 'free');

  const statTotal = document.getElementById('statTotal');
  const statOnline = document.getElementById('statOnline');
  const statFreeSlots = document.getElementById('statFreeSlots');

  if (statTotal) statTotal.textContent = total;
  if (statOnline) statOnline.textContent = online;
  if (statFreeSlots) statFreeSlots.textContent = hasFreeServer ? '0' : '1';
}

function renderServers() {
  const grid = document.getElementById('serversGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (servers.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:40px 0;font-family:var(--font-display);">No servers yet. Create your first one below!</div>';
    return;
  }

  servers.forEach(srv => {
    const card = document.createElement('div');
    card.className = 'server-card';
    const statusClass = srv.status === 'online' ? 'online' : srv.status === 'pending' ? 'pending' : 'offline';
    const statusLabel = srv.status.charAt(0).toUpperCase() + srv.status.slice(1);
    const planBadge = srv.plan === 'ultimate' ? '⭐' : srv.plan === 'pro' ? '💎' : '🆓';

    card.innerHTML = `
      <div class="server-card-header">
        <div class="server-card-info">
          <div class="server-card-name">${escHtml(srv.name)} ${planBadge}</div>
          <div class="server-card-ip">${escHtml(srv.ip || 'Pending assignment...')}</div>
        </div>
        <div class="server-status ${statusClass}">
          <div class="status-indicator"></div>
          ${statusLabel}
        </div>
      </div>
      <div class="server-card-stats">
        <div class="server-mini-stat">
          <div class="server-mini-label">TYPE</div>
          <div class="server-mini-value">${escHtml(srv.type || 'Paper')}</div>
        </div>
        <div class="server-mini-stat">
          <div class="server-mini-label">VERSION</div>
          <div class="server-mini-value">${escHtml(srv.version || '1.21.4')}</div>
        </div>
        <div class="server-mini-stat">
          <div class="server-mini-label">RAM</div>
          <div class="server-mini-value">${escHtml(srv.ram || '2GB')}</div>
        </div>
      </div>
      <div class="server-card-actions">
        <button class="btn-sm btn-sm-primary" onclick="openServer('${srv._id}')">Manage</button>
        <button class="btn-sm btn-sm-ghost" onclick="copyIp('${escHtml(srv.ip || '')}')">Copy IP</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openServer(serverId) {
  activeServerId = serverId;
  const srv = servers.find(s => s._id === serverId);
  if (!srv) return;

  // Show server sub-nav
  document.getElementById('server-sub-nav').style.display = 'block';
  const nameEl = document.getElementById('sub-server-name');
  if (nameEl) nameEl.textContent = srv.name.toUpperCase().slice(0, 12);

  // Update console
  document.getElementById('consoleServerName').textContent = srv.name + ' — console';
  document.getElementById('consoleServerStatus').textContent = srv.status.charAt(0).toUpperCase() + srv.status.slice(1);
  document.getElementById('consoleServerStatus').style.color = srv.status === 'online' ? 'var(--green)' : srv.status === 'pending' ? 'var(--gold)' : 'var(--red)';

  loadConsole(srv);
  loadFiles(srv);
  loadBackups(srv);
  loadUsers(srv);

  switchTab('console');
}

function backToServers() {
  activeServerId = null;
  document.getElementById('server-sub-nav').style.display = 'none';
  switchTab('servers');
}

// ===========================
// TABS
// ===========================
window.switchTab = function(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  const tabEl = document.getElementById('tab-' + tab);
  const btnEl = document.getElementById('tab-btn-' + tab);
  if (tabEl) tabEl.classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  const titles = { servers: 'My Servers', console: 'Console', files: 'File Manager', backups: 'Backups', users: 'Users' };
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle) topbarTitle.textContent = titles[tab] || 'Panel';

  const srv = servers.find(s => s._id === activeServerId);
  const breadcrumb = document.getElementById('topbarBreadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = srv
      ? `Guder / Servers / <span>${escHtml(srv.name)}</span> / <span>${titles[tab]}</span>`
      : `Guder / <span>${titles[tab]}</span>`;
  }
};

// ===========================
// CONSOLE
// ===========================
function loadConsole(srv) {
  const output = document.getElementById('consoleOutput');
  if (!output) return;

  const sampleLogs = [
    { type: 'info', msg: `Starting ${srv.name} (${srv.type} ${srv.version})...` },
    { type: 'info', msg: 'Loading properties...' },
    { type: 'success', msg: 'Server listening on port 25565' },
    { type: 'info', msg: 'Preparing level "world"' },
    { type: 'info', msg: 'Preparing start region for dimension minecraft:overworld' },
    { type: 'success', msg: `Done! For help, type "help". Server is ${srv.status}.` },
  ];

  if (srv.status === 'pending') {
    output.innerHTML = `<div class="log-line"><span class="log-time">[--:--:--]</span><span class="log-warn">[PENDING] Your server is being set up by our team. This usually takes 1-2 business days.</span></div>`;
    return;
  }

  output.innerHTML = sampleLogs.map((log, i) => {
    const t = new Date(); t.setMinutes(t.getMinutes() - (sampleLogs.length - i) * 2);
    const time = t.toTimeString().slice(0,8);
    return `<div class="log-line"><span class="log-time">[${time}]</span><span class="log-${log.type}">[${log.type.toUpperCase()}] ${escHtml(log.msg)}</span></div>`;
  }).join('');
  output.scrollTop = output.scrollHeight;
}

document.getElementById('consoleInput')?.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const input = e.target;
  const cmd = input.value.trim();
  if (!cmd) return;
  input.value = '';

  appendLog('info', `> ${cmd}`);

  if (!activeServerId) {
    appendLog('error', 'No server selected.');
    return;
  }

  try {
    const res = await apiFetch(`/api/servers/${activeServerId}/console`, {
      method: 'POST',
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    if (data.output) appendLog('info', data.output);
    else appendLog('warn', 'Command sent (no output returned).');
  } catch {
    appendLog('error', 'Failed to send command.');
  }
});

function appendLog(type, msg) {
  const output = document.getElementById('consoleOutput');
  if (!output) return;
  const t = new Date().toTimeString().slice(0, 8);
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="log-time">[${t}]</span><span class="log-${type}">${escHtml(msg)}</span>`;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

window.serverAction = async function(action) {
  if (!activeServerId) { showToast('No server selected', 'error'); return; }
  try {
    const res = await apiFetch(`/api/servers/${activeServerId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    showToast(data.message || `Server ${action} sent`, 'success');
    appendLog('info', `Action: ${action} — ${data.message || 'OK'}`);
  } catch {
    showToast('Failed to send action', 'error');
  }
};

// ===========================
// FILES
// ===========================
function loadFiles(srv) {
  const tbody = document.getElementById('filesBody');
  if (!tbody) return;

  if (srv.status === 'pending') {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:40px;">Server is being set up. Files available soon.</td></tr>';
    return;
  }

  const sampleFiles = [
    { icon: '📄', name: 'server.jar', size: '38.2 MB', date: '2025-06-10', type: 'file' },
    { icon: '⚙️', name: 'server.properties', size: '2.1 KB', date: '2025-06-10', type: 'file' },
    { icon: '📄', name: 'eula.txt', size: '0.4 KB', date: '2025-06-10', type: 'file' },
    { icon: '📁', name: 'plugins', size: '—', date: '2025-06-09', type: 'folder' },
    { icon: '📁', name: 'world', size: '—', date: '2025-06-11', type: 'folder' },
    { icon: '📁', name: 'logs', size: '—', date: '2025-06-11', type: 'folder' },
    { icon: '📄', name: 'ops.json', size: '0.8 KB', date: '2025-06-10', type: 'file' },
    { icon: '📄', name: 'banned-players.json', size: '0.2 KB', date: '2025-06-10', type: 'file' },
  ];

  tbody.innerHTML = sampleFiles.map(f => `
    <tr>
      <td><span class="file-icon">${f.icon}</span><span class="file-name">${escHtml(f.name)}</span></td>
      <td class="file-size">${f.size}</td>
      <td class="file-date">${f.date}</td>
      <td>
        <div style="display:flex;gap:6px;">
          ${f.type === 'file' ? `<button class="btn-sm btn-sm-ghost" style="padding:4px 10px;font-size:12px;" onclick="showToast('Download started','success')">↓</button>` : ''}
          <button class="btn-sm btn-sm-danger" style="padding:4px 10px;font-size:12px;" onclick="showToast('Deleted','success')">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===========================
// BACKUPS
// ===========================
function loadBackups(srv) {
  const list = document.getElementById('backupList');
  if (!list) return;

  const planBackups = { free: 1, pro: 2, ultimate: 999 };
  const maxBackups = planBackups[srv.plan] || 1;

  if (srv.status === 'pending') {
    list.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:60px;">Server is being set up.</div>';
    return;
  }

  const sampleBackups = [
    { name: 'auto_backup_20250611', size: '234 MB', date: 'Jun 11, 2025 03:00' },
    { name: 'auto_backup_20250610', size: '231 MB', date: 'Jun 10, 2025 03:00' },
  ].slice(0, maxBackups);

  if (sampleBackups.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:60px;">No backups yet. Create your first one!</div>';
    return;
  }

  list.innerHTML = sampleBackups.map(b => `
    <div class="backup-item">
      <div class="backup-icon">💾</div>
      <div class="backup-info">
        <div class="backup-name">${escHtml(b.name)}</div>
        <div class="backup-meta">${b.size} · Created ${b.date}</div>
      </div>
      <div class="backup-actions">
        <button class="btn-sm btn-sm-primary" style="padding:8px 14px;" onclick="showToast('Restore started','success')">Restore</button>
        <button class="btn-sm btn-sm-ghost" style="padding:8px 14px;" onclick="showToast('Download started','success')">↓</button>
        <button class="btn-sm btn-sm-danger" style="padding:8px 14px;" onclick="showToast('Backup deleted','success')">✕</button>
      </div>
    </div>
  `).join('');
}

window.createBackup = async function() {
  if (!activeServerId) { showToast('Select a server first', 'error'); return; }
  showToast('Backup creation started...', 'success');
  try {
    await apiFetch(`/api/servers/${activeServerId}/backup`, { method: 'POST' });
  } catch {}
};

// ===========================
// USERS
// ===========================
function loadUsers(srv) {
  const list = document.getElementById('usersList');
  if (!list) return;
  list.innerHTML = `
    <div class="user-item">
      <div class="user-avatar">${currentUser.username[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${escHtml(currentUser.username)}</div>
        <span class="user-role-badge role-owner">Owner</span>
      </div>
    </div>
    <div style="text-align:center;color:var(--text-dim);padding:20px;font-size:14px;">
      To add sub-users to your server, contact our Discord support.
    </div>
  `;
}

// ===========================
// CREATE SERVER
// ===========================
window.openCreateModal = function() {
  const hasFreeServer = servers.some(s => s.plan === 'free');
  const hint = document.getElementById('freeLimitHint');

  // Reset plan selection
  selectPlanByName('free');

  if (hasFreeServer) {
    hint.style.display = 'block';
    // Auto-select pro if free is used
    selectPlanByName('pro');
    // Disable free option
    const freeOpt = document.querySelector('[data-plan="free"]');
    if (freeOpt) {
      freeOpt.style.opacity = '0.4';
      freeOpt.style.pointerEvents = 'none';
    }
  } else {
    if (hint) hint.style.display = 'none';
    const freeOpt = document.querySelector('[data-plan="free"]');
    if (freeOpt) { freeOpt.style.opacity = '1'; freeOpt.style.pointerEvents = 'auto'; }
  }

  document.getElementById('createModal').classList.add('show');
};

window.closeCreateModal = function() {
  document.getElementById('createModal').classList.remove('show');
};

window.selectPlan = function(el) {
  document.querySelectorAll('.plan-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPlan = el.dataset.plan;
};

function selectPlanByName(planName) {
  document.querySelectorAll('.plan-opt').forEach(o => {
    o.classList.toggle('selected', o.dataset.plan === planName);
  });
  selectedPlan = planName;
}

window.submitCreateServer = async function() {
  const name = document.getElementById('newServerName')?.value.trim();
  const type = document.getElementById('newServerType')?.value;
  const version = document.getElementById('newServerVersion')?.value;
  const region = document.getElementById('newServerRegion')?.value;
  const maxPlayers = document.getElementById('newServerMaxPlayers')?.value;
  const difficulty = document.getElementById('newServerDifficulty')?.value;
  const gamemode = document.getElementById('newServerGamemode')?.value;
  const notes = document.getElementById('newServerNotes')?.value.trim();

  if (!name) { showToast('Server name is required', 'error'); return; }

  const hasFreeServer = servers.some(s => s.plan === 'free');
  if (selectedPlan === 'free' && hasFreeServer) {
    showToast('You already have a free server', 'error'); return;
  }

  const btn = document.getElementById('createServerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

  const payload = { name, plan: selectedPlan, type, version, region, maxPlayers, difficulty, gamemode, notes };

  try {
    const res = await apiFetch('/api/servers', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();

    if (res.ok) {
      // Send to Discord webhook
      await sendWebhook({ ...payload, owner: currentUser.username, serverId: data._id });

      closeCreateModal();
      showToast('Server created! Ready in 1–2 business days 🎉', 'success');
      await loadServers();
    } else {
      showToast(data.error || 'Failed to create server', 'error');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Server'; }
  }
};

async function sendWebhook(data) {
  const ramMap = { free: '2GB', pro: '4GB', ultimate: '8GB' };
  const storageMap = { free: '10GB SSD', pro: '20GB SSD', ultimate: 'Unlimited' };

  const embed = {
    embeds: [{
      title: '🖥️ New Server Request',
      color: data.plan === 'ultimate' ? 0xf59e0b : data.plan === 'pro' ? 0x3b82f6 : 0x10b981,
      fields: [
        { name: '👤 Owner', value: data.owner, inline: true },
        { name: '📋 Server Name', value: data.name, inline: true },
        { name: '💎 Plan', value: data.plan.toUpperCase(), inline: true },
        { name: '⚙️ Type', value: data.type, inline: true },
        { name: '🎮 Version', value: data.version, inline: true },
        { name: '🌍 Region', value: data.region, inline: true },
        { name: '🧠 RAM', value: ramMap[data.plan] || '2GB', inline: true },
        { name: '💾 Storage', value: storageMap[data.plan] || '10GB', inline: true },
        { name: '👥 Max Players', value: data.maxPlayers || '20', inline: true },
        { name: '⚔️ Difficulty', value: data.difficulty, inline: true },
        { name: '🕹️ Gamemode', value: data.gamemode, inline: true },
        { name: '🆔 Server ID', value: data.serverId || 'N/A', inline: true },
        ...(data.notes ? [{ name: '📝 Notes', value: data.notes, inline: false }] : [])
      ],
      footer: { text: 'Guder Hosting Panel' },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
  } catch (err) {
    console.error('Webhook failed:', err);
  }
}

// ===========================
// UTILITIES
// ===========================
async function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
}

window.doLogout = async function() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
  sessionStorage.removeItem('Guder_session');
  window.location.href = '/';
};

window.copyIp = function(ip) {
  if (!ip) { showToast('IP not assigned yet', 'error'); return; }
  navigator.clipboard.writeText(ip).then(() => showToast('IP copied!', 'success'));
};

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${escHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
};

// Close create modal on backdrop
document.getElementById('createModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('createModal')) closeCreateModal();
});

// Init
init();

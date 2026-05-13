// ===========================
// Guder — MAIN JS
// ===========================

// PARTICLES
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 15) + 's';
    p.style.animationDelay = (Math.random() * 15) + 's';
    p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
    const colors = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'];
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(p);
  }
})();

// SIDE MENU
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const sideBackdrop = document.getElementById('sideBackdrop');

menuToggle?.addEventListener('click', () => {
  sideMenu.classList.toggle('open');
  sideBackdrop.classList.toggle('show');
});

function closeSideMenu() {
  sideMenu?.classList.remove('open');
  sideBackdrop?.classList.remove('show');
}

// SESSION CHECK
function getSession() {
  try {
    const s = sessionStorage.getItem('Guder_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function updateNavForUser(user) {
  const sideNav = document.getElementById('sideNav');
  const sideProfileArea = document.getElementById('sideProfileArea');
  if (!sideNav || !sideProfileArea) return;

  // Update profile
  const avatarEl = sideProfileArea.querySelector('.side-avatar');
  const nameEl = sideProfileArea.querySelector('.side-name');
  const roleEl = sideProfileArea.querySelector('.side-role');
  if (avatarEl) avatarEl.textContent = user.username[0].toUpperCase();
  if (nameEl) nameEl.textContent = user.username;
  if (roleEl) roleEl.textContent = user.plan ? user.plan.toUpperCase() + ' Plan' : 'Free Plan';

  // Replace nav with logged-in version
  sideNav.innerHTML = `
    <a href="/panel.html" class="side-link"><span>🖥️</span> Panel</a>
    <a href="/panel.html" class="side-link"><span>🗄️</span> My Servers</a>
    <div class="side-divider"></div>
    <a href="#" class="side-link" onclick="doLogout()"><span>🚪</span> Logout</a>
  `;

  // Update nav buttons
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  if (loginBtn) { loginBtn.textContent = 'Panel'; loginBtn.onclick = () => window.location.href = '/panel.html'; }
  if (registerBtn) { registerBtn.textContent = user.username; registerBtn.onclick = () => window.location.href = '/panel.html'; }
}

window.doLogout = function() {
  sessionStorage.removeItem('Guder_session');
  window.location.reload();
};

// Check on load
const session = getSession();
if (session) updateNavForUser(session);

// MODALS
function openLogin() {
  closeModals();
  document.getElementById('loginModal')?.classList.add('show');
  closeSideMenu();
}
function openRegister() {
  closeModals();
  document.getElementById('registerModal')?.classList.add('show');
  closeSideMenu();
}
function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}

window.openLogin = openLogin;
window.openRegister = openRegister;
window.closeModals = closeModals;

document.getElementById('loginBtn')?.addEventListener('click', openLogin);
document.getElementById('registerBtn')?.addEventListener('click', openRegister);

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModals();
  });
});

// LOGIN
window.doLogin = async function() {
  const username = document.getElementById('loginUsername')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginSubmit');

  if (!username || !password) {
    if (errorEl) errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  if (errorEl) errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

	// Check for data.username, NOT data.token
	if (res.ok && data.username) { 
		sessionStorage.setItem('Guder_session', JSON.stringify({ 
			username: data.username, 
			plan: data.plan 
		}));
		window.location.href = '/panel.html';
	} else {
      if (errorEl) errorEl.textContent = data.error || 'Invalid credentials.';
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Network error. Please try again.';
  } finally {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
  }
};

// Enter key on login
document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') window.doLogin();
});

// FAQ
window.toggleFaq = function(el) {
  const item = el.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
};

// SCROLL ANIMATIONS
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.plan-card, .feature-card, .faq-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
document.getElementById('loginSubmit')?.addEventListener('click', window.doLogin);

// This waits for the page to load, then connects the buttons to their functions
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Fix the Backdrop (Side Menu)
    const backdrop = document.getElementById('sideBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            console.log("Backdrop clicked"); // Debug log
            closeSideMenu(); 
        });
    }

    // 2. Fix the Modal Close Button (The X)
    const modalClose = document.getElementById('modalCloseBtn');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            console.log("Close button clicked"); // Debug log
            closeModals();
        });
    }

    // 3. Fix the Login Button
    const loginSubmit = document.getElementById('loginSubmit');
    if (loginSubmit) {
        loginSubmit.addEventListener('click', (e) => {
            e.preventDefault(); // Prevents page refresh
            window.doLogin();
        });
    }
});
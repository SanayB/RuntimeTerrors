// popup.js — Handles setup screen + live monitor screen

const REFRESH_INTERVAL = 3000; // ms

// ---------------------------------------------------------------------------
// Identity Management
// ---------------------------------------------------------------------------

function loadAndShowScreen() {
    chrome.storage.sync.get(['employeeEmail', 'department', 'employeeId'], (result) => {
        if (result.employeeEmail && result.department) {
            showMonitorScreen(result);
        } else {
            showSetupScreen();
        }
    });
}

function showSetupScreen() {
    document.getElementById('setup-screen').style.display   = 'block';
    document.getElementById('monitor-screen').style.display = 'none';
}

function showMonitorScreen(identity) {
    document.getElementById('setup-screen').style.display   = 'none';
    document.getElementById('monitor-screen').style.display = 'block';

    document.getElementById('identity-email').textContent = identity.employeeEmail || '—';
    document.getElementById('identity-dept').textContent  = identity.department    || '—';

    startMonitor();
}

// Save identity from setup form
document.getElementById('setup-save-btn').addEventListener('click', () => {
    const email = document.getElementById('setup-email').value.trim();
    const dept  = document.getElementById('setup-dept').value.trim();

    if (!email.includes('@') || !email.includes('.')) {
        document.getElementById('setup-error').style.display = 'block';
        return;
    }

    // Auto-generate employee ID from email prefix
    const empId = 'EMP-' + email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

    chrome.storage.sync.set({
        employeeEmail: email,
        department:    dept || 'General',
        employeeId:    empId
    }, () => {
        showMonitorScreen({ employeeEmail: email, department: dept || 'General' });
    });
});

// "Change" button — go back to setup
document.getElementById('change-identity-btn').addEventListener('click', () => {
    // Pre-fill with current values
    chrome.storage.sync.get(['employeeEmail', 'department'], (result) => {
        document.getElementById('setup-email').value = result.employeeEmail || '';
        document.getElementById('setup-dept').value  = result.department    || '';
    });
    showSetupScreen();
});

// ---------------------------------------------------------------------------
// Monitor Screen — Live scan data from background.js
// ---------------------------------------------------------------------------

let monitorTimer = null;

function startMonitor() {
    updateDisplay(); // immediate first load
    if (!monitorTimer) {
        monitorTimer = setInterval(updateDisplay, REFRESH_INTERVAL);
    }
}

function updateDisplay() {
    chrome.runtime.sendMessage({ action: "get_latest_analysis" }, (data) => {
        if (!data) return;

        // Domain
        const domainEl = document.getElementById('current-domain');
        if (domainEl) domainEl.textContent = data.domain || 'Scanning...';

        // Risk badge
        const riskLevel = data.riskLevel || 'PENDING';
        const badgeEl   = document.getElementById('risk-badge');
        const riskEl    = document.getElementById('risk-level');
        if (riskEl) riskEl.textContent = riskLevel;
        if (badgeEl) {
            badgeEl.className = 'risk-badge ' + riskLevel.toLowerCase();
        }

        // Stats
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('ai-status',       data.isAi       ? '🤖 AI Tool'  : '—');
        set('category-status', data.category    || '—');
        set('https-status',    data.https       ? '🔒 Secure'   : '⚠️ Insecure');
        set('cookie-status',   data.cookieCount != null ? data.cookieCount : '—');

        // AI card highlight
        const aiCard = document.getElementById('card-ai');
        if (aiCard) aiCard.style.borderColor = data.isAi ? '#f39c12' : '';

        // Permissions
        const permClass = (val) => val ? 'badge danger' : 'badge safe';
        const permText  = (val) => val ? 'Granted' : 'Blocked';

        const camEl   = document.getElementById('perm-camera');
        const micEl   = document.getElementById('perm-mic');
        const notifEl = document.getElementById('perm-notif');

        if (camEl)   { camEl.className   = permClass(data.hasCameraAccess);   camEl.textContent   = permText(data.hasCameraAccess); }
        if (micEl)   { micEl.className   = permClass(data.hasMicAccess);      micEl.textContent   = permText(data.hasMicAccess); }
        if (notifEl) { notifEl.className = 'badge safe'; notifEl.textContent = 'Blocked'; }

        // Captured login email
        const loginCard  = document.getElementById('login-info-card');
        const loginEmail = document.getElementById('login-email-display');
        if (data.loginEmail && data.loginEmail.includes('@')) {
            if (loginCard)  loginCard.style.display  = 'block';
            if (loginEmail) loginEmail.textContent    = data.loginEmail;
        } else {
            if (loginCard)  loginCard.style.display  = 'none';
        }
    });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
loadAndShowScreen();

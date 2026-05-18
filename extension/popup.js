// popup.js

document.addEventListener('DOMContentLoaded', () => {
    fetchLatestAnalysis();
    // Auto-refresh popup every 3 seconds while open
    setInterval(fetchLatestAnalysis, 3000);
});

function fetchLatestAnalysis() {
    chrome.runtime.sendMessage({ action: "get_latest_analysis" }, (response) => {
        if (response) {
            updateUI(response);
        } else {
            // If no immediate response, check local storage
            chrome.storage.local.get(['latestAnalysis'], function(result) {
                if (result.latestAnalysis) {
                    updateUI(result.latestAnalysis);
                } else {
                    document.getElementById('current-domain').textContent = "Navigate to a site to scan";
                }
            });
        }
    });
}

function updateUI(data) {
    if (!data) return;

    // Basic Info
    document.getElementById('current-domain').textContent = data.domain || "Unknown";
    document.getElementById('category-status').textContent = data.classification || data.category || "--";
    
    // AI Status
    const aiStatusEl = document.getElementById('ai-status');
    if (data.isAi) {
        aiStatusEl.textContent = "DETECTED";
        aiStatusEl.className = "stat-value stat-alert";
        document.getElementById('card-ai').style.borderColor = "var(--risk-high)";
    } else {
        aiStatusEl.textContent = "None";
        aiStatusEl.className = "stat-value";
        document.getElementById('card-ai').style.borderColor = "var(--border-color)";
    }

    // Connection
    document.getElementById('https-status').textContent = data.https ? "Secure (HTTPS)" : "Insecure (HTTP)";
    document.getElementById('https-status').style.color = data.https ? "var(--risk-low)" : "var(--risk-high)";
    
    // Cookies
    document.getElementById('cookie-status').textContent = `${data.cookieCount || 0} (${data.trackingCookieCount || 0} Tracking)`;

    // Permissions (check if granted)
    const perms = data.requestedPermissions || [];
    updatePermissionBadge('perm-camera', perms.includes('camera') ? 'granted' : '--');
    updatePermissionBadge('perm-mic', perms.includes('microphone') ? 'granted' : '--');
    updatePermissionBadge('perm-notif', perms.includes('notifications') ? 'granted' : '--');

    // Risk Score
    const riskBadge = document.getElementById('risk-badge');
    const riskLevel = document.getElementById('risk-level');
    
    if (data.riskLevel) {
        riskLevel.textContent = data.riskLevel;
        riskBadge.className = `risk-badge risk-${data.riskLevel.toLowerCase()}`;
    } else {
        let fallbackRisk = "LOW";
        if (data.isAi) fallbackRisk = "MEDIUM";
        if (!data.https) fallbackRisk = "HIGH";
        
        riskLevel.textContent = fallbackRisk + " (EST)";
        riskBadge.className = `risk-badge risk-${fallbackRisk.toLowerCase()}`;
    }

    // Show detected login email if available
    const loginCard = document.getElementById('login-info-card');
    const loginEmailDisplay = document.getElementById('login-email-display');
    const emailToShow = data.loginEmail || data.employeeEmail || "";
    
    if (emailToShow && emailToShow !== "demo@company.com") {
        loginCard.style.display = "block";
        loginEmailDisplay.textContent = `🔐 ${emailToShow}`;
    } else {
        loginCard.style.display = "none";
    }
}

function updatePermissionBadge(elementId, status) {
    const el = document.getElementById(elementId);
    el.textContent = status || "--";
    el.className = "badge"; // Reset class
    if (status === "granted") el.classList.add("granted");
    else if (status === "denied") el.classList.add("denied");
    else if (status === "prompt") el.classList.add("prompt");
}

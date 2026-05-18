// popup.js

document.addEventListener('DOMContentLoaded', () => {
    fetchLatestAnalysis();

    document.getElementById('refresh-btn').addEventListener('click', () => {
        // Find active tab and trigger analysis by reloading it or communicating with background
        document.getElementById('current-domain').textContent = "Scanning...";
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
                chrome.tabs.reload(tabs[0].id);
                setTimeout(fetchLatestAnalysis, 1500); // Wait a bit for the page to load
            }
        });
    });


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
                    document.getElementById('current-domain').textContent = "No data available";
                }
            });
        }
    });
}

function updateUI(data) {
    if (!data) return;

    // Basic Info
    document.getElementById('current-domain').textContent = data.domain || "Unknown";
    document.getElementById('category-status').textContent = data.category || "--";
    
    // AI Status
    const aiStatusEl = document.getElementById('ai-status');
    if (data.possible_ai_tool) {
        aiStatusEl.textContent = "DETECTED";
        aiStatusEl.className = "stat-value stat-alert";
        document.getElementById('card-ai').style.borderColor = "var(--risk-high)";
    } else {
        aiStatusEl.textContent = "None";
        aiStatusEl.className = "stat-value";
        document.getElementById('card-ai').style.borderColor = "var(--border-color)";
    }

    // Connection
    document.getElementById('https-status').textContent = data.https_enabled ? "Secure (HTTPS)" : "Insecure (HTTP)";
    document.getElementById('https-status').style.color = data.https_enabled ? "var(--risk-low)" : "var(--risk-high)";
    
    // Cookies
    const cookieCount = data.cookie_count !== undefined ? data.cookie_count : (data.cookieCount || 0);
    const secureFlag = data.secure_cookies ? 'Secure' : 'Unsecure';
    document.getElementById('cookie-status').textContent = `${cookieCount} (${secureFlag})`;

    // Permissions
    updatePermissionBadge('perm-camera', data.camera_permission);
    updatePermissionBadge('perm-mic', data.microphone_permission);
    updatePermissionBadge('perm-notif', data.notification_permission);

    // Risk Score
    const riskBadge = document.getElementById('risk-badge');
    const riskLevel = document.getElementById('risk-level');
    if (data.riskLevel) {
        const rl = data.riskLevel;
        let displayStatus = rl.toUpperCase();
        if (rl === "High" || rl === "HIGH") displayStatus = "UNAUTHORIZED SAAS";
        if (rl === "Medium" || rl === "MEDIUM") displayStatus = "SUSPICIOUS";
        if (rl === "Low" || rl === "LOW") displayStatus = "AUTHORIZED";
        
        riskLevel.textContent = displayStatus;
        riskBadge.className = `risk-badge risk-${rl.toLowerCase()}`;

        // Show score if available
        if (data.riskScore !== undefined) {
            const scoreLabel = document.getElementById('risk-score-label');
            if (scoreLabel) scoreLabel.textContent = `Score: ${data.riskScore}/100`;
        }
    } else {
        riskLevel.textContent = "PENDING...";
        riskBadge.className = `risk-badge risk-low`;
    }
}

function updatePermissionBadge(elementId, status) {
    const el = document.getElementById(elementId);
    el.textContent = status || "unknown";
    el.className = "badge"; // Reset class
    if (status === "granted") el.classList.add("granted");
    else if (status === "denied") el.classList.add("denied");
    else if (status === "prompt") el.classList.add("prompt");
}

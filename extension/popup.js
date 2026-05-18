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

    document.getElementById('download-btn').addEventListener('click', () => {
        chrome.storage.local.get(['latestAnalysis'], function(result) {
            if (result.latestAnalysis) {
                const dataStr = "--- OUTPUT FOR " + (result.latestAnalysis.url || "UNKNOWN") + " ---\n" + JSON.stringify(result.latestAnalysis, null, 2);
                const blob = new Blob([dataStr], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = "output.txt";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert("No data available to download yet! Please scan a page first.");
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
    document.getElementById('cookie-status').textContent = `${data.cookie_count} (${data.secure_cookies ? 'Secure' : 'Unsecure'})`;

    // Permissions
    updatePermissionBadge('perm-camera', data.camera_permission);
    updatePermissionBadge('perm-mic', data.microphone_permission);
    updatePermissionBadge('perm-notif', data.notification_permission);

    // Risk Score
    const riskBadge = document.getElementById('risk-badge');
    const riskLevel = document.getElementById('risk-level');
    
    if (data.risk_level) {
        riskLevel.textContent = data.risk_level;
        riskBadge.className = `risk-badge risk-${data.risk_level.toLowerCase()}`;
    } else {
        // Fallback calculation if backend hasn't responded yet
        let fallbackRisk = "LOW";
        if (data.possible_ai_tool) fallbackRisk = "MEDIUM";
        if (!data.https_enabled) fallbackRisk = "HIGH";
        
        riskLevel.textContent = fallbackRisk + " (EST)";
        riskBadge.className = `risk-badge risk-${fallbackRisk.toLowerCase()}`;
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

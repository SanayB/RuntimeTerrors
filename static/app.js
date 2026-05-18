// --- Admin Gate ---
const ADMIN_PASSWORD = "admin123";

function checkAdminPassword() {
    const input = document.getElementById('adminPassword').value;
    if (input === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminAuth', '1');
        document.getElementById('adminGate').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        fetchData();
    } else {
        document.getElementById('gateError').classList.remove('hidden');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

// Check if already authenticated this session
if (sessionStorage.getItem('adminAuth') === '1') {
    document.getElementById('adminGate').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
}

const API_BASE = "/api";

// Colors for Risk Levels
const colors = {
    "CRITICAL": "#ff4757",
    "HIGH": "#ffa502",
    "MEDIUM": "#eccc68",
    "LOW": "#2ed573"
};

let allLogs = [];
let allDetections = [];

// Init — clock starts always; data only loads after admin auth
document.addEventListener("DOMContentLoaded", () => {
    updateClock();
    setInterval(updateClock, 1000);
    // fetchData is called by the gate on success, or on page reload if already authed
    if (sessionStorage.getItem('adminAuth') === '1') {
        fetchData();
    }
});

function updateClock() {
    document.getElementById("liveClock").textContent = new Date().toLocaleTimeString();
}

async function fetchData() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) refreshBtn.textContent = 'Refreshing...';
    try {
        const [stats, domains, employees, timeline, logs, detections] = await Promise.all([
            fetch(`${API_BASE}/dashboard/stats`).then(r => r.json()),
            fetch(`${API_BASE}/dashboard/domains`).then(r => r.json()),
            fetch(`${API_BASE}/dashboard/employees`).then(r => r.json()),
            fetch(`${API_BASE}/dashboard/timeline`).then(r => r.json()),
            fetch(`${API_BASE}/dashboard`).then(r => r.json()),
            fetch(`${API_BASE}/detections`).then(r => r.json()),
        ]);

        allLogs = logs.results;
        allDetections = detections;

        renderKPIs(stats, domains, employees);
        renderAlertBanner(stats.riskLevelBreakdown.CRITICAL || 0);
        renderDonutChart(stats.riskLevelBreakdown);
        renderTimelineChart(timeline);
        renderToolsTable(domains);
        renderEmployeesTable(employees);
        renderLogTable();
        renderDetectionsTable(allDetections);

    } catch (e) {
        console.error("Failed to fetch dashboard data", e);
    } finally {
        if (refreshBtn) refreshBtn.textContent = 'Refresh Data';
    }
}

// Add auto-refresh every 30 seconds
setInterval(fetchData, 30000);

function renderKPIs(stats, domains, employees) {
    document.getElementById("kpiTotalScans").textContent = stats.totalScans;
    document.getElementById("kpiEmployees").textContent = employees.length;

    const unauthCount = domains.filter(d => d.classification !== 'approved').length;
    document.getElementById("kpiTools").textContent = unauthCount;

    document.getElementById("kpiCritical").textContent = stats.riskLevelBreakdown.CRITICAL || 0;
    document.getElementById("kpiMultiSource").textContent = stats.multiSourceHits ?? 0;
}

function renderAlertBanner(criticalCount) {
    const banner = document.getElementById("alertBanner");
    if (criticalCount > 0) {
        document.getElementById("alertText").textContent = `${criticalCount} CRITICAL risk events detected in the system.`;
        banner.classList.remove("hidden");
    } else {
        banner.classList.add("hidden");
    }
}

function getBadge(level) {
    return `<span class="badge ${level.toLowerCase()}">${level}</span>`;
}

function getScoreBar(score, level) {
    const color = colors[level] || "#ccc";
    return `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div class="score-bar">
                <div class="score-fill" style="width: ${score}%; background: ${color}"></div>
            </div>
            <span style="font-size: 0.8rem">${score}</span>
        </div>
    `;
}

function renderToolsTable(domains) {
    const tbody = document.querySelector("#toolsTable tbody");
    tbody.innerHTML = domains.map(d => `
        <tr>
            <td><strong>${d.domain}</strong></td>
            <td><span class="badge ${d.classification}">${d.classification.toUpperCase()}</span></td>
            <td>${getScoreBar(d.avgRiskScore, d.highestRiskLevel)}</td>
            <td>${getBadge(d.highestRiskLevel)}</td>
            <td>${d.affectedEmployees}</td>
        </tr>
    `).join("");
}

function renderEmployeesTable(employees) {
    const tbody = document.querySelector("#employeesTable tbody");
    tbody.innerHTML = employees.map(e => `
        <tr>
            <td>${e.employeeEmail}</td>
            <td>${e.department || 'N/A'}</td>
            <td>${e.totalScans}</td>
            <td>${getBadge(e.highestRiskLevel)}</td>
            <td class="truncate" title="${e.uniqueDomains.join(', ')}">${e.uniqueDomains.join(', ')}</td>
        </tr>
    `).join("");
}

function renderLogTable() {
    const term = document.getElementById("logSearch").value.toLowerCase();
    const tbody = document.querySelector("#logTable tbody");
    
    const filtered = allLogs.filter(log => 
        log.domain.toLowerCase().includes(term) || 
        log.employeeEmail.toLowerCase().includes(term) ||
        log.riskLevel.toLowerCase().includes(term)
    );

    tbody.innerHTML = filtered.map(log => `
        <tr onclick='openModal(${JSON.stringify(log).replace(/'/g, "&#39;")})'>
            <td style="color:var(--text-muted); font-size:0.8rem">${new Date(log.scannedAt).toLocaleString()}</td>
            <td>${log.employeeEmail}</td>
            <td><strong>${log.domain}</strong></td>
            <td>${log.riskScore}</td>
            <td>${getBadge(log.riskLevel)}</td>
        </tr>
    `).join("");
}

// --- Unified Detections Table ---
function renderDetectionsTable(detections) {
    const tbody = document.querySelector("#detectionsTable tbody");
    if (!tbody) return;
    if (!detections || detections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">No detections yet. Run the DNS/SSO simulators to populate.</td></tr>`;
        return;
    }
    tbody.innerHTML = detections.map(d => {
        const sourceBadges = (d.sources || []).map(s =>
            `<span class="source-badge ${s}">${s.toUpperCase()}</span>`
        ).join("");
        const tool = d.saasToolName ? `<strong>${d.saasToolName}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${d.domain}</span>` : `<strong>${d.domain}</strong>`;
        const lastSeen = d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—";
        return `
        <tr>
            <td>${tool}</td>
            <td style="font-size:0.85rem">${d.userEmail || "—"}</td>
            <td>${d.department || "—"}</td>
            <td>${sourceBadges}</td>
            <td>${getScoreBar(d.combinedRiskScore, d.combinedRiskLevel)}</td>
            <td>${getBadge(d.combinedRiskLevel)}</td>
            <td style="color:var(--text-muted);font-size:0.8rem">${lastSeen}</td>
        </tr>`;
    }).join("");
}

async function applySourceFilter() {
    const filter = document.getElementById("sourceFilter").value;
    const url = filter ? `${API_BASE}/detections?source=${encodeURIComponent(filter)}` : `${API_BASE}/detections`;
    try {
        const data = await fetch(url).then(r => r.json());
        renderDetectionsTable(data);
    } catch (e) {
        console.error("Failed to filter detections", e);
    }
}

// Modal Logic
window.openModal = function(log) {
    document.getElementById("mEmail").textContent = log.employeeEmail;
    document.getElementById("mDept").textContent = log.department || 'N/A';
    document.getElementById("mId").textContent = log.employeeId;
    
    document.getElementById("mDomain").textContent = log.domain;
    document.getElementById("mUrl").textContent = log.url;
    document.getElementById("mUrl").title = log.url;
    document.getElementById("mClass").innerHTML = `<span class="badge ${log.classification}">${log.classification.toUpperCase()}</span>`;
    
    document.getElementById("mScore").textContent = log.riskScore;
    document.getElementById("mScoreCircle").style.borderColor = colors[log.riskLevel] || "#333";
    document.getElementById("mScoreCircle").style.color = colors[log.riskLevel] || "white";
    
    document.getElementById("mRiskLevel").className = `badge ${log.riskLevel.toLowerCase()}`;
    document.getElementById("mRiskLevel").textContent = log.riskLevel;
    document.getElementById("mConf").textContent = log.confidenceScore;
    
    const reasonsHtml = log.reasons && log.reasons.length 
        ? log.reasons.map(r => `<li>${r}</li>`).join("") 
        : "<li>No specific risk signals flagged.</li>";
    document.getElementById("mReasonsList").innerHTML = reasonsHtml;
    
    document.getElementById("mRec").textContent = log.recommendation;
    
    document.getElementById("detailModal").classList.remove("hidden");
};

window.closeModal = function() {
    document.getElementById("detailModal").classList.add("hidden");
};


// Native Canvas Charting (No Libs)
function renderDonutChart(breakdown) {
    const canvas = document.getElementById("riskDonutChart");
    const ctx = canvas.getContext("2d");
    const W = canvas.width = 150;
    const H = canvas.height = 150;
    const CX = W/2, CY = H/2, R = 50, THICK = 25;
    
    const keys = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    let total = keys.reduce((acc, k) => acc + (breakdown[k] || 0), 0);
    if(total === 0) { breakdown["LOW"] = 1; total = 1; } // Dummy if empty
    
    ctx.clearRect(0,0,W,H);
    let startAngle = -Math.PI/2;
    
    const legend = document.getElementById("donutLegend");
    legend.innerHTML = "";
    
    keys.forEach(k => {
        const val = breakdown[k] || 0;
        if(val === 0 && total > 1) return; // skip 0s unless totally empty
        
        const sliceAngle = (val / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(CX, CY, R, startAngle, startAngle + sliceAngle);
        ctx.lineWidth = THICK;
        ctx.strokeStyle = colors[k];
        ctx.stroke();
        startAngle += sliceAngle;
        
        legend.innerHTML += `
            <div class="legend-item">
                <div class="legend-dot" style="background: ${colors[k]}"></div>
                <span>${k} (${val})</span>
            </div>
        `;
    });
}

function renderTimelineChart(timeline) {
    const canvas = document.getElementById("timelineChart");
    const ctx = canvas.getContext("2d");
    
    // Auto-resize canvas
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = canvas.width = rect.width;
    const H = canvas.height = 160;
    
    if(!timeline || timeline.length === 0) return;
    
    const maxVal = Math.max(...timeline.map(d => d.count), 5); // At least 5 for Y scale
    const PAD_X = 20, PAD_Y = 20;
    const stepX = (W - 2*PAD_X) / (timeline.length - 1 || 1);
    
    ctx.clearRect(0,0,W,H);
    
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    for(let i=0; i<3; i++) {
        let y = H - PAD_Y - (i * (H - 2*PAD_Y)/2);
        ctx.moveTo(PAD_X, y);
        ctx.lineTo(W - PAD_X, y);
    }
    ctx.stroke();
    
    // Total Line (Blue)
    ctx.beginPath();
    ctx.strokeStyle = "#00d2ff";
    ctx.lineWidth = 3;
    timeline.forEach((d, i) => {
        let x = PAD_X + (i * stepX);
        let y = H - PAD_Y - ((d.count / maxVal) * (H - 2*PAD_Y));
        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Critical Line (Red)
    ctx.beginPath();
    ctx.strokeStyle = "#ff4757";
    ctx.lineWidth = 2;
    timeline.forEach((d, i) => {
        let x = PAD_X + (i * stepX);
        let y = H - PAD_Y - ((d.criticalCount / maxVal) * (H - 2*PAD_Y));
        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

// background.js — Shadow IT Governance Extension
// Layers:
//   1. Extension scan (existing) — analyzes sites on tab load
//   2. DNS layer (NEW) — captures every domain visited via webNavigation
//   3. SSO layer (NEW) — intercepts OAuth/SAML redirects via webRequest

importScripts('utils.js');

// ---------------------------------------------------------------------------
// Identity — loaded dynamically from chrome.storage.sync (set via popup)
// No hardcoded values. Empty strings mean "not yet configured".
// ---------------------------------------------------------------------------

let IDENTITY = {
    employeeId:    "",
    employeeEmail: "",
    department:    ""
};

// Load identity once on startup and keep in sync
function loadIdentity(callback) {
    chrome.storage.sync.get(['employeeId', 'employeeEmail', 'department'], (result) => {
        IDENTITY.employeeId    = result.employeeId    || "UNKNOWN";
        IDENTITY.employeeEmail = result.employeeEmail || "unknown@corp.com";
        IDENTITY.department    = result.department    || "Unknown";
        if (callback) callback();
    });
}

// Reload identity whenever it is updated via the popup
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        loadIdentity(null);
        console.log('[Identity] Updated:', IDENTITY);
    }
});

loadIdentity(null);

const BACKEND_URL       = "http://localhost:8000";
const ANALYZE_URL       = `${BACKEND_URL}/api/analyze`;
const DNS_INGEST_URL    = `${BACKEND_URL}/api/detections/ingest/dns`;
const SSO_INGEST_URL    = `${BACKEND_URL}/api/detections/ingest/sso`;

let latestAnalysis      = {};
let capturedEmail       = "";   // Updated whenever content.js captures a real email

const TRACKING_COOKIE_PREFIXES = ['_ga', '_fbp', '_hj', 'mk_', 'hubspot', 'ajs_'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getResolvedEmail() {
    // Priority: 1. Email the user typed on the page, 2. Identity configured in popup
    return (capturedEmail && capturedEmail.includes('@'))
        ? capturedEmail
        : IDENTITY.employeeEmail;
}

function extractDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

// Known approved / internal domains — skip DNS reporting for these
const SKIP_DNS_DOMAINS = new Set([
    'localhost', '127.0.0.1', 'newtab', 'extensions', 'chrome',
    'google.com', 'accounts.google.com', 'microsoft.com', 'live.com',
    'youtube.com', 'mozilla.org', 'gstatic.com', 'googleapis.com',
    'fonts.googleapis.com', 'ajax.googleapis.com'
]);

// ---------------------------------------------------------------------------
// LAYER 2 — Live DNS Tracking via webNavigation
// Fires whenever the user commits a navigation (new domain visit).
// ---------------------------------------------------------------------------

// Buffer DNS events and flush every 5 seconds to avoid hammering the backend
let dnsBuffer = [];
let dnsFlushTimer = null;

function scheduleDnsFlush() {
    if (!dnsFlushTimer) {
        dnsFlushTimer = setTimeout(flushDnsBuffer, 5000);
    }
}

async function flushDnsBuffer() {
    dnsFlushTimer = null;
    if (dnsBuffer.length === 0) return;

    const batch = dnsBuffer.splice(0, dnsBuffer.length); // drain atomically
    try {
        await fetch(DNS_INGEST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: batch })
        });
        console.log(`[DNS Layer] Flushed ${batch.length} event(s) to backend.`);
    } catch (err) {
        console.warn('[DNS Layer] Flush failed:', err.message);
    }
}

// Listen to every committed top-level navigation (like a DNS resolver would)
chrome.webNavigation.onCommitted.addListener((details) => {
    // Only top-level frames (not iframes, sub-resources)
    if (details.frameId !== 0) return;
    if (!details.url || !details.url.startsWith('http')) return;

    const domain = extractDomain(details.url);
    if (!domain || SKIP_DNS_DOMAINS.has(domain)) return;

    const event = {
        user_id:     IDENTITY.employeeId,
        user_email:  getResolvedEmail(),
        department:  IDENTITY.department,
        domain:      domain,
        query_count: 1,
        timestamp:   new Date().toISOString()
    };

    dnsBuffer.push(event);
    console.log(`[DNS Layer] Queued: ${domain}`);
    scheduleDnsFlush();
});

// ---------------------------------------------------------------------------
// LAYER 3 — Live SSO Event Capture via webRequest
// Intercepts OAuth2 / SAML / OIDC redirects to known IdPs and extracts
// which SaaS tool the user is logging into from the redirect_uri.
// ---------------------------------------------------------------------------

// Identity provider patterns and their auth_method label
const SSO_IDP_PATTERNS = [
    { pattern: 'accounts.google.com/o/oauth2',  method: 'oauth2' },
    { pattern: 'accounts.google.com/signin',    method: 'oauth2' },
    { pattern: 'login.microsoftonline.com',     method: 'oidc'   },
    { pattern: 'login.live.com/oauth20',        method: 'oauth2' },
    { pattern: 'github.com/login/oauth',        method: 'oauth2' },
    { pattern: 'okta.com/oauth2',              method: 'oidc'   },
    { pattern: '/sso/saml',                    method: 'saml'   },
    { pattern: '/auth/saml',                   method: 'saml'   },
];

// Throttle: track recently reported (domain, email) pairs to avoid spam
const ssoReportedRecently = new Map(); // key → last-reported timestamp

function isSsoThrottled(domain) {
    const last = ssoReportedRecently.get(domain);
    if (!last) return false;
    return (Date.now() - last) < 30_000; // 30-second cooldown per domain
}

function markSsoReported(domain) {
    ssoReportedRecently.set(domain, Date.now());
    // Clean up old entries after 60 seconds
    setTimeout(() => ssoReportedRecently.delete(domain), 60_000);
}

function extractRedirectDomain(url) {
    // Look for redirect_uri=https%3A%2F%2Fnotion.so%2F... or similar
    try {
        const parsed = new URL(url);
        const redirectUri = parsed.searchParams.get('redirect_uri')
            || parsed.searchParams.get('return_to')
            || parsed.searchParams.get('returnTo')
            || parsed.searchParams.get('next');

        if (redirectUri) {
            const decoded = decodeURIComponent(redirectUri);
            return extractDomain(decoded);
        }

        // Fallback: if no redirect_uri, look at 'client_id' host hints (best-effort)
        const clientId = parsed.searchParams.get('client_id') || '';
        if (clientId.includes('.')) return clientId; // sometimes domain-like
    } catch {
        // ignore
    }
    return null;
}

function detectIdpMatch(url) {
    for (const idp of SSO_IDP_PATTERNS) {
        if (url.includes(idp.pattern)) {
            return idp.method;
        }
    }
    return null;
}

// Map common domains to friendly app names
const APP_NAME_MAP = {
    'notion.so':      'Notion',
    'figma.com':      'Figma',
    'monday.com':     'Monday.com',
    'miro.com':       'Miro',
    'loom.com':       'Loom',
    'canva.com':      'Canva',
    'airtable.com':   'Airtable',
    'clickup.com':    'ClickUp',
    'trello.com':     'Trello',
    'asana.com':      'Asana',
    'hubspot.com':    'HubSpot',
    'salesforce.com': 'Salesforce',
    'dropbox.com':    'Dropbox',
    'slack.com':      'Slack',
    'github.com':     'GitHub',
    'gitlab.com':     'GitLab',
    'zoom.us':        'Zoom',
    'claude.ai':      'Claude AI',
    'chatgpt.com':    'ChatGPT',
    'openai.com':     'OpenAI',
    'perplexity.ai':  'Perplexity AI',
};

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (!details.url) return;

        const authMethod = detectIdpMatch(details.url);
        if (!authMethod) return;

        const appDomain = extractRedirectDomain(details.url);
        if (!appDomain) return;

        // Don't log logins to the IdP itself or known infra domains
        if (SKIP_DNS_DOMAINS.has(appDomain)) return;
        if (isSsoThrottled(appDomain)) return;

        markSsoReported(appDomain);

        const appName = APP_NAME_MAP[appDomain] || appDomain;
        const email   = getResolvedEmail();

        const ssoEvent = {
            user_email:  email,
            department:  IDENTITY.department,
            app_name:    appName,
            app_domain:  appDomain,
            auth_method: authMethod,
            status:      'success',   // If we see the redirect, the flow started
            timestamp:   new Date().toISOString()
        };

        console.log(`[SSO Layer] Detected OAuth flow → ${appName} (${appDomain}) via ${authMethod}`);

        fetch(SSO_INGEST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: [ssoEvent] })
        }).then(() => {
            console.log(`[SSO Layer] Reported ${appName} login to backend.`);
        }).catch(err => {
            console.warn('[SSO Layer] Failed to report:', err.message);
        });
    },
    { urls: ['<all_urls>'] }
);

// ---------------------------------------------------------------------------
// LAYER 1 — Existing Extension Scan (unchanged)
// ---------------------------------------------------------------------------

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http') && tab.active) {
        analyzeTab(tabId, tab.url);
    }
});

async function analyzeTab(tabId, url) {
    try {
        const domain = getDomain(url);
        const httpsEnabled = url.startsWith('https');
        const isAi = isAiTool(domain, "");
        const category = categorizeWebsite(domain, isAi);

        // 1. Get cookies
        const cookies = await chrome.cookies.getAll({ domain: domain });
        let trackingCookies = [];
        cookies.forEach(cookie => {
            const nameLower = cookie.name.toLowerCase();
            if (TRACKING_COOKIE_PREFIXES.some(prefix => nameLower.startsWith(prefix))) {
                trackingCookies.push(cookie.name);
            }
        });

        // 2. Request DOM details from content.js
        let contentData = {};
        try {
            contentData = await chrome.tabs.sendMessage(tabId, { action: "extract_signup_data" });
        } catch (err) {
            console.log("Could not communicate with content script.", err);
            return;
        }

        // 3. Resolve email: prefer what content.js captured, else identity config
        if (contentData.loginEmail && contentData.loginEmail.includes('@')) {
            capturedEmail = contentData.loginEmail;
        }

        const companyName   = contentData.companyName || domain;
        const reqPerms      = contentData.requestedPermissions || [];
        const resolvedEmail = getResolvedEmail();

        // 4. Construct payload
        const payload = {
            meta: {
                employeeId:       IDENTITY.employeeId,
                employeeEmail:    resolvedEmail,
                department:       IDENTITY.department,
                detectedAt:       new Date().toISOString(),
                browserName:      "Chrome",
                extensionVersion: "1.0.0"
            },
            site: {
                domain:          domain,
                url:             url,
                companyName:     companyName,
                isLoginPage:     contentData.loginMethod !== "unknown" || contentData.hasPasswordField,
                https:           httpsEnabled,
                hasPasswordField: contentData.hasPasswordField || false,
                formAction:      contentData.formAction || "",
                hasPrivacyPolicy: contentData.hasPrivacyPolicy || false,
                hasTerms:        contentData.hasTerms || false,
                hasCookieBanner: false
            },
            dataFootprint: {
                cookieCount:          cookies.length,
                trackingCookies:      trackingCookies,
                trackingCookieCount:  trackingCookies.length,
                localStorageCount:    contentData.localStorageCount || 0,
                sessionStorageCount:  contentData.sessionStorageCount || 0
            },
            permissions: {
                requestedPermissions: reqPerms,
                permissionCount:      reqPerms.length,
                hasCameraAccess:      reqPerms.includes("camera"),
                hasMicAccess:         reqPerms.includes("microphone"),
                hasLocationAccess:    reqPerms.includes("geolocation")
            },
            vendorInfo: {
                supportEmails:  contentData.supportEmails || [],
                phoneNumbers:   contentData.phoneNumbers || [],
                socialLinks:    contentData.socialLinks || [],
                hasContactInfo: (contentData.supportEmails || []).length > 0 || (contentData.phoneNumbers || []).length > 0,
                socialLinkCount: (contentData.socialLinks || []).length
            }
        };

        // Store for popup
        latestAnalysis[tabId] = {
            ...payload.site,
            ...payload.dataFootprint,
            ...payload.permissions,
            category,
            isAi,
            loginEmail:    contentData.loginEmail || "",
            employeeEmail: resolvedEmail
        };
        chrome.storage.local.set({ latestAnalysis: latestAnalysis[tabId] });

        // 5. Send to backend
        sendToBackend(payload, tabId);

    } catch (error) {
        console.error("Error analyzing tab:", error);
    }
}

async function sendToBackend(payload, tabId) {
    try {
        const response = await fetch(ANALYZE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Backend response:", result);
            if (latestAnalysis[tabId]) {
                latestAnalysis[tabId] = { ...latestAnalysis[tabId], ...result };
                chrome.storage.local.set({ latestAnalysis: latestAnalysis[tabId] });
            }
        } else {
            console.error("Backend error:", response.status);
        }
    } catch (error) {
        console.error("Failed to send to backend:", error);
    }
}

// Allow popup to request latest data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_latest_analysis") {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) {
                sendResponse(latestAnalysis[tabs[0].id] || null);
            } else {
                sendResponse(null);
            }
        });
        return true;
    }
});

// background.js

importScripts('utils.js');

const EMPLOYEE_CONFIG = {
    employeeId: "EMP-9999",
    employeeEmail: "demo@company.com",
    department: "Engineering"
};

const BACKEND_API_URL = "http://localhost:8000/api/analyze";

// Store latest analysis
let latestAnalysis = {};

const TRACKING_COOKIE_PREFIXES = ['_ga', '_fbp', '_hj', 'mk_', 'hubspot', 'ajs_'];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only process the ACTIVE tab to prevent background tabs from overriding your test results
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

        const companyName = contentData.companyName || domain;
        const reqPerms = contentData.requestedPermissions || [];
        // Use the email the user typed on the login form if captured, else fall back to config
        const resolvedEmail = (contentData.loginEmail && contentData.loginEmail.includes('@'))
            ? contentData.loginEmail
            : EMPLOYEE_CONFIG.employeeEmail;

        // 3. Construct final nested payload matching ExtensionPayload schema
        const payload = {
            meta: {
                employeeId: EMPLOYEE_CONFIG.employeeId,
                employeeEmail: resolvedEmail,
                department: EMPLOYEE_CONFIG.department,
                detectedAt: new Date().toISOString(),
                browserName: "Chrome",
                extensionVersion: "1.0.0"
            },
            site: {
                domain: domain,
                url: url,
                companyName: companyName,
                isLoginPage: contentData.loginMethod !== "unknown" || contentData.hasPasswordField,
                https: httpsEnabled,
                hasPasswordField: contentData.hasPasswordField || false,
                formAction: contentData.formAction || "",
                hasPrivacyPolicy: contentData.hasPrivacyPolicy || false,
                hasTerms: contentData.hasTerms || false,
                hasCookieBanner: false
            },
            dataFootprint: {
                cookieCount: cookies.length,
                trackingCookies: trackingCookies,
                trackingCookieCount: trackingCookies.length,
                localStorageCount: contentData.localStorageCount || 0,
                sessionStorageCount: contentData.sessionStorageCount || 0
            },
            permissions: {
                requestedPermissions: reqPerms,
                permissionCount: reqPerms.length,
                hasCameraAccess: reqPerms.includes("camera"),
                hasMicAccess: reqPerms.includes("microphone"),
                hasLocationAccess: reqPerms.includes("geolocation")
            },
            vendorInfo: {
                supportEmails: contentData.supportEmails || [],
                phoneNumbers: contentData.phoneNumbers || [],
                socialLinks: contentData.socialLinks || [],
                hasContactInfo: (contentData.supportEmails || []).length > 0 || (contentData.phoneNumbers || []).length > 0,
                socialLinkCount: (contentData.socialLinks || []).length
            }
        };

        console.log("Constructed Advanced Payload:", payload);
        // Initially set basic data so popup shows something immediately
        latestAnalysis[tabId] = {
            ...payload.site,
            ...payload.dataFootprint,
            ...payload.permissions,
            category,
            isAi,
            loginEmail: contentData.loginEmail || "",
            employeeEmail: resolvedEmail
        };
        chrome.storage.local.set({ latestAnalysis: latestAnalysis[tabId] });

        // 4. Send to backend and store response
        sendToBackend(payload, tabId);

    } catch (error) {
        console.error("Error analyzing tab:", error);
    }
}

async function sendToBackend(payload, tabId) {
    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("Backend response received successfully.", result);
            // Merge backend response with our initial data
            if (latestAnalysis[tabId]) {
                 latestAnalysis[tabId] = { ...latestAnalysis[tabId], ...result };
                 chrome.storage.local.set({ latestAnalysis: latestAnalysis[tabId] });
            }
        } else {
            console.error("Backend returned error:", response.status);
        }
    } catch (error) {
        console.error("Failed to send data to backend.", error);
    }
}

// Allow popup to request the latest data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_latest_analysis") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
                sendResponse(latestAnalysis[tabs[0].id] || null);
            } else {
                sendResponse(null);
            }
        });
        return true; 
    }
});

// background.js

importScripts('utils.js');

const BACKEND_API_URL = "http://localhost:8000/detect-tool";

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

        // Calculate a basic risk score
        let score = 0;
        if (!httpsEnabled) score += 30;
        if (contentData.suspiciousKeywords && contentData.suspiciousKeywords.length > 0) score += 15;
        if (contentData.hasMixedContent) score += 10;
        if (contentData.urlLength > 100) score += 5;
        if (contentData.subdomainCount > 3) score += 5;
        if (contentData.requestedPermissions && contentData.requestedPermissions.length > 0) score += 10;
        if (!contentData.hasFavicon) score += 5;
        
        let level = "Low";
        if (score >= 40) level = "High";
        else if (score >= 15) level = "Medium";

        // Detect AI Tool and Category using utils.js helpers
        const pageTitle = contentData.companyName || domain;
        const possibleAiTool = isAiTool(domain, pageTitle);
        const category = categorizeWebsite(domain, possibleAiTool);

        // Check if cookies are secure
        const secureCookies = cookies.length > 0 && cookies.every(c => c.secure);

        // 3. Construct final payload matching the user's exact structure
        const payload = {
            companyName: contentData.companyName || domain,
            url: url,
            domain: domain,
            https: httpsEnabled,
            certificateValid: httpsEnabled, // Browser prevents invalid certs from loading entirely
            domainAgeDays: 1250, // Mocked for extension, requires backend WHOIS in production
            registrar: "GoDaddy", // Mocked for extension, requires backend WHOIS in production
            hasPasswordField: contentData.hasPasswordField || false,
            formAction: contentData.formAction || null,
            loginMethod: contentData.loginMethod || "unknown",
            hasPrivacyPolicy: contentData.hasPrivacyPolicy || false,
            hasTerms: contentData.hasTerms || false,
            hasCaptcha: contentData.hasCaptcha || false,
            cookieCount: cookies.length,
            trackingCookies: trackingCookies,
            localStorageCount: contentData.localStorageCount || 0,
            sessionStorageCount: contentData.sessionStorageCount || 0,
            requestedPermissions: contentData.requestedPermissions || [],
            externalScriptCount: contentData.externalScriptCount || 0,
            thirdPartyDomains: contentData.thirdPartyDomains || [],
            phoneNumbers: contentData.phoneNumbers || [],
            supportEmails: contentData.supportEmails || [],
            socialLinks: contentData.socialLinks || [],
            suspiciousKeywords: contentData.suspiciousKeywords || [],
            urlLength: contentData.urlLength || url.length,
            subdomainCount: contentData.subdomainCount || 0,
            hasFavicon: contentData.hasFavicon || false,
            metaDescription: contentData.metaDescription || "",
            hasMixedContent: contentData.hasMixedContent || false,
            riskScore: score,
            riskLevel: level,
            timestamp: new Date().toISOString(),
            // Extra fields for popup display (not sent to backend)
            category: category,
            possible_ai_tool: possibleAiTool,
            https_enabled: httpsEnabled,
            cookie_count: cookies.length,
            secure_cookies: secureCookies,
            camera_permission: null,
            microphone_permission: null,
            notification_permission: null
        };

        // Map individual permissions from the array
        if (contentData.requestedPermissions) {
            payload.camera_permission = contentData.requestedPermissions.includes('camera') ? 'prompt' : 'denied';
            payload.microphone_permission = contentData.requestedPermissions.includes('microphone') ? 'prompt' : 'denied';
            payload.notification_permission = contentData.requestedPermissions.includes('notifications') ? 'prompt' : 'denied';
        }

        console.log("Constructed Advanced Payload:", payload);
        latestAnalysis[tabId] = payload;
        chrome.storage.local.set({ latestAnalysis: payload });

        // 4. Send to backend
        sendToBackend(payload);

    } catch (error) {
        console.error("Error analyzing tab:", error);
    }
}

async function sendToBackend(payload) {
    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log("Backend response received successfully.");
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

# Extension Integration Guide

Connecting the browser extension to this backend is very straightforward. You just need to make an HTTP POST request from your extension's background script to our new API endpoint.

Here is exactly what you need to wire it up:

## 1. The API Endpoint
The extension should send a POST request to: `http://127.0.0.1:8000/api/analyze`
*(Update this to your production domain once you deploy it to a real server).*

## 2. The Expected JSON Payload
Our system strictly validates the incoming data. The extension must send a JSON object structured exactly like this (optional fields like `companyName` can be empty strings, but the keys must exist):

```json
{
  "meta": {
    "employeeId": "E001",
    "employeeEmail": "bob@corp.com",
    "department": "Sales",
    "detectedAt": "2026-05-18T12:00:00Z",
    "browserName": "Chrome",
    "extensionVersion": "1.0.0"
  },
  "site": {
    "domain": "slack.com",
    "url": "https://slack.com/login",
    "isLoginPage": true,
    "https": true,
    "hasPasswordField": true,
    "hasPrivacyPolicy": true,
    "hasTerms": true,
    "hasCookieBanner": false,
    "companyName": "",
    "formAction": ""
  },
  "dataFootprint": {
    "cookieCount": 5,
    "trackingCookies": ["_ga", "_fbp"],
    "trackingCookieCount": 2,
    "localStorageCount": 15,
    "sessionStorageCount": 0
  },
  "permissions": {
    "requestedPermissions": [],
    "permissionCount": 0,
    "hasCameraAccess": false,
    "hasMicAccess": false,
    "hasLocationAccess": false
  },
  "vendorInfo": {
    "supportEmails": [],
    "phoneNumbers": [],
    "socialLinks": [],
    "hasContactInfo": false,
    "socialLinkCount": 0
  }
}
```

## 3. Background Script Integration
Drop this exact fetch code into your extension's `background.js` to send the data and receive the risk alerts back:

```javascript
// Inside the extension's background.js
async function sendPayloadToRiskEngine(payload) {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        // If the backend says "skipped: true", it wasn't a login page.
        if (result.skipped) {
            console.log("Ignored:", result.reason);
            return;
        }
        // Otherwise, you get the full risk assessment back!
        console.log("Risk Assessment:", result);
        
        // Example: If it's HIGH or CRITICAL, trigger a browser alert/notification
        if (result.riskLevel === "CRITICAL" || result.riskLevel === "HIGH") {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon.png", // make sure they have an icon
                title: "⚠️ Unauthorized SaaS Tool Detected",
                message: result.recommendation
            });
        }
    } catch (error) {
        console.error("Failed to connect to Risk Engine:", error);
    }
}
```

Once you trigger that fetch command, our FastAPI backend will automatically receive the data, run it through the Pydantic validator, classify the domain, score the risk, save it to the SQLite database, and instantly update the Admin Dashboard!

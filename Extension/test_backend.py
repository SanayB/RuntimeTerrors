import urllib.request
import json
import datetime

payload = {
    "companyName": "Test Corp",
    "url": "https://test.com/login",
    "domain": "test.com",
    "https": True,
    "certificateValid": True,
    "domainAgeDays": 500,
    "registrar": "Test Registrar",
    "hasPasswordField": True,
    "formAction": "/login_post",
    "loginMethod": "email-password",
    "hasPrivacyPolicy": True,
    "hasTerms": False,
    "hasCaptcha": False,
    "cookieCount": 3,
    "trackingCookies": ["_ga"],
    "localStorageCount": 2,
    "sessionStorageCount": 1,
    "requestedPermissions": ["notifications"],
    "externalScriptCount": 5,
    "thirdPartyDomains": ["analytics.test.com"],
    "phoneNumbers": ["555-0100"],
    "supportEmails": ["support@test.com"],
    "socialLinks": [],
    "suspiciousKeywords": ["login"],
    "urlLength": 24,
    "subdomainCount": 1,
    "hasFavicon": True,
    "metaDescription": "Test desc",
    "hasMixedContent": False,
    "riskScore": 25,
    "riskLevel": "Medium",
    "timestamp": datetime.datetime.now().isoformat()
}

req = urllib.request.Request(
    'http://localhost:8000/detect-tool', 
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)

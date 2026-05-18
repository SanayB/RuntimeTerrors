from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json

app = FastAPI(title="SaaS Vendor Security API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "vendor_security.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Dropping and recreating table to handle schema update easily for testing
    cursor.execute('DROP TABLE IF EXISTS vendor_events')
    cursor.execute('''
        CREATE TABLE vendor_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            companyName TEXT,
            url TEXT,
            domain TEXT,
            https BOOLEAN,
            certificateValid BOOLEAN,
            domainAgeDays INTEGER,
            registrar TEXT,
            hasPasswordField BOOLEAN,
            formAction TEXT,
            loginMethod TEXT,
            hasPrivacyPolicy BOOLEAN,
            hasTerms BOOLEAN,
            hasCaptcha BOOLEAN,
            cookieCount INTEGER,
            trackingCookies TEXT,
            localStorageCount INTEGER,
            sessionStorageCount INTEGER,
            requestedPermissions TEXT,
            externalScriptCount INTEGER,
            thirdPartyDomains TEXT,
            phoneNumbers TEXT,
            supportEmails TEXT,
            socialLinks TEXT,
            suspiciousKeywords TEXT,
            urlLength INTEGER,
            subdomainCount INTEGER,
            hasFavicon BOOLEAN,
            metaDescription TEXT,
            hasMixedContent BOOLEAN,
            riskScore INTEGER,
            riskLevel TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class VendorPayload(BaseModel):
    companyName: str
    url: str
    domain: str
    https: bool
    certificateValid: bool
    domainAgeDays: int
    registrar: str
    hasPasswordField: bool
    formAction: Optional[str] = None
    loginMethod: str
    hasPrivacyPolicy: bool
    hasTerms: bool
    hasCaptcha: bool
    cookieCount: int
    trackingCookies: List[str]
    localStorageCount: int
    sessionStorageCount: int
    requestedPermissions: List[str]
    externalScriptCount: int
    thirdPartyDomains: List[str]
    phoneNumbers: List[str]
    supportEmails: List[str]
    socialLinks: List[str]
    suspiciousKeywords: List[str]
    urlLength: int
    subdomainCount: int
    hasFavicon: bool
    metaDescription: Optional[str] = None
    hasMixedContent: bool
    riskScore: int
    riskLevel: str
    timestamp: str

@app.post("/detect-tool")
async def detect_tool(payload: VendorPayload):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO vendor_events (
                companyName, url, domain, https, certificateValid, domainAgeDays, registrar,
                hasPasswordField, formAction, loginMethod, hasPrivacyPolicy, hasTerms,
                hasCaptcha, cookieCount, trackingCookies, localStorageCount, sessionStorageCount,
                requestedPermissions, externalScriptCount, thirdPartyDomains, phoneNumbers,
                supportEmails, socialLinks, suspiciousKeywords, urlLength, subdomainCount,
                hasFavicon, metaDescription, hasMixedContent, riskScore, riskLevel, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            payload.companyName, payload.url, payload.domain, payload.https, payload.certificateValid,
            payload.domainAgeDays, payload.registrar, payload.hasPasswordField, payload.formAction,
            payload.loginMethod, payload.hasPrivacyPolicy, payload.hasTerms, payload.hasCaptcha,
            payload.cookieCount, json.dumps(payload.trackingCookies), payload.localStorageCount,
            payload.sessionStorageCount, json.dumps(payload.requestedPermissions), payload.externalScriptCount,
            json.dumps(payload.thirdPartyDomains), json.dumps(payload.phoneNumbers), json.dumps(payload.supportEmails),
            json.dumps(payload.socialLinks), json.dumps(payload.suspiciousKeywords), payload.urlLength,
            payload.subdomainCount, payload.hasFavicon, payload.metaDescription, payload.hasMixedContent,
            payload.riskScore, payload.riskLevel, payload.timestamp
        ))
        
        conn.commit()
        conn.close()
        
        print(f"Logged security profile for vendor: {payload.companyName} ({payload.domain})")
        
        # Write the JSON payload to a temporary text file
        with open("output.txt", "a") as f:
            f.write(f"--- OUTPUT FOR {payload.url} ---\n")
            f.write(json.dumps(payload.dict(), indent=2))
            f.write("\n\n")
            
        return {
            "status": "success",
            "message": "Vendor profile recorded"
        }
        
    except Exception as e:
        print(f"Error processing payload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Shadow IT Governance — Detailed Overview

This repository implements a Shadow IT governance prototype with a browser extension, a FastAPI backend, and a dashboard interface. It is intended to detect unauthorized SaaS usage and risky web applications accessed by employees, then score and store those events for security monitoring.

---

## Project Purpose

The project is designed to collect security and privacy signals from employee browsing activity, evaluate risk, and provide visibility to administrators. It combines these capabilities:

- Browser extension captures page metadata and form/login behavior.
- FastAPI backend validates payloads, classifies domains, computes risk scores, and stores results.
- Admin dashboard displays aggregated metrics, hazard trends, and event details.

---

## Repository Structure

- `app/`
  - `main.py` — FastAPI application startup, routing, CORS, and static dashboard mount.
  - `api/` — REST API endpoints for analysis and dashboard data.
  - `core/` — business logic for payload models, domain classification, and risk scoring.
  - `db/` — SQLAlchemy database configuration and `ScanResult` model.
- `api/main.py` — package entrypoint used by ASGI servers to import the FastAPI app.
- `extension/` — browser extension assets, including content capture and popup UI.
- `static/` — frontend dashboard pages and client-side dashboard logic.
- `requirements.txt` — Python dependencies.
- `README.md` — currently contains the main project README.
- `README1.md` — this detailed explanation file.

---

## What Was Improved

The repository now includes several improvements to support better risk detection and observability.

### Backend and Data Model Enhancements

- Extended the payload schema in `app/core/models.py` to capture richer browser signals:
  - `suspiciousKeywords`
  - `urlLength`
  - `subdomainCount`
  - `hasFavicon`
  - `metaDescription`
  - `externalScriptCount`
  - `thirdPartyDomains`
  - `hasCaptcha`
  - `hasMixedContent`
  - `loginMethod`
- Added additional persistence fields in `app/db/models.py`:
  - login detection
  - privacy and terms detection
  - cookie banner presence
  - detailed cookie and storage metrics
  - permission request flags
  - third-party script metadata
  - raw JSON payload storage for debugging or audit

### Risk Scoring Improvements

- Updated `app/core/scorer.py` to penalize additional risk signals:
  - external scripts on the page
  - third-party domains loaded by scripts
  - suspicious URL keywords common in phishing and insecure SaaS pages
  - mixed HTTP/HTTPS content
- This yields a more nuanced score and richer reasons list for each event.

### API and Dashboard Updates

- Added a health endpoint at `/api/health` in `app/main.py`.
- Extended dashboard query support in `app/api/dashboard.py`:
  - search by domain, employee email, or department
  - filter by risk level
  - filter by classification (`approved`, `blocked`, `unknown`)
- The dashboard now supports paginated result queries.

### Extension Enhancements

- `extension/content.js` now detects `hasCookieBanner` and returns more page signals.
- `extension/background.js` now uses tab title plus domain to improve AI tool detection.
- The extension sends a richer nested payload that matches the backend `ExtensionPayload` model.

---

## How the System Works

### 1. Browser Extension

The extension does the following:

- Monitors active tab changes and page loads.
- Extracts page metadata from the DOM using `content.js`.
- Captures login email inputs, cookie presence, page permissions, and other risk signals.
- Sends the assembled payload to the backend API at `/api/analyze`.
- Stores the latest analysis locally for display in the popup UI.

### 2. Backend Analysis

The backend does the following:

- Validates incoming payloads using Pydantic models in `app/core/models.py`.
- Classifies the domain as `approved`, `blocked`, or `unknown` using `app/core/classifier.py`.
- Scores risk with `app/core/scorer.py`.
- Persists the scan event in SQLite via SQLAlchemy.
- Returns risk, confidence, and recommendations back to the extension.

### 3. Admin Dashboard

The static dashboard reads data from API endpoints and displays:

- total scans and critical alerts
- risk distribution
- 14-day activity trend
- most risky domains
- employee exposure summary
- event log with drill-down modal details

---

## Run Instructions

1. Install dependencies:

```powershell
cd c:\Users\sanay\Downloads\RuntimeTerrors-ram\RuntimeTerrors-ram
python -m pip install -r requirements.txt
```

2. Run the backend:

```powershell
python -m uvicorn app.main:app --reload
```

3. Load the Chrome extension:

- Open `chrome://extensions`
- Enable Developer mode
- Click `Load unpacked`
- Select the `extension/` folder

4. Open the admin dashboard in a browser:

```text
http://localhost:8000/dashboard
```

---

## API Summary

- `GET /` — basic service status
- `GET /api/health` — health check
- `POST /api/analyze` — analyze browser payload and return risk assessment
- `POST /api/detect-tool` — alias for `/api/analyze`
- `GET /api/dashboard` — paginated event log with optional search/filter
- `GET /api/dashboard/stats` — aggregated stats
- `GET /api/dashboard/employees` — employee risk summary
- `GET /api/dashboard/domains` — domain risk summary
- `GET /api/dashboard/timeline` — last 14 days activity trend

Optional query params for `/api/dashboard`:
- `q`
- `riskLevel`
- `classification`
- `skip`
- `limit`

---

## Notes and Next Steps

- The current database is a local SQLite file; for production, migrate to a managed DB and add migrations.
- The `risk_engine/` folder is currently unused and can be cleaned up.
- Dashboard UI filter controls can be added to consume the new query parameters.
- Additional features could include user authentication and RBAC for dashboard access.

---

## Validation

The modified backend Python files have been compiled successfully with `python -m py_compile`, so there are no syntax errors in the updated code files.

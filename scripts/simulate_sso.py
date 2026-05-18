"""
simulate_sso.py — Realistic SSO event generator (Okta / Google Workspace / Azure AD style).
  - Generates login events for shadow SaaS tools via OAuth/SAML/OIDC
  - Cross-references same domains as DNS simulator for correlation
  - Includes failed auth attempts, MFA challenges, and suspicious logins
  - Posts to /api/detections/ingest/sso in batches
"""
import random
import requests
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000/api/detections/ingest/sso"
BATCH_SIZE = 20

# --- Same employees as DNS simulator for cross-correlation ---
EMPLOYEES = [
    {"user_email": "bob@corp.com",     "department": "Sales"},
    {"user_email": "alice@corp.com",   "department": "Engineering"},
    {"user_email": "charlie@corp.com", "department": "IT"},
    {"user_email": "diana@corp.com",   "department": "Engineering"},
    {"user_email": "eve@corp.com",     "department": "Marketing"},
    {"user_email": "frank@corp.com",   "department": "Design"},
    {"user_email": "grace@corp.com",   "department": "HR"},
    {"user_email": "henry@corp.com",   "department": "Design"},
    {"user_email": "irene@corp.com",   "department": "Finance"},
]

# --- SSO-connected apps (matches DNS simulator domains for cross-reference) ---
SHADOW_APPS = [
    {"app_name": "Notion",       "app_domain": "notion.so"},
    {"app_name": "Figma",        "app_domain": "figma.com"},
    {"app_name": "Monday.com",   "app_domain": "monday.com"},
    {"app_name": "Miro",         "app_domain": "miro.com"},
    {"app_name": "Loom",         "app_domain": "loom.com"},
    {"app_name": "Canva",        "app_domain": "canva.com"},
    {"app_name": "Airtable",     "app_domain": "airtable.com"},
    {"app_name": "ClickUp",      "app_domain": "clickup.com"},
    {"app_name": "Claude AI",    "app_domain": "claude.ai"},
    {"app_name": "Perplexity",   "app_domain": "perplexity.ai"},
]

APPROVED_APPS = [
    {"app_name": "Google Workspace", "app_domain": "google.com"},
    {"app_name": "Slack",            "app_domain": "slack.com"},
    {"app_name": "GitHub",           "app_domain": "github.com"},
    {"app_name": "Zoom",             "app_domain": "zoom.us"},
]

AUTH_METHODS = ["oauth2", "saml", "oidc"]
STATUSES     = ["success", "success", "success", "mfa_required", "failed"]  # weighted


def rand_ts(base_date: datetime, hour_range=(8, 19)) -> datetime:
    return base_date.replace(
        hour=random.randint(*hour_range),
        minute=random.randint(0, 59),
        second=random.randint(0, 59),
    )


def dept_employees(dept: str):
    return [e for e in EMPLOYEES if e["department"] == dept]


def post_batch(events: list):
    try:
        resp = requests.post(API_URL, json={"events": events}, timeout=10)
        print(f"  → POST {len(events)} events: HTTP {resp.status_code}")
    except Exception as e:
        print(f"  → ERROR: {e}")


def main():
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    base_date = today - timedelta(days=13)

    all_events = []
    print("=== SSO Event Simulator ===")

    # Spread scenario: mirror the DNS simulator's notion spread
    # Engineering → Design (day 3) → HR (day 7)
    NOTION_SPREAD = [
        ("Engineering", 0),
        ("Design",      3),
        ("HR",          7),
        ("Marketing",   10),
    ]

    for day_offset in range(14):
        day = base_date + timedelta(days=day_offset)
        print(f"\nDay {day_offset}: {day.strftime('%Y-%m-%d')}")

        # 1. Background approved app logins (normal behaviour)
        for _ in range(random.randint(3, 6)):
            emp = random.choice(EMPLOYEES)
            app = random.choice(APPROVED_APPS)
            all_events.append({
                "user_email":  emp["user_email"],
                "department":  emp["department"],
                "app_name":    app["app_name"],
                "app_domain":  app["app_domain"],
                "auth_method": random.choice(AUTH_METHODS),
                "status":      "success",
                "timestamp":   rand_ts(day).isoformat(),
            })

        # 2. Notion spread scenario (cross-references DNS)
        for dept, start_day in NOTION_SPREAD:
            if day_offset >= start_day:
                employees = dept_employees(dept)
                if employees:
                    emp = random.choice(employees)
                    status = random.choice(STATUSES)
                    all_events.append({
                        "user_email":  emp["user_email"],
                        "department":  emp["department"],
                        "app_name":    "Notion",
                        "app_domain":  "notion.so",
                        "auth_method": "oauth2",
                        "status":      status,
                        "timestamp":   rand_ts(day).isoformat(),
                    })
                    print(f"  [SSO] {emp['user_email']} → Notion (notion.so) [{status}]")

        # 3. Random shadow app logins
        for _ in range(random.randint(1, 3)):
            emp = random.choice(EMPLOYEES)
            app = random.choice(SHADOW_APPS)
            status = random.choice(STATUSES)
            all_events.append({
                "user_email":  emp["user_email"],
                "department":  emp["department"],
                "app_name":    app["app_name"],
                "app_domain":  app["app_domain"],
                "auth_method": random.choice(AUTH_METHODS),
                "status":      status,
                "timestamp":   rand_ts(day).isoformat(),
            })
            if status == "success":
                print(f"  [SHADOW SSO] {emp['user_email']} → {app['app_name']} [{status}]")

        # 4. Suspicious burst: rapid failed + success logins on day 11
        if day_offset == 11:
            print("  🚨 BURST SSO: Multiple rapid logins to Airtable")
            for _ in range(6):
                emp = random.choice(EMPLOYEES)
                all_events.append({
                    "user_email":  emp["user_email"],
                    "department":  emp["department"],
                    "app_name":    "Airtable",
                    "app_domain":  "airtable.com",
                    "auth_method": "oauth2",
                    "status":      random.choice(["success", "failed", "mfa_required"]),
                    "timestamp":   rand_ts(day, hour_range=(14, 16)).isoformat(),
                })

    # Post in batches
    print(f"\nTotal SSO events generated: {len(all_events)}")
    print("Posting to backend...")
    for i in range(0, len(all_events), BATCH_SIZE):
        post_batch(all_events[i : i + BATCH_SIZE])

    print("\nDone! SSO simulation complete.")


if __name__ == "__main__":
    main()

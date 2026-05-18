"""
simulate_dns.py — Realistic DNS query log generator with:
  - SaaS tool spread across departments over time
  - Burst event simulation for demo drama
  - Posts to /api/detections/ingest/dns in batches
"""
import random
import requests
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000/api/detections/ingest/dns"
BATCH_SIZE = 20

# --- Employees ---
EMPLOYEES = [
    {"user_id": "E001", "user_email": "bob@corp.com",     "department": "Sales"},
    {"user_id": "E002", "user_email": "alice@corp.com",   "department": "Engineering"},
    {"user_id": "E003", "user_email": "charlie@corp.com", "department": "IT"},
    {"user_id": "E004", "user_email": "diana@corp.com",   "department": "Engineering"},
    {"user_id": "E005", "user_email": "eve@corp.com",     "department": "Marketing"},
    {"user_id": "E006", "user_email": "frank@corp.com",   "department": "Design"},
    {"user_id": "E007", "user_email": "grace@corp.com",   "department": "HR"},
    {"user_id": "E008", "user_email": "henry@corp.com",   "department": "Design"},
    {"user_id": "E009", "user_email": "irene@corp.com",   "department": "Finance"},
]

# --- Shadow SaaS domains ---
SHADOW_SAAS = [
    "notion.so", "figma.com", "monday.com", "miro.com",
    "loom.com", "canva.com", "airtable.com", "clickup.com",
    "trello.com", "asana.com",
]

# --- Legitimate (approved) domains that generate normal DNS traffic ---
APPROVED_DOMAINS = [
    "slack.com", "github.com", "google.com", "zoom.us",
    "microsoft.com", "atlassian.com",
]

# --- High-risk / blocked domains ---
BLOCKED_DOMAINS = [
    "ngrok.io", "anonfiles.com", "snusbase.com",
]

# --- Department spread simulation ---
# Each tool starts in a seed department and spreads to others over ~14 days
SPREAD_SCENARIOS = [
    {
        "domain": "notion.so",
        "day_0_dept": "Engineering",
        "spread_to": ["Design", "HR", "Marketing"],
        "spread_day": [3, 6, 10],
    },
    {
        "domain": "figma.com",
        "day_0_dept": "Design",
        "spread_to": ["Engineering", "Marketing"],
        "spread_day": [4, 8],
    },
    {
        "domain": "monday.com",
        "day_0_dept": "Sales",
        "spread_to": ["Marketing", "HR"],
        "spread_day": [5, 9],
    },
    {
        "domain": "miro.com",
        "day_0_dept": "Design",
        "spread_to": ["Engineering"],
        "spread_day": [7],
    },
]

# --- Burst event: heavy spike of a blocked domain on day 12 ---
BURST_EVENT = {
    "domain": "anonfiles.com",
    "burst_day": 12,
    "burst_count": 15,  # 15 queries in quick succession
    "department": "IT",
}


def rand_ts(base_date: datetime, hour_range=(8, 18)) -> datetime:
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
    print("=== DNS Log Simulator ===")

    for day_offset in range(14):
        day = base_date + timedelta(days=day_offset)
        print(f"\nDay {day_offset}: {day.strftime('%Y-%m-%d')}")

        # 1. Normal background traffic on approved domains
        for _ in range(random.randint(4, 8)):
            emp = random.choice(EMPLOYEES)
            all_events.append({
                "user_id": emp["user_id"],
                "user_email": emp["user_email"],
                "department": emp["department"],
                "domain": random.choice(APPROVED_DOMAINS),
                "query_count": random.randint(1, 5),
                "timestamp": rand_ts(day).isoformat(),
            })

        # 2. Shadow SaaS spread events
        for scenario in SPREAD_SCENARIOS:
            active_depts = [scenario["day_0_dept"]]
            for idx, spread_day in enumerate(scenario["spread_day"]):
                if day_offset >= spread_day:
                    active_depts.append(scenario["spread_to"][idx])

            for dept in active_depts:
                employees = dept_employees(dept) or [random.choice(EMPLOYEES)]
                for emp in random.sample(employees, min(len(employees), 2)):
                    all_events.append({
                        "user_id": emp["user_id"],
                        "user_email": emp["user_email"],
                        "department": emp["department"],
                        "domain": scenario["domain"],
                        "query_count": random.randint(1, 8),
                        "timestamp": rand_ts(day).isoformat(),
                    })
                    print(f"  [SHADOW] {emp['user_email']} queried {scenario['domain']}")

        # 3. Burst event — heavy traffic spike
        if day_offset == BURST_EVENT["burst_day"]:
            print(f"  🚨 BURST EVENT: {BURST_EVENT['domain']} in {BURST_EVENT['department']}")
            employees = dept_employees(BURST_EVENT["department"]) or EMPLOYEES
            for i in range(BURST_EVENT["burst_count"]):
                emp = random.choice(employees)
                all_events.append({
                    "user_id": emp["user_id"],
                    "user_email": emp["user_email"],
                    "department": emp["department"],
                    "domain": BURST_EVENT["domain"],
                    "query_count": random.randint(5, 20),
                    "timestamp": rand_ts(day, hour_range=(10, 12)).isoformat(),
                })

        # 4. Random low-frequency blocked domain pings
        if random.random() < 0.3:
            emp = random.choice(EMPLOYEES)
            domain = random.choice(BLOCKED_DOMAINS)
            all_events.append({
                "user_id": emp["user_id"],
                "user_email": emp["user_email"],
                "department": emp["department"],
                "domain": domain,
                "query_count": random.randint(1, 3),
                "timestamp": rand_ts(day).isoformat(),
            })
            print(f"  [BLOCKED] {emp['user_email']} queried {domain}")

    # Post in batches
    print(f"\nTotal events generated: {len(all_events)}")
    print("Posting to backend...")
    for i in range(0, len(all_events), BATCH_SIZE):
        post_batch(all_events[i : i + BATCH_SIZE])

    print("\nDone! DNS simulation complete.")


if __name__ == "__main__":
    main()

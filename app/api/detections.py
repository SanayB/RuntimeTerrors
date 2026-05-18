"""
detections.py — API endpoints for DNS/SSO ingestion and unified detections.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import DnsEvent, SsoEvent, UnifiedDetection
from app.core.pipeline import ingest_dns_event, ingest_sso_event

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic request schemas
# ---------------------------------------------------------------------------

class DnsEventIn(BaseModel):
    user_id: str
    user_email: str
    department: str
    domain: str
    query_count: int = 1
    timestamp: datetime


class SsoEventIn(BaseModel):
    user_email: str
    department: str
    app_name: str
    app_domain: str
    auth_method: str
    status: str
    timestamp: datetime


class DnsBatch(BaseModel):
    events: List[DnsEventIn]


class SsoBatch(BaseModel):
    events: List[SsoEventIn]


# ---------------------------------------------------------------------------
# Ingestion endpoints
# ---------------------------------------------------------------------------

@router.post("/detections/ingest/dns")
def ingest_dns_batch(batch: DnsBatch, db: Session = Depends(get_db)):
    """Ingest a batch of DNS log entries from the simulator or real DNS forwarder."""
    results = []
    for ev in batch.events:
        event = ingest_dns_event(
            user_id=ev.user_id,
            user_email=ev.user_email,
            department=ev.department,
            domain=ev.domain,
            query_count=ev.query_count,
            timestamp=ev.timestamp,
            db=db,
        )
        results.append({"id": event.id, "domain": event.domain, "flagged": event.flagged})
    return {"ingested": len(results), "results": results}


@router.post("/detections/ingest/sso")
def ingest_sso_batch(batch: SsoBatch, db: Session = Depends(get_db)):
    """Ingest a batch of SSO login events from the simulator or real IdP webhook."""
    results = []
    for ev in batch.events:
        event = ingest_sso_event(
            user_email=ev.user_email,
            department=ev.department,
            app_name=ev.app_name,
            app_domain=ev.app_domain,
            auth_method=ev.auth_method,
            status=ev.status,
            timestamp=ev.timestamp,
            db=db,
        )
        results.append({"id": event.id, "app_domain": event.app_domain, "flagged": event.flagged})
    return {"ingested": len(results), "results": results}


# ---------------------------------------------------------------------------
# Query endpoints
# ---------------------------------------------------------------------------

@router.get("/detections")
def get_all_detections(
    source: Optional[str] = Query(None, description="Filter by source: extension, dns, sso, dns|sso"),
    db: Session = Depends(get_db),
):
    """
    Return all unified detections, optionally filtered by source.
    Use source=dns+sso to require BOTH dns AND sso.
    """
    rows = db.query(UnifiedDetection).all()

    if source:
        requested = set(source.lower().replace("+", "|").split("|"))
        rows = [r for r in rows if requested.issubset(set(r.sources.split("|")))]

    return [_serialize_detection(r) for r in rows]


@router.get("/detections/dns")
def get_dns_detections(db: Session = Depends(get_db)):
    """Return all unified detections that include a DNS source."""
    rows = db.query(UnifiedDetection).filter(
        UnifiedDetection.sources.contains("dns")
    ).all()
    return [_serialize_detection(r) for r in rows]


@router.get("/detections/sso")
def get_sso_detections(db: Session = Depends(get_db)):
    """Return all unified detections that include an SSO source."""
    rows = db.query(UnifiedDetection).filter(
        UnifiedDetection.sources.contains("sso")
    ).all()
    return [_serialize_detection(r) for r in rows]


@router.get("/spread/{domain}")
def get_tool_spread(domain: str, db: Session = Depends(get_db)):
    """
    Return department spread over time for a given domain across all three sources.
    """
    spread: dict[str, dict] = {}

    dns_rows = db.query(DnsEvent).filter(DnsEvent.domain == domain).all()
    for r in dns_rows:
        _add_spread(spread, r.department, r.timestamp, "dns")

    sso_rows = db.query(SsoEvent).filter(SsoEvent.app_domain == domain).all()
    for r in sso_rows:
        _add_spread(spread, r.department, r.timestamp, "sso")

    from app.db.models import ScanResult
    ext_rows = db.query(ScanResult).filter(ScanResult.domain == domain).all()
    for r in ext_rows:
        _add_spread(spread, r.department, r.scanned_at, "extension")

    return {
        "domain": domain,
        "departments": [
            {
                "department": dept,
                "first_seen": info["first_seen"].isoformat() if info["first_seen"] else None,
                "last_seen": info["last_seen"].isoformat() if info["last_seen"] else None,
                "sources": list(info["sources"]),
                "hit_count": info["count"],
            }
            for dept, info in sorted(
                spread.items(),
                key=lambda x: x[1]["first_seen"] or datetime.min
            )
        ],
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_detection(r: UnifiedDetection) -> dict:
    sources_list = r.sources.split("|") if r.sources else []
    return {
        "id": r.id,
        "domain": r.domain,
        "saasToolName": r.saas_tool_name,
        "userEmail": r.user_email,
        "department": r.department,
        "sources": sources_list,
        "sourcesLabel": " + ".join(s.upper() for s in sorted(sources_list)),
        "combinedRiskScore": r.combined_risk_score,
        "combinedRiskLevel": r.combined_risk_level,
        "confidenceScore": r.confidence_score,
        "classification": r.classification,
        "firstSeen": r.first_seen.isoformat() if r.first_seen else None,
        "lastSeen": r.last_seen.isoformat() if r.last_seen else None,
    }


def _add_spread(spread: dict, department: str, ts, source: str):
    if not department:
        department = "Unknown"
    if department not in spread:
        spread[department] = {"first_seen": ts, "last_seen": ts, "sources": set(), "count": 0}
    else:
        if ts and spread[department]["first_seen"] and ts < spread[department]["first_seen"]:
            spread[department]["first_seen"] = ts
        if ts and spread[department]["last_seen"] and ts > spread[department]["last_seen"]:
            spread[department]["last_seen"] = ts
    spread[department]["sources"].add(source)
    spread[department]["count"] += 1

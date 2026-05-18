"""
pipeline.py — Unified ingestion pipeline for all three detection sources.
Handles DNS events, SSO events, and cross-references extension scans
into the UnifiedDetection aggregation table.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session

from app.core.classifier import classify
from app.core.scorer import score_unified
from app.db.models import DnsEvent, SsoEvent, UnifiedDetection

# ---------------------------------------------------------------------------
# SaaS domain → friendly name mapping
# ---------------------------------------------------------------------------

SAAS_DOMAIN_MAP: dict[str, str] = {
    "notion.so": "Notion",
    "figma.com": "Figma",
    "monday.com": "Monday.com",
    "miro.com": "Miro",
    "loom.com": "Loom",
    "canva.com": "Canva",
    "airtable.com": "Airtable",
    "clickup.com": "ClickUp",
    "trello.com": "Trello",
    "asana.com": "Asana",
    "hubspot.com": "HubSpot",
    "salesforce.com": "Salesforce",
    "zendesk.com": "Zendesk",
    "intercom.io": "Intercom",
    "slack.com": "Slack",
    "github.com": "GitHub",
    "gitlab.com": "GitLab",
    "zoom.us": "Zoom",
    "dropbox.com": "Dropbox",
    "box.com": "Box",
    "ngrok.io": "ngrok",
    "anonfiles.com": "AnonFiles",
    "snusbase.com": "Snusbase",
    "claude.ai": "Claude AI",
    "chatgpt.com": "ChatGPT",
    "openai.com": "OpenAI",
    "perplexity.ai": "Perplexity AI",
}


def _get_saas_name(domain: str) -> str | None:
    return SAAS_DOMAIN_MAP.get(domain.lower().replace("www.", ""))


def _base_risk_for_classification(classification: str) -> int:
    if classification == "blocked":
        return 65
    if classification == "unknown":
        return 30
    return 10  # approved


def _level_from_score(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# DNS ingestion
# ---------------------------------------------------------------------------

def ingest_dns_event(
    user_id: str,
    user_email: str,
    department: str,
    domain: str,
    query_count: int,
    timestamp: datetime,
    db: Session,
) -> DnsEvent:
    classification = classify(domain)
    flagged = classification in ("blocked", "unknown")
    base_risk = _base_risk_for_classification(classification)

    # Scale risk slightly by query volume (capped at +20)
    volume_bonus = min(int((query_count - 1) * 2), 20) if query_count > 1 else 0
    risk_score = min(base_risk + volume_bonus, 100)
    risk_level = _level_from_score(risk_score)

    event = DnsEvent(
        user_id=user_id,
        user_email=user_email,
        department=department,
        domain=domain,
        query_count=query_count,
        saas_tool_name=_get_saas_name(domain),
        classification=classification,
        flagged=flagged,
        risk_score=risk_score,
        risk_level=risk_level,
        timestamp=timestamp,
    )
    db.add(event)
    db.flush()

    if flagged:
        update_unified_detection(
            domain=domain,
            user_email=user_email,
            department=department,
            source="dns",
            base_risk=risk_score,
            classification=classification,
            db=db,
        )

    db.commit()
    return event


# ---------------------------------------------------------------------------
# SSO ingestion
# ---------------------------------------------------------------------------

def ingest_sso_event(
    user_email: str,
    department: str,
    app_name: str,
    app_domain: str,
    auth_method: str,
    status: str,
    timestamp: datetime,
    db: Session,
) -> SsoEvent:
    classification = classify(app_domain)
    flagged = classification in ("blocked", "unknown") and status == "success"
    base_risk = _base_risk_for_classification(classification)

    if status == "failed":
        base_risk = max(base_risk - 10, 5)
    elif status == "mfa_required":
        base_risk = max(base_risk - 5, 5)

    risk_score = min(base_risk, 100)
    risk_level = _level_from_score(risk_score)

    event = SsoEvent(
        user_email=user_email,
        department=department,
        app_name=app_name,
        app_domain=app_domain,
        auth_method=auth_method,
        status=status,
        classification=classification,
        flagged=flagged,
        risk_score=risk_score,
        risk_level=risk_level,
        timestamp=timestamp,
    )
    db.add(event)
    db.flush()

    if flagged:
        update_unified_detection(
            domain=app_domain,
            user_email=user_email,
            department=department,
            source="sso",
            base_risk=risk_score,
            classification=classification,
            db=db,
        )

    db.commit()
    return event


# ---------------------------------------------------------------------------
# Unified detection aggregation
# ---------------------------------------------------------------------------

Source = Literal["extension", "dns", "sso"]


def update_unified_detection(
    domain: str,
    user_email: str,
    department: str,
    source: Source,
    base_risk: int,
    classification: str,
    db: Session,
) -> UnifiedDetection:
    """
    Upsert a UnifiedDetection row for (domain, user_email).
    Merges the new source into the sources list and re-scores with multi-source boost.
    """
    detection = (
        db.query(UnifiedDetection)
        .filter(
            UnifiedDetection.domain == domain,
            UnifiedDetection.user_email == user_email,
        )
        .first()
    )

    if detection is None:
        detection = UnifiedDetection(
            domain=domain,
            saas_tool_name=_get_saas_name(domain),
            user_email=user_email,
            department=department,
            sources=source,
            combined_risk_score=base_risk,
            combined_risk_level=_level_from_score(base_risk),
            confidence_score=50,
            classification=classification,
        )
        db.add(detection)
    else:
        # Merge sources (dedup)
        existing = set(detection.sources.split("|")) if detection.sources else set()
        existing.add(source)
        detection.sources = "|".join(sorted(existing))

        # Re-score with multi-source boost
        scored = score_unified(
            sources=list(existing),
            base_score=max(detection.combined_risk_score, base_risk),
            classification=classification,
        )
        detection.combined_risk_score = scored["risk_score"]
        detection.combined_risk_level = scored["risk_level"]
        detection.confidence_score = scored["confidence_score"]
        detection.last_seen = datetime.utcnow()
        if classification != "unknown":
            detection.classification = classification

    db.flush()
    return detection

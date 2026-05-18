from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.session import Base


class ScanResult(Base):
    """Extension-sourced login scan results."""
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, index=True)
    employee_email = Column(String, index=True)
    department = Column(String)

    domain = Column(String, index=True)
    url = Column(String)
    classification = Column(String)

    risk_score = Column(Integer)
    confidence_score = Column(Integer)
    risk_level = Column(String)
    reasons = Column(String)       # JSON string
    recommendation = Column(String)

    scanned_at = Column(DateTime(timezone=True), server_default=func.now())


class DnsEvent(Base):
    """A single DNS query log entry ingested from the DNS simulator."""
    __tablename__ = "dns_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    user_email = Column(String, index=True)
    department = Column(String)
    domain = Column(String, index=True)
    query_count = Column(Integer, default=1)

    saas_tool_name = Column(String, nullable=True)
    classification = Column(String)
    flagged = Column(Boolean, default=False)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="LOW")

    timestamp = Column(DateTime(timezone=True))
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())


class SsoEvent(Base):
    """A single SSO login event ingested from the SSO simulator."""
    __tablename__ = "sso_events"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    department = Column(String)
    app_name = Column(String)
    app_domain = Column(String, index=True)
    auth_method = Column(String)   # oauth2 | saml | oidc
    status = Column(String)        # success | mfa_required | failed

    classification = Column(String)
    flagged = Column(Boolean, default=False)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="LOW")

    timestamp = Column(DateTime(timezone=True))
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())


class UnifiedDetection(Base):
    """
    One row per (domain, user_email) pair across ALL sources.
    Updated whenever any source reports the same domain + user.
    Sources stored as pipe-separated string e.g. "extension|dns|sso"
    """
    __tablename__ = "unified_detections"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True)
    saas_tool_name = Column(String, nullable=True)
    user_email = Column(String, index=True)
    department = Column(String)

    sources = Column(String, default="")   # pipe-separated: "extension|dns|sso"

    combined_risk_score = Column(Integer, default=0)
    combined_risk_level = Column(String, default="LOW")
    confidence_score = Column(Integer, default=50)
    classification = Column(String, default="unknown")

    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())

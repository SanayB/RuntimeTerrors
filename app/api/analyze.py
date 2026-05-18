import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.db.session import get_db
from app.db.models import ScanResult
from app.core.models import ExtensionPayload
from app.core.classifier import classify, is_login_page
from app.core.scorer import score

router = APIRouter()

@router.post("/analyze")
def analyze_payload(payload: dict, db: Session = Depends(get_db)):
    """
    Receives the raw payload from the browser extension, validates it,
    classifies the domain, scores the risk, saves to DB, and returns the result.
    Records all events regardless of whether it's a login page.
    """
    try:
        print(">>> INSIDE ANALYZE_PAYLOAD")
        # 1. Validate payload
        ext_payload = ExtensionPayload.parse_payload(payload)
        print(">>> PAYLOAD PARSED SUCCESSFULLY")
    except ValueError as e:
        print(">>> VALIDATION ERROR:", e)
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Note if it's a login page (we record all events now)
    is_login = is_login_page(ext_payload)

    # 3. Classify Domain
    classification = classify(ext_payload.site.domain)

    # 4. Score Risk
    scored_result = score(ext_payload, classification)

    # 5. Save to Database
    db_result = ScanResult(
        employee_id=ext_payload.meta.employeeId,
        employee_email=ext_payload.meta.employeeEmail,
        department=ext_payload.meta.department,
        domain=ext_payload.site.domain,
        url=ext_payload.site.url,
        classification=classification,
        risk_score=scored_result.riskScore,
        confidence_score=scored_result.confidenceScore,
        risk_level=scored_result.riskLevel,
        reasons=json.dumps(scored_result.reasons),
        recommendation=scored_result.recommendation
    )

    db.add(db_result)
    db.commit()
    db.refresh(db_result)

    # 6. Return Response to Extension
    return {
        "domain": ext_payload.site.domain,
        "classification": classification,
        "confidenceScore": scored_result.confidenceScore,
        "riskScore": scored_result.riskScore,
        "riskLevel": scored_result.riskLevel,
        "reasons": scored_result.reasons,
        "recommendation": scored_result.recommendation
    }


@router.post("/detect-tool")
def detect_tool_alias(payload: dict, db: Session = Depends(get_db)):
    """Alias for /analyze for backward compatibility with older extension versions."""
    return analyze_payload(payload, db)

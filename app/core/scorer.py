from dataclasses import dataclass

from app.core.models import ExtensionPayload

@dataclass
class ScoredResult:
    riskScore: int
    confidenceScore: int
    riskLevel: str
    reasons: list[str]
    recommendation: str

def score(payload: ExtensionPayload, classification: str) -> ScoredResult:
    """
    Score the payload based on a set of weighted rules.
    """
    score = 0
    reasons = []

    # Domain Classification
    if classification == "blocked":
        score += 50
        reasons.append("Domain is on the blocklist.")
    elif classification == "unknown":
        score += 15
        reasons.append("Domain is unknown/unapproved.")

    # HTTPS Check
    if not payload.site.https:
        score += 20
        reasons.append("Connection is not secure (HTTP).")

    # Tracking Cookies
    if payload.dataFootprint.trackingCookieCount > 0:
        added_score = min(payload.dataFootprint.trackingCookieCount * 2, 20)
        score += added_score
        reasons.append(f"Detected {payload.dataFootprint.trackingCookieCount} tracking cookies.")

    # Permissions
    if payload.permissions.hasCameraAccess:
        score += 15
        reasons.append("Site requests camera access.")
    if payload.permissions.hasMicAccess:
        score += 15
        reasons.append("Site requests microphone access.")
    if payload.permissions.hasLocationAccess:
        score += 15
        reasons.append("Site requests location access.")
    
    if payload.permissions.permissionCount > 5:
        score += 5
        reasons.append(f"Site requests a high number of permissions ({payload.permissions.permissionCount}).")

    # Policies
    if not payload.site.hasPrivacyPolicy:
        score += 10
        reasons.append("No privacy policy detected.")
    if not payload.site.hasTerms:
        score += 5
        reasons.append("No terms of service detected.")

    # Storage
    total_storage = payload.dataFootprint.localStorageCount + payload.dataFootprint.sessionStorageCount
    if total_storage > 10:
        score += 5
        reasons.append("High amount of local/session storage usage.")

    # Cap score at 100
    risk_score = min(score, 100)
    
    # Calculate Confidence (heuristic based on amount of data collected)
    confidence = 50
    if payload.site.companyName or payload.vendorInfo.hasContactInfo:
         confidence += 20
    if payload.site.hasCookieBanner:
         confidence += 10
    if payload.dataFootprint.cookieCount > 0:
         confidence += 10
    if classification != "unknown":
         confidence += 10
    
    confidence_score = min(confidence, 100)

    # Determine Risk Level
    if risk_score >= 80:
        risk_level = "CRITICAL"
        recommendation = "Do not proceed. Site exhibits extreme risk factors."
    elif risk_score >= 60:
        risk_level = "HIGH"
        recommendation = "Proceed with caution or avoid sharing sensitive information."
    elif risk_score >= 30:
        risk_level = "MEDIUM"
        recommendation = "Exercise normal caution. Some risk factors present."
    else:
        risk_level = "LOW"
        recommendation = "Site appears generally safe based on available signals."

    return ScoredResult(
        riskScore=risk_score,
        confidenceScore=confidence_score,
        riskLevel=risk_level,
        reasons=reasons,
        recommendation=recommendation
    )


def score_unified(sources: list, base_score: int, classification: str) -> dict:
    """
    Multi-source confidence boost for UnifiedDetection rows.
      - 1 source  → no change
      - 2 sources → +15 score, +15 confidence
      - 3 sources → +25 score, +25 confidence, risk level bumped one tier
    """
    n = len(sources)
    score_boost = 0
    confidence_boost = 0
    bump_level = False

    if n >= 3:
        score_boost = 25
        confidence_boost = 25
        bump_level = True
    elif n == 2:
        score_boost = 15
        confidence_boost = 15

    risk_score = min(base_score + score_boost, 100)
    confidence_score = min(50 + confidence_boost + (10 if classification != "unknown" else 0), 100)

    if risk_score >= 80:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    if bump_level:
        tiers = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        idx = tiers.index(risk_level)
        risk_level = tiers[min(idx + 1, 3)]

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "confidence_score": confidence_score,
    }


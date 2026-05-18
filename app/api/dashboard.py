import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.db.models import ScanResult

router = APIRouter()

@router.get("/dashboard")
def get_dashboard(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Returns a paginated list of all scan results for the admin dashboard.
    """
    results = db.query(ScanResult).order_by(ScanResult.scanned_at.desc()).offset(skip).limit(limit).all()
    
    formatted_results = []
    for r in results:
        formatted = {
            "id": r.id,
            "employeeId": r.employee_id,
            "employeeEmail": r.employee_email,
            "department": r.department,
            "domain": r.domain,
            "url": r.url,
            "classification": r.classification,
            "riskScore": r.risk_score,
            "confidenceScore": r.confidence_score,
            "riskLevel": r.risk_level,
            "reasons": json.loads(r.reasons) if r.reasons else [],
            "recommendation": r.recommendation,
            "scannedAt": r.scanned_at
        }
        formatted_results.append(formatted)
        
    return {"results": formatted_results, "total": db.query(ScanResult).count()}


@router.get("/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Returns aggregated statistics for the admin dashboard.
    """
    total_scans = db.query(ScanResult).count()
    
    risk_breakdown = db.query(ScanResult.risk_level, func.count(ScanResult.id))\
        .group_by(ScanResult.risk_level).all()
    
    risk_dict = {row[0]: row[1] for row in risk_breakdown}
    
    top_domains = db.query(ScanResult.domain, func.count(ScanResult.id))\
        .group_by(ScanResult.domain)\
        .order_by(func.count(ScanResult.id).desc())\
        .limit(5).all()
        
    top_domains_dict = {row[0]: row[1] for row in top_domains}
    
    return {
        "totalScans": total_scans,
        "riskLevelBreakdown": risk_dict,
        "topScannedDomains": top_domains_dict
    }


@router.get("/dashboard/employees")
def get_employees(db: Session = Depends(get_db)):
    """
    Per-employee exposure summary.
    """
    # Group by employee_email to get stats
    employee_stats = db.query(
        ScanResult.employee_email,
        func.max(ScanResult.department).label('department'),
        func.count(ScanResult.id).label('total_scans'),
        func.max(ScanResult.risk_score).label('max_risk_score'),
        func.max(ScanResult.scanned_at).label('last_seen')
    ).group_by(ScanResult.employee_email).all()

    # Define risk levels mapping for easy lookup
    def get_level(score):
        if score >= 80: return "CRITICAL"
        if score >= 60: return "HIGH"
        if score >= 30: return "MEDIUM"
        return "LOW"

    results = []
    for stat in employee_stats:
        email = stat.employee_email
        # Get unique domains for this employee
        domains = db.query(ScanResult.domain).filter(ScanResult.employee_email == email).distinct().all()
        domain_list = [d[0] for d in domains]

        results.append({
            "employeeEmail": email,
            "department": stat.department,
            "totalScans": stat.total_scans,
            "highestRiskScore": stat.max_risk_score,
            "highestRiskLevel": get_level(stat.max_risk_score),
            "uniqueDomains": domain_list,
            "lastSeen": stat.last_seen
        })
    
    # Sort by highest risk score descending
    results.sort(key=lambda x: x["highestRiskScore"], reverse=True)
    return results


@router.get("/dashboard/domains")
def get_domains(db: Session = Depends(get_db)):
    """
    Per-domain tool exposure summary.
    """
    domain_stats = db.query(
        ScanResult.domain,
        func.max(ScanResult.classification).label('classification'),
        func.avg(ScanResult.risk_score).label('avg_risk'),
        func.max(ScanResult.risk_score).label('max_risk'),
        func.count(ScanResult.id).label('total_scans'),
        func.count(func.distinct(ScanResult.employee_email)).label('affected_employees')
    ).group_by(ScanResult.domain).all()

    def get_level(score):
        if score >= 80: return "CRITICAL"
        if score >= 60: return "HIGH"
        if score >= 30: return "MEDIUM"
        return "LOW"

    results = []
    for stat in domain_stats:
        results.append({
            "domain": stat.domain,
            "classification": stat.classification,
            "avgRiskScore": round(stat.avg_risk, 1) if stat.avg_risk else 0,
            "highestRiskScore": stat.max_risk,
            "highestRiskLevel": get_level(stat.max_risk),
            "affectedEmployees": stat.affected_employees,
            "totalScans": stat.total_scans
        })
    
    # Sort by average risk descending
    results.sort(key=lambda x: x["avgRiskScore"], reverse=True)
    return results


@router.get("/dashboard/timeline")
def get_timeline(db: Session = Depends(get_db)):
    """
    Last 14 days activity trend.
    """
    from datetime import date
    
    # Simple approximation since sqlite date functions differ
    all_scans = db.query(ScanResult.scanned_at, ScanResult.risk_score).all()
    
    # Bucket by date string 'YYYY-MM-DD'
    daily_stats = {}
    
    # Pre-fill last 14 days
    today = date.today()
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        daily_stats[d] = {"date": d, "count": 0, "criticalCount": 0}

    for scan in all_scans:
        if not scan.scanned_at: continue
        d_str = scan.scanned_at.strftime('%Y-%m-%d')
        if d_str in daily_stats:
            daily_stats[d_str]["count"] += 1
            if scan.risk_score >= 80:
                daily_stats[d_str]["criticalCount"] += 1
                
    return list(daily_stats.values())

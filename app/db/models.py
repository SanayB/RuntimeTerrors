from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.db.session import Base

class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, index=True)
    employee_email = Column(String, index=True)
    department = Column(String)
    
    domain = Column(String, index=True)
    url = Column(String)
    classification = Column(String)
    is_login_page = Column(Boolean, index=True, default=False)
    company_name = Column(String)
    has_privacy_policy = Column(Boolean, default=False)
    has_terms = Column(Boolean, default=False)
    has_cookie_banner = Column(Boolean, default=False)
    cookie_count = Column(Integer, default=0)
    tracking_cookie_count = Column(Integer, default=0)
    local_storage_count = Column(Integer, default=0)
    session_storage_count = Column(Integer, default=0)
    permission_count = Column(Integer, default=0)
    has_camera_access = Column(Boolean, default=False)
    has_mic_access = Column(Boolean, default=False)
    has_location_access = Column(Boolean, default=False)
    suspicious_keywords = Column(String)
    external_script_count = Column(Integer, default=0)
    third_party_domains = Column(String)
    has_captcha = Column(Boolean, default=False)
    has_mixed_content = Column(Boolean, default=False)
    raw_payload = Column(Text)
    
    risk_score = Column(Integer)
    confidence_score = Column(Integer)
    risk_level = Column(String)
    reasons = Column(String) # JSON string of list of reasons
    recommendation = Column(String)
    
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())

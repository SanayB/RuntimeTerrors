from sqlalchemy import Column, Integer, String, DateTime
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
    
    risk_score = Column(Integer)
    confidence_score = Column(Integer)
    risk_level = Column(String)
    reasons = Column(String) # JSON string of list of reasons
    recommendation = Column(String)
    
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())

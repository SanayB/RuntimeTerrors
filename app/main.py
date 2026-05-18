from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.session import engine, Base
from app.api import analyze, dashboard

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Shadow IT Governance API",
    description="Backend API for the Shadow IT Browser Extension",
    version="1.0.0"
)

# Enable CORS for the dashboard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])

# Mount the static dashboard so it serves at /dashboard
app.mount("/dashboard", StaticFiles(directory="static", html=True), name="static")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Shadow IT Governance API is running. Visit /dashboard to view the admin interface."}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Shadow IT Governance API", "version": "1.0.0"}

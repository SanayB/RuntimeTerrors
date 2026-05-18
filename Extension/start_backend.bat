@echo off
echo ============================================
echo   Shadow SaaS Security Detector - Backend
echo ============================================
echo.
echo Starting FastAPI backend on http://127.0.0.1:8000
echo API Docs available at: http://127.0.0.1:8000/docs
echo.
cd /d "%~dp0backend"
call venv\Scripts\activate
python main.py
pause

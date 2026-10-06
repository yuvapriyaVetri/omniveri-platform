@echo off
echo =========================================================================
echo   Smart University Certificate Issuance and Verification Platform
echo =========================================================================
echo Starting FastAPI application server on http://localhost:8000 ...
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
pause

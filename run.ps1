Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "  Smart University Certificate Issuance and Verification Platform" -ForegroundColor Yellow
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "Starting server on http://localhost:8000 ..." -ForegroundColor Green
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload

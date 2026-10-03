@echo off
echo Starting DataVista Full-Stack Development Environment...

start "DataVista Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"
start "DataVista Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Both services launched in separate windows.
echo Frontend: http://localhost:5173
echo Backend API Docs: http://127.0.0.1:8000/docs

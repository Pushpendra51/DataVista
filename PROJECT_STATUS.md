# InsightAI — Project Status & Roadmap

## 1. Project Overview
InsightAI is an intermediate CSV Data Analysis and Reporting Web Application built with **FastAPI**, **Pandas**, **NumPy**, **Pydantic**, and **React (Vite)**. It provides real data quality profiling, descriptive statistics, group-by aggregations, correlation analysis, interactive charts, and a rule-based question engine without relying on external AI API keys or arbitrary code execution.

---

## 2. Milestone Progress Tracker

| Milestone | Description | Status | Verification |
| :--- | :--- | :--- | :--- |
| **Milestone 1** | Workspace inspection, project structure, Python venv, FastAPI health endpoint, React Vite setup | **Completed** | Pytest passed (2/2), Vite build passed |
| **Milestone 2** | CSV upload handling, file validation, dataset preview, row/column counts, and inferred types | **Completed** | Pytest 9/9 passed, Vite build passed |
| **Milestone 3** | Data quality summary (missing values, duplicates, type issues) & Pandas descriptive statistics | *Queued* | Not started |
| **Milestone 4** | Interactive dashboard with KPI cards, tables, and Recharts | *Queued* | Not started |
| **Milestone 5** | Safe question engine (sum, average, median, min/max, top categories, group-by, correlation) | *Queued* | Not started |
| **Milestone 6** | Basic data cleaning actions & export (cleaned CSV and analysis summary report) | *Queued* | Not started |
| **Milestone 7** | Comprehensive automated test suite, error boundary review, and security audit | *Queued* | Not started |
| **Milestone 8** | Documentation, demo datasets, screenshots, and local end-to-end verification | *Queued* | Not started |
| **Milestone 9** | Optional enhancements (saved history / AI explanations) | *Queued* | Not started |
| **Milestone 10** | Production deployment readiness check | *Queued* | Not started |

---

## 3. Milestone 1 Completed Features
- **Clean Project Architecture**: Established separation of concerns across `backend/app/api`, `backend/app/core`, `backend/app/schemas`, `backend/app/services`, and `frontend/src`.
- **Python Virtual Environment**: Created `backend/venv` running Python 3.10.8 with all required dependencies installed (`fastapi`, `uvicorn`, `pandas`, `numpy`, `pydantic`, `pytest`, `httpx`, `python-multipart`).
- **Config & CORS**: Configured application settings in `backend/app/core/config.py` with CORS whitelist for `http://localhost:5173`.
- **FastAPI Endpoints**:
  - `GET /`: Root welcome and endpoint discovery.
  - `GET /api/health`: Health status endpoint returning structured `HealthResponse`.
- **Pydantic Validation**: Strong schema typing for API responses in `backend/app/schemas/response.py`.
- **Automated Tests**: Implemented and executed `pytest` test suite with `FastAPI TestClient` in `backend/tests/test_health.py` (2 passed).
- **Vite React Frontend**: Scaffolded React app with Vite dev proxy routing `/api` requests to backend port 8000, modern design tokens, live API health monitor, and responsive dashboard layout.
- **Frontend Production Build**: Tested and verified clean compilation (`vite build` succeeded in 2.82s).

---

## 4. Setup and Run Commands (Windows PowerShell)

### Backend Setup & Execution
```powershell
# Navigate to backend directory
cd d:\insight-ai\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start FastAPI development server with auto-reload
uvicorn app.main:app --reload --port 8000
```
Backend will be available at:
- API Root: `http://127.0.0.1:8000`
- Health Endpoint: `http://127.0.0.1:8000/api/health`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

### Frontend Setup & Execution
```powershell
# In a new PowerShell window, navigate to frontend directory
cd d:\insight-ai\frontend

# Start Vite development server
npm run dev
```
Frontend will be available at:
- Web App: `http://localhost:5173`

### Run Automated Backend Tests
```powershell
cd d:\insight-ai\backend
.\venv\Scripts\pytest.exe -v tests
```

---

## 5. Actual Test & Build Results

### Backend Pytest Execution
```
platform win32 -- Python 3.10.8, pytest-9.1.1, pluggy-1.6.0
collected 2 items

tests/test_health.py::test_root_endpoint PASSED                          [ 50%]
tests/test_health.py::test_health_endpoint_status_and_schema PASSED      [100%]

======================== 2 passed, 1 warning in 0.59s =========================
```

### Frontend Build Execution
```
> vite build
✓ 1887 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-WGV1NkwB.css    5.31 kB │ gzip:  1.77 kB
dist/assets/index-C1NNwHdt.js   231.33 kB │ gzip: 72.51 kB
✓ built in 2.82s
```

---

## 6. Known Bugs & Limitations
- **Current Limitation**: Milestone 1 is the foundational architecture and health check. CSV file ingestion and Pandas processing services will be attached in Milestone 2 and 3.

---

## 7. Next Milestone Plan
- **Milestone 2: CSV Upload & Dataset Preview**
  - Implement secure CSV upload endpoint (`POST /api/upload`) with file validation (extension, size, empty file, malformed CSV).
  - Extract dataset shape (row count, column count), column names, and inferred data types using Pandas.
  - Return safe preview rows (head 5–10 rows) with missing value indicators.
  - Build React file upload dropzone component with validation error alerts and interactive data preview table.

# InsightAI — CSV Data Analysis & Reporting Platform

InsightAI is an intermediate, full-stack data analysis and reporting web application built with **FastAPI**, **Pandas**, **NumPy**, **Pydantic**, and **React (Vite)**. It empowers users to upload real-world CSV files, preview datasets, diagnose data quality issues (missing values, duplicates, type mismatches), compute descriptive statistics, explore group-by aggregations and correlations, visualize patterns with interactive charts, and run deterministic, safe data queries — all without external AI dependencies or arbitrary code execution risks.

---

## Key Highlights & Core Capabilities

- **Strict Data Integrity**: Every metric, summary, and chart point is calculated directly by Pandas and NumPy from the uploaded dataset. Zero fabricated analytics or mocked results.
- **Deterministic & Safe Question Engine**: Answers data questions (sums, averages, medians, rankings, correlations, group-bys) using verified Pandas operations rather than unsafe SQL or code execution.
- **Data Quality Profiling**: Instant detection of missing cells per column, duplicate records, and mixed data types.
- **Enterprise-Grade Architecture**: Clean separation between React UI, FastAPI route handlers, Pydantic data schemas, and isolated Pandas business logic services.
- **100% Free & Local**: No external API keys (OpenAI, Gemini, etc.) or subscription services required for core analytics.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Recharts, Lucide Icons, Vanilla CSS Design System |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2 |
| **Data Engine** | Pandas, NumPy |
| **Testing** | pytest, FastAPI TestClient (`httpx`) |
| **Version Control** | Git, GitHub |

---

## System Architecture

```
[ User Browser ]
       │
       ▼ (HTTP / JSON)
[ React + Vite Frontend (Port 5173) ]
       │  Proxy: /api -> http://127.0.0.1:8000
       ▼
[ FastAPI Application (Port 8000) ]
       ├── CORS Middleware (Configured for dev & production)
       ├── Pydantic Schemas (Input validation & output serialization)
       ├── API Routes (/api/health, /api/upload, /api/analytics, etc.)
       └── Pandas Analytics Services (Pure, stateless data transformations)
```

---

## Project Structure

```
insight-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app creation, CORS, and route mounting
│   │   ├── api/                 # API route handlers
│   │   │   ├── __init__.py
│   │   │   └── routes.py        # Endpoints (/api/health, etc.)
│   │   ├── core/                # Global configuration & upload constraints
│   │   │   ├── __init__.py
│   │   │   └── config.py
│   │   ├── schemas/             # Pydantic v2 response & request models
│   │   │   ├── __init__.py
│   │   │   └── response.py
│   │   └── services/            # Reusable Pandas & NumPy analytics logic
│   │       └── __init__.py
│   ├── tests/                   # Automated pytest suite
│   │   ├── __init__.py
│   │   └── test_health.py
│   ├── requirements.txt         # Backend Python dependencies
│   └── venv/                    # Python virtual environment (ignored in git)
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main dashboard component
│   │   ├── index.css            # Design tokens & responsive styles
│   │   └── main.jsx             # React entrypoint
│   ├── index.html
│   ├── package.json
│   └── vite.config.js           # Vite dev server with /api proxy
├── .gitignore
├── PROJECT_STATUS.md            # Detailed milestone roadmap and verified test logs
└── README.md
```

---

## Getting Started (Windows PowerShell)

### Prerequisites
- **Python 3.10+** (verified on Python 3.10.8)
- **Node.js v18+** (verified on Node v24.15.0 with npm 11.12.1)

### 1. Backend Setup

```powershell
# Navigate into backend
cd d:\insight-ai\backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend will start at `http://127.0.0.1:8000`. You can visit `http://127.0.0.1:8000/docs` to inspect the auto-generated Swagger UI.

### 2. Frontend Setup

```powershell
# In a new PowerShell window, navigate into frontend
cd d:\insight-ai\frontend

# Install dependencies (recharts, lucide-react, react, vite)
npm install

# Start the development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Running Automated Tests

Run the backend test suite using `pytest`:

```powershell
cd d:\insight-ai\backend
.\venv\Scripts\pytest.exe -v tests
```

To verify the production frontend build:

```powershell
cd d:\insight-ai\frontend
npm run build
```

---

## API Endpoints (Current & Upcoming)

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API welcome & discovery | Live (M1) |
| `GET` | `/api/health` | Health monitor, version, timestamp | Live (M1) |
| `POST` | `/api/upload` | CSV upload, size/type check, data preview | Milestone 2 |
| `GET` | `/api/analytics/quality` | Missing values, duplicate rows, data types | Milestone 3 |
| `GET` | `/api/analytics/summary` | Descriptive statistics & correlations | Milestone 3 |
| `POST` | `/api/query` | Safe question answering engine | Milestone 5 |
| `POST` | `/api/export` | Cleaned CSV & summary report export | Milestone 6 |

---

## Security & Reliability Principles

1. **Strict Upload Size Limits**: Uploads are restricted by default to 10 MB in `backend/app/core/config.py`.
2. **Safe Code Execution**: No arbitrary python execution (`eval`, `exec`) or raw SQL strings. All operations execute strictly through pre-validated Pandas functions.
3. **Graceful Error Handling**: Malformed CSV files, missing columns, or bad encodings return informative JSON error objects with appropriate HTTP status codes.
4. **CORS Governance**: Configured to restrict unauthorized cross-origin requests.

---

## Planned Screenshots
- [ ] *Dashboard Landing & API Health Status* (Milestone 1)
- [ ] *CSV Drag-and-Drop Upload & Preview Table* (Milestone 2)
- [ ] *Data Quality Metrics & Missing Value Cards* (Milestone 3)
- [ ] *Descriptive Statistics & Recharts Visualizations* (Milestone 4)
- [ ] *Question Engine & Filtered Output* (Milestone 5)

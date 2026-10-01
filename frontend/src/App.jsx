import { useState, useEffect } from 'react'
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, Database, FileSpreadsheet } from 'lucide-react'

function App() {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [latency, setLatency] = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    const startTime = performance.now()
    try {
      const response = await fetch('/api/health')
      const endTime = performance.now()
      setLatency(Math.round(endTime - startTime))
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setHealthData(data)
      setLastChecked(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message || 'Failed to reach FastAPI backend')
      setHealthData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-icon">IA</div>
            <div>
              <span className="brand-title">InsightAI</span>
              <span className="brand-badge">v0.1.0</span>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="status-badge status-checking">
                <span className="status-dot"></span>
                Connecting to API...
              </div>
            ) : error ? (
              <div className="status-badge status-error">
                <span className="status-dot"></span>
                API Disconnected
              </div>
            ) : (
              <div className="status-badge status-healthy">
                <span className="status-dot"></span>
                Backend Healthy ({latency}ms)
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-tag">
            <Layers size={15} />
            Milestone 1 — Foundation & Health Check
          </div>
          <h1 className="hero-title">CSV Data Analysis & Reporting Engine</h1>
          <p className="hero-subtitle">
            An intermediate data analysis tool built with FastAPI, Pandas, NumPy, and React.
            Clean, inspect, visualize, and query datasets with strict data integrity and zero AI dependency.
          </p>
        </section>

        {/* Dashboard Grid */}
        <div className="cards-grid">
          {/* Card 1: Live API Health Check */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Activity size={18} color="var(--primary)" />
                FastAPI Health Monitor
              </h2>
              <button 
                id="refresh-health-btn"
                className="btn btn-secondary" 
                onClick={checkHealth} 
                disabled={loading}
                title="Re-query /api/health"
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
                {loading ? 'Checking...' : 'Ping API'}
              </button>
            </div>

            {loading && !healthData && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Querying <code>/api/health</code>...
              </p>
            )}

            {error && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)' }}>
                  <AlertCircle size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>API Unreachable</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Error: {error}
                </p>
                <div className="code-box">
                  # To start the backend server in PowerShell:<br />
                  cd d:\insight-ai\backend<br />
                  .\venv\Scripts\Activate.ps1<br />
                  uvicorn app.main:app --reload --port 8000
                </div>
              </div>
            )}

            {healthData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    Endpoint Active: 200 OK
                  </span>
                </div>
                <div className="code-box">
                  {JSON.stringify(healthData, null, 2)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  <span>Latency: <strong>{latency} ms</strong></span>
                  <span>Last checked: <strong>{lastChecked}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: System Architecture & Separation of Concerns */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ShieldCheck size={18} color="var(--primary)" />
                Milestone 1 Architecture
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Structured separation between presentation, validation, routing, and data processing:
            </p>
            <div className="pipeline-list">
              <div className="pipeline-item active">
                <span>Frontend: React 19 + Vite (Port 5173 with API Proxy)</span>
                <span className="pipeline-step-badge badge-done">Active</span>
              </div>
              <div className="pipeline-item active">
                <span>API Gateway: FastAPI + CORS Middleware (Port 8000)</span>
                <span className="pipeline-step-badge badge-done">Active</span>
              </div>
              <div className="pipeline-item active">
                <span>Validation: Pydantic v2 Models (`app/schemas/`)</span>
                <span className="pipeline-step-badge badge-done">Active</span>
              </div>
              <div className="pipeline-item">
                <span>Analytics: Pure Pandas/NumPy Services (`app/services/`)</span>
                <span className="pipeline-step-badge badge-pending">Milestone 2 & 3</span>
              </div>
            </div>
          </div>

          {/* Card 3: Next Milestones Roadmap */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <FileSpreadsheet size={18} color="var(--primary)" />
                Project Execution Tracker
              </h2>
            </div>
            <div className="pipeline-list">
              <div className="pipeline-item active">
                <span>M1: Workspace, venv, health check, Vite setup</span>
                <span className="pipeline-step-badge badge-done">Completed</span>
              </div>
              <div className="pipeline-item">
                <span>M2: CSV upload, malformed validation & preview</span>
                <span className="pipeline-step-badge badge-pending">Next</span>
              </div>
              <div className="pipeline-item">
                <span>M3: Data quality, missing values, Pandas stats</span>
                <span className="pipeline-step-badge badge-pending">Queued</span>
              </div>
              <div className="pipeline-item">
                <span>M4: Recharts interactive dashboard & KPI cards</span>
                <span className="pipeline-step-badge badge-pending">Queued</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        InsightAI • CSV Data Analysis and Reporting Web Application • Built with FastAPI & React
      </footer>
    </div>
  )
}

export default App

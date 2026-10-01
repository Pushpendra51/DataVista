import { useState, useEffect } from 'react'
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Layers, UploadCloud } from 'lucide-react'
import CsvUploader from './components/CsvUploader.jsx'
import DatasetOverview from './components/DatasetOverview.jsx'
import ColumnsInspector from './components/ColumnsInspector.jsx'
import DataTable from './components/DataTable.jsx'

function App() {
  const [healthData, setHealthData] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)
  const [healthLatency, setHealthLatency] = useState(null)

  const [uploadLoading, setUploadLoading] = useState(false)
  const [dataset, setDataset] = useState(null)

  const [activeTab, setActiveTab] = useState('overview')

  const checkHealth = async () => {
    setHealthLoading(true)
    setHealthError(null)
    const t0 = performance.now()
    try {
      const res = await fetch('/api/health')
      setHealthLatency(Math.round(performance.now() - t0))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setHealthData(await res.json())
    } catch (err) {
      setHealthError(err.message)
      setHealthData(null)
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => { checkHealth() }, [])

  const handleUploadSuccess = (data) => {
    setDataset(data)
    setActiveTab('overview')
  }

  const handleReset = () => {
    setDataset(null)
    setActiveTab('overview')
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'columns', label: `Columns (${dataset?.column_count ?? 0})` },
    { id: 'preview', label: 'Data Preview' },
  ]

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-icon">IA</div>
            <div>
              <span className="brand-title">InsightAI</span>
              <span className="brand-badge">v0.2.0</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {healthLoading ? (
              <div className="status-badge status-checking">
                <span className="status-dot" />
                Connecting...
              </div>
            ) : healthError ? (
              <div className="status-badge status-error">
                <span className="status-dot" />
                API Offline
              </div>
            ) : (
              <div className="status-badge status-healthy">
                <span className="status-dot" />
                Backend Live · {healthLatency}ms
              </div>
            )}
            <button
              className="btn btn-secondary"
              onClick={checkHealth}
              disabled={healthLoading}
              id="refresh-health-btn"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} />
              Ping
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">

        {/* Hero — only shown before any upload */}
        {!dataset && (
          <section className="hero-section">
            <div className="hero-tag">
              <Layers size={15} />
              Milestone 2 — CSV Upload &amp; Dataset Preview
            </div>
            <h1 className="hero-title">Upload a CSV. Inspect it instantly.</h1>
            <p className="hero-subtitle">
              Drag and drop any CSV file, or click "Load Demo Dataset" for an instant walkthrough.
              InsightAI validates, parses, and profiles your data using Pandas — no file size guessing,
              no silent failures.
            </p>
          </section>
        )}

        {/* Upload area — always visible if no dataset loaded yet */}
        {!dataset && (
          <div className="card" style={{ padding: '1.75rem' }}>
            <div className="card-header">
              <h2 className="card-title">
                <UploadCloud size={18} color="var(--primary)" />
                CSV Upload
              </h2>
            </div>
            <CsvUploader
              onUploadSuccess={handleUploadSuccess}
              loading={uploadLoading}
              setLoading={setUploadLoading}
            />
          </div>
        )}

        {/* Dataset sections — visible after successful upload */}
        {dataset && (
          <>
            {/* Dataset overview & KPI bar */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <DatasetOverview dataset={dataset} onReset={handleReset} />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-main)',
                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            <div className="card" style={{ padding: '1.75rem' }}>
              {activeTab === 'overview' && (
                <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '0.95rem' }}>
                    ✅ Dataset successfully uploaded and parsed by Pandas. Switch to the <strong>Columns</strong> tab
                    to inspect data types and null distribution, or go to <strong>Data Preview</strong> to browse rows.
                  </p>
                  {(dataset.has_nulls || dataset.has_duplicates) && (
                    <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>
                      <AlertCircle size={20} style={{ flexShrink: 0 }} />
                      <div>
                        {dataset.has_nulls && <div>⚠️ <strong>Missing values detected</strong> — check the Columns tab for per-column null counts.</div>}
                        {dataset.has_duplicates && <div>⚠️ <strong>{dataset.duplicate_rows_count} duplicate row(s)</strong> detected in this dataset.</div>}
                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem' }}>
                          Cleaning actions will be available in Milestone 6.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'columns' && (
                <ColumnsInspector columns={dataset.columns} />
              )}

              {activeTab === 'preview' && (
                <DataTable
                  datasetId={dataset.dataset_id}
                  initialRows={dataset.preview_rows}
                  columns={dataset.columns}
                  totalRows={dataset.row_count}
                />
              )}
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        InsightAI · CSV Data Analysis and Reporting · FastAPI + Pandas + React
      </footer>
    </div>
  )
}

export default App

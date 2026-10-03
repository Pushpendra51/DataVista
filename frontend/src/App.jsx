import { useState, useEffect, useCallback } from 'react'
import {
  Activity, RefreshCw, Layers, UploadCloud,
  ShieldCheck, BarChart2, HelpCircle, Download, Table, Columns, SlidersHorizontal,
  Search, Bell, Settings, Sparkles, CheckCircle2, FileSpreadsheet, ArrowUpRight
} from 'lucide-react'
import CsvUploader from './components/CsvUploader.jsx'
import DatasetOverview from './components/DatasetOverview.jsx'
import ColumnsInspector from './components/ColumnsInspector.jsx'
import DataTable from './components/DataTable.jsx'
import QualityReport from './components/QualityReport.jsx'
import { CategoryBarChart, NumericStatsChart, CorrelationHeatmap } from './components/Charts.jsx'
import QuestionEngine from './components/QuestionEngine.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import BIDashboard from './components/BIDashboard.jsx'

const TABS = [
  { id: 'overview',     label: 'Overview',      icon: Layers },
  { id: 'bi-dashboard', label: 'BI Dashboard',  icon: SlidersHorizontal },
  { id: 'columns',      label: 'Columns',       icon: Columns },
  { id: 'preview',      label: 'Data Preview',  icon: Table },
  { id: 'quality',      label: 'Data Quality',  icon: ShieldCheck },
  { id: 'stats',        label: 'Statistics',    icon: BarChart2 },
  { id: 'ask',          label: 'Ask Data (AI)', icon: HelpCircle, badge: 'NEW' },
  { id: 'export',       label: 'Clean & Export',icon: Download },
]

function useFetch(url, enabled) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    if (!enabled || !url) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`)
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url, enabled])

  useEffect(() => { run() }, [run])
  return { data, loading, error }
}

export default function App() {
  const [healthData, setHealthData]   = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)
  const [healthLatency, setHealthLatency] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [dataset, setDataset]         = useState(null)
  const [activeTab, setActiveTab]     = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Health check ──────────────────────────────────────────────────────────
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

  // ── Analytics lazy-fetched per tab ────────────────────────────────────────
  const did = dataset?.dataset_id
  const qFetch  = useFetch(did ? `/api/analytics/${did}/quality`     : null, !!did && activeTab === 'quality')
  const sFetch  = useFetch(did ? `/api/analytics/${did}/statistics`  : null, !!did && activeTab === 'stats')
  const cFetch  = useFetch(did ? `/api/analytics/${did}/correlation` : null, !!did && activeTab === 'stats')

  const handleUploadSuccess = (data) => { setDataset(data); setActiveTab('overview') }
  const handleReset         = () => { setDataset(null); setActiveTab('overview') }
  const handleDatasetCleaned = (newId) => {
    if (dataset) setDataset(prev => ({ ...prev, dataset_id: newId }))
  }

  return (
    <div className="app-shell">
      {/* ── Left Sidebar Navigation ── */}
      <aside className="app-sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="brand-icon">DV</div>
            <div>
              <div className="brand-title">DataVista</div>
            </div>
          </div>

          <div className="sidebar-menu">
            <div className="menu-section-label">Main Navigation</div>
            {TABS.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => setActiveTab(id)}
                className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
              >
                <div className="nav-item-left">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                {badge && <span className="badge-new">{badge}</span>}
              </button>
            ))}

            <div className="menu-section-label" style={{ marginTop: '1.25rem' }}>Sample Datasets</div>
            <button className="sidebar-nav-item" onClick={() => setActiveTab('overview')}>
              <div className="nav-item-left">
                <FileSpreadsheet size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem' }}>E-Commerce Sales</span>
              </div>
            </button>
            <button className="sidebar-nav-item" onClick={() => setActiveTab('overview')}>
              <div className="nav-item-left">
                <FileSpreadsheet size={15} color="#a855f7" />
                <span style={{ fontSize: '0.8rem' }}>Student Performance</span>
              </div>
            </button>
            <button className="sidebar-nav-item" onClick={() => setActiveTab('overview')}>
              <div className="nav-item-left">
                <FileSpreadsheet size={15} color="#10b981" />
                <span style={{ fontSize: '0.8rem' }}>Real Estate Prices</span>
              </div>
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item">
            <div className="nav-item-left">
              <Settings size={16} />
              <span>Settings</span>
            </div>
          </button>
          <button className="sidebar-nav-item">
            <div className="nav-item-left">
              <HelpCircle size={16} />
              <span>Help & Support</span>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main Workspace Wrapper ── */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="search-container">
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              className="search-input"
              placeholder="Search features, columns, or ask a question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="topbar-actions">
            {healthLoading
              ? <div className="status-badge status-checking"><span className="status-dot" />Connecting…</div>
              : healthError
              ? <div className="status-badge status-error"><span className="status-dot" />API Offline</div>
              : <div className="status-badge status-healthy"><span className="status-dot" />Live · {healthLatency}ms</div>}

            <button className="icon-btn" onClick={checkHealth} title="Ping Backend Service">
              <RefreshCw size={15} className={healthLoading ? "spin" : ""} />
            </button>

            <div className="icon-btn" title="Notifications">
              <Bell size={16} />
              <div className="notification-dot" />
            </div>

            <div className="user-avatar" title="User Account">DV</div>
          </div>
        </header>

        {/* Workspace Content */}
        <main className="workspace-content">
          {/* Upload state (No dataset loaded yet) */}
          {!dataset && (
            <>
              {/* Hero Banner Section */}
              <section className="hero-banner">
                <div className="hero-text">
                  <div className="hero-badge">
                    <Sparkles size={14} /> Full Stack Data Analysis Platform
                  </div>
                  <h1 className="hero-headline">
                    Turn your data into <span>actionable insights.</span>
                  </h1>
                  <p className="hero-subtext">
                    Upload CSV or Excel files, explore, analyze, visualize, ask questions and export — all powered by FastAPI & Pandas, no API keys required.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="pipeline-item active" style={{ padding: '0.5rem 0.85rem' }}>
                      <CheckCircle2 size={15} color="var(--success)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>100% Deterministic Engine</span>
                    </div>
                    <div className="pipeline-item active" style={{ padding: '0.5rem 0.85rem' }}>
                      <CheckCircle2 size={15} color="var(--primary)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Supports .csv, .xlsx, .xls</span>
                    </div>
                  </div>
                </div>

                {/* Upload Card */}
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)' }}>
                  <div className="card-header">
                    <h2 className="card-title"><UploadCloud size={18} color="var(--primary)" />Upload Dataset</h2>
                  </div>
                  <CsvUploader onUploadSuccess={handleUploadSuccess} loading={uploadLoading} setLoading={setUploadLoading} />
                </div>
              </section>
            </>
          )}

          {/* Dataset Active state */}
          {dataset && (
            <>
              {/* Dataset KPI Summary Bar */}
              <div className="card">
                <DatasetOverview dataset={dataset} onReset={handleReset} />
              </div>

              {/* Tab Panel Header */}
              <div className="card" style={{ padding: '1.75rem' }}>
                {activeTab === 'overview' && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>
                      <CheckCircle2 size={20} color="var(--success)" />
                      Dataset Successfully Loaded & Parsed
                    </div>
                    <p>Select any tab from the left sidebar to analyze your dataset:</p>
                    <div className="cards-grid" style={{ marginTop: '1.25rem' }}>
                      <div className="column-card" onClick={() => setActiveTab('bi-dashboard')} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>BI Dashboard</span> <ArrowUpRight size={16} />
                        </div>
                        <p style={{ fontSize: '0.825rem' }}>Power BI & Excel style slicers, KPI cards & custom charts canvas.</p>
                      </div>
                      <div className="column-card" onClick={() => setActiveTab('columns')} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Columns Inspector</span> <ArrowUpRight size={16} />
                        </div>
                        <p style={{ fontSize: '0.825rem' }}>Inferred data types, missing value percentages & sample values.</p>
                      </div>
                      <div className="column-card" onClick={() => setActiveTab('preview')} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Data Preview</span> <ArrowUpRight size={16} />
                        </div>
                        <p style={{ fontSize: '0.825rem' }}>Paginated data table with null highlighting and sorting.</p>
                      </div>
                      <div className="column-card" onClick={() => setActiveTab('quality')} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Data Quality</span> <ArrowUpRight size={16} />
                        </div>
                        <p style={{ fontSize: '0.825rem' }}>Diagnose duplicate rows, missingness and completeness score.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'bi-dashboard' && (
                  <BIDashboard
                    datasetId={dataset.dataset_id}
                    columns={dataset.columns}
                    totalRows={dataset.row_count}
                  />
                )}

                {activeTab === 'columns' && <ColumnsInspector columns={dataset.columns} />}

                {activeTab === 'preview' && (
                  <DataTable
                    datasetId={dataset.dataset_id}
                    initialRows={dataset.preview_rows}
                    columns={dataset.columns}
                    totalRows={dataset.row_count}
                  />
                )}

                {activeTab === 'quality' && (
                  qFetch.loading
                    ? <LoadingSpinner label="Computing data quality report..." />
                    : qFetch.error
                    ? <ErrorMsg msg={qFetch.error} />
                    : <QualityReport quality={qFetch.data} />
                )}

                {activeTab === 'stats' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {sFetch.loading
                      ? <LoadingSpinner label="Running Pandas describe()..." />
                      : sFetch.error
                      ? <ErrorMsg msg={sFetch.error} />
                      : <>
                          {sFetch.data?.numeric_stats?.length > 0 && (
                            <div>
                              <h3 style={sectionTitle}>Numeric Column Statistics</h3>
                              <p style={sectionSub}>Computed directly by Pandas describe()</p>
                              <NumericStatsChart numericStats={sFetch.data.numeric_stats} />
                              <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      {['Column','Type','Count','Mean','Std','Min','Q25','Median','Q75','Max','Skew'].map(h => (
                                        <th key={h}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sFetch.data.numeric_stats.map(s => (
                                      <tr key={s.column}>
                                        <td style={{ fontWeight: 600 }}>{s.column}</td>
                                        <td><span className="dtype-badge">{s.dtype}</span></td>
                                        <td>{s.count}</td>
                                        <td>{s.mean ?? '—'}</td>
                                        <td>{s.std ?? '—'}</td>
                                        <td>{s.min_val ?? '—'}</td>
                                        <td>{s.q25 ?? '—'}</td>
                                        <td>{s.median ?? '—'}</td>
                                        <td>{s.q75 ?? '—'}</td>
                                        <td>{s.max_val ?? '—'}</td>
                                        <td>{s.skewness ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {sFetch.data?.categorical_frequencies?.length > 0 && (
                            <div>
                              <h3 style={sectionTitle}>Category Frequencies</h3>
                              <p style={sectionSub}>Top category distributions</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                                {sFetch.data.categorical_frequencies.map(cf => (
                                  <div key={cf.column} className="column-card">
                                    <CategoryBarChart columnFreq={cf} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                    }

                    <div>
                      <h3 style={sectionTitle}>Correlation Matrix (Pearson)</h3>
                      <p style={sectionSub}>Pairwise linear relationship strength</p>
                      {cFetch.loading
                        ? <LoadingSpinner label="Computing Pearson correlations..." />
                        : cFetch.error
                        ? <ErrorMsg msg={cFetch.error} />
                        : <div style={{ marginTop: '1rem' }}><CorrelationHeatmap correlation={cFetch.data} /></div>
                      }
                    </div>
                  </div>
                )}

                {activeTab === 'ask' && (
                  <QuestionEngine datasetId={dataset.dataset_id} columns={dataset.columns} />
                )}

                {activeTab === 'export' && (
                  <ExportPanel
                    datasetId={dataset.dataset_id}
                    columns={dataset.columns}
                    onDatasetCleaned={handleDatasetCleaned}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function LoadingSpinner({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      <div style={{ width: 20, height: 20, border: '2px solid var(--primary)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      {label}
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div className="alert alert-error">
      <span>⚠️ {msg}</span>
    </div>
  )
}

const sectionTitle = { fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }
const sectionSub   = { fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }

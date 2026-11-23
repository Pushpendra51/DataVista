import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Layers, UploadCloud,
  ShieldCheck, BarChart2, HelpCircle, Download, Table, Columns, SlidersHorizontal,
  Search, Settings, Sparkles, CheckCircle2, ArrowUpRight,
  Menu, Sun, Moon, ChevronRight, X, WandSparkles,
  Eraser, Database, CircleCheck, ScanSearch, FolderKanban, FileText
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
import VisualizationStudio from './components/VisualizationStudio.jsx'
import MachineLearningLab from './components/MachineLearningLab.jsx'
import ReportStudio from './components/ReportStudio.jsx'
import ProjectsWorkspace from './components/ProjectsWorkspace.jsx'

const TABS = [
  { id: 'overview',     label: 'Overview',      icon: Layers },
  { id: 'projects',     label: 'My Projects',   icon: FolderKanban },
  { id: 'bi-dashboard', label: 'BI Dashboard',  icon: SlidersHorizontal },
  { id: 'columns',      label: 'Columns',       icon: Columns },
  { id: 'preview',      label: 'Data Preview',  icon: Table },
  { id: 'quality',      label: 'Data Quality',  icon: ShieldCheck },
  { id: 'eda',          label: 'Automated EDA', icon: ScanSearch },
  { id: 'stats',        label: 'Statistics',    icon: BarChart2 },
  { id: 'ask',          label: 'Ask Data (AI)', icon: HelpCircle, badge: 'NEW' },
  { id: 'visualizations', label: 'Visualization Studio', icon: BarChart2 },
  { id: 'ml',           label: 'Machine Learning Lab', icon: WandSparkles },
  { id: 'reports',      label: 'Report Studio', icon: FileText },
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
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)
  const [healthLatency, setHealthLatency] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [dataset, setDataset]         = useState(null)
  const [activeTab, setActiveTab]     = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('datavista-theme') || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('datavista-theme', theme)
  }, [theme])

  // ── Health check ──────────────────────────────────────────────────────────
  const checkHealth = async () => {
    setHealthLoading(true)
    setHealthError(null)
    const t0 = performance.now()
    try {
      const res = await fetch('/api/health')
      setHealthLatency(Math.round(performance.now() - t0))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await res.json()
    } catch (err) {
      setHealthError(err.message)
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
  const edaFetch = useFetch(did ? `/api/analytics/${did}/eda` : null, !!did && activeTab === 'eda')

  const handleUploadSuccess = (data) => { setDataset(data); setActiveTab('overview') }
  const handleReset         = () => { setDataset(null); setActiveTab('overview') }
  const handleDatasetCleaned = async (newId) => {
    if (!dataset) return
    try {
      const [previewResponse, qualityResponse] = await Promise.all([
        fetch(`/api/dataset/${newId}/preview?offset=0&limit=10`),
        fetch(`/api/analytics/${newId}/quality`),
      ])
      const preview = await previewResponse.json()
      const quality = await qualityResponse.json()
      if (!previewResponse.ok) throw new Error(preview.detail || 'Failed to load cleaned dataset')
      setDataset({
        ...dataset,
        dataset_id: newId,
        filename: `Cleaned · ${dataset.filename}`,
        row_count: preview.total_rows,
        column_count: preview.total_columns,
        columns: preview.columns,
        preview_rows: preview.rows,
        has_nulls: quality.total_missing_cells > 0,
        has_duplicates: quality.duplicate_rows > 0,
        duplicate_rows_count: quality.duplicate_rows,
      })
      setActiveTab('overview')
    } catch {
      setDataset(prev => ({ ...prev, dataset_id: newId }))
    }
  }

  const handleDatasetDelete = async (datasetId) => {
    try {
      const response = await fetch(`/api/dataset/${datasetId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Failed to delete dataset')
      setDataset(null)
      setActiveTab('overview')
    } catch (error) {
      window.alert(error.message)
    }
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileNavOpen && (
        <button
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      {/* ── Left Sidebar Navigation ── */}
      <aside className={`app-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div>
          <div className="sidebar-brand">
            <div className="brand-icon">DV</div>
            <div className="brand-copy">
              <div className="brand-title">DataVista</div>
              <div className="brand-subtitle">Analytics workspace</div>
            </div>
            <button
              className="sidebar-collapse-btn"
              type="button"
              onClick={() => setSidebarCollapsed(value => !value)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
            </button>
            <button
              className="mobile-nav-close"
              type="button"
              onClick={() => setMobileNavOpen(false)}
              title="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          <div className="sidebar-menu">
            <div className="menu-section-label">Main Navigation</div>
            {TABS.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => {
                  setActiveTab(id)
                  setMobileNavOpen(false)
                }}
                className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                title={sidebarCollapsed ? label : undefined}
              >
                <div className="nav-item-left">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                {badge && <span className="badge-new">{badge}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button
            className="sidebar-nav-item"
            type="button"
            onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}
            title="Theme preference"
          >
            <div className="nav-item-left">
              <Settings size={16} />
              <span>Theme settings</span>
            </div>
          </button>
          <button
            className="sidebar-nav-item"
            type="button"
            onClick={() => window.open('/docs', '_blank', 'noopener,noreferrer')}
          >
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
          <button
            className="mobile-menu-btn"
            type="button"
            onClick={() => setMobileNavOpen(true)}
            title="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="page-heading">
            <span className="breadcrumb">DataVista</span>
            <ChevronRight size={14} />
            <strong>{TABS.find(tab => tab.id === activeTab)?.label || 'Overview'}</strong>
          </div>
          <div className="search-container">
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              className="search-input"
              placeholder="Search workspace"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const query = searchQuery.trim().toLowerCase()
                  const match = TABS.find(tab => tab.label.toLowerCase().includes(query))
                  if (match) {
                    setActiveTab(match.id)
                    setSearchQuery('')
                  }
                }
              }}
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

            <button
              className="icon-btn"
              type="button"
              onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <div className="profile-menu-wrap">
              <button
                className="user-avatar"
                type="button"
                onClick={() => setProfileOpen(value => !value)}
                title="Workspace menu"
                aria-expanded={profileOpen}
              >
                DV
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <strong>Local workspace</strong>
                  <span>Current session</span>
                  <button type="button" onClick={() => setProfileOpen(false)}>Close menu</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Content */}
        <main className="workspace-content">
          {/* Upload state (No dataset loaded yet) */}
          {!dataset && (
            <>
              {activeTab === 'projects' && (
                <ProjectsWorkspace datasetId={null} datasetName={null} />
              )}
              {activeTab !== 'projects' && (
                <section className="hero-banner">
                <div className="hero-text">
                  <div className="hero-badge">
                    <Sparkles size={14} /> Intelligent Data Analytics Platform
                  </div>
                  <h1 className="hero-headline">
                    Turn your data into <span>actionable insights.</span>
                  </h1>
                  <p className="hero-subtext">
                    Upload your datasets, explore patterns, uncover insights, create visualizations, and generate reports — all in one intelligent analytics workspace.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="pipeline-item active" style={{ padding: '0.5rem 0.85rem' }}>
                      <CheckCircle2 size={15} color="var(--success)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Reliable Analytics Engine</span>
                    </div>
                    <div className="pipeline-item active" style={{ padding: '0.5rem 0.85rem' }}>
                      <CheckCircle2 size={15} color="var(--primary)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Supports .csv, .xlsx, .xls</span>
                    </div>
                  </div>
                </div>

                {/* Upload Card */}
                <div className="card" style={{ padding: '20px' }}>
                  <div className="card-header">
                    <h2 className="card-title"><UploadCloud size={18} color="var(--primary)" />Upload Dataset</h2>
                  </div>
                  <CsvUploader onUploadSuccess={handleUploadSuccess} loading={uploadLoading} setLoading={setUploadLoading} />
                </div>
              </section>
              )}
            </>
          )}

          {/* Dataset Active state */}
          {dataset && (
            <>
              {/* Dataset KPI Summary Bar */}
              <div className="card">
                <DatasetOverview
                  dataset={dataset}
                  onReset={handleReset}
                  onDelete={handleDatasetDelete}
                />
              </div>

              {/* Tab Panel Header */}
              <div className="card" style={{ padding: '1.75rem' }}>
                {activeTab === 'overview' && (
                  <div className="overview-dashboard">
                    <div className="overview-heading">
                      <div>
                        <p className="overview-eyebrow">Current workspace</p>
                        <h2>Welcome back to DataVista</h2>
                        <p>Continue from the dataset you loaded or start a new analysis.</p>
                      </div>
                      <span className={`dataset-status ${dataset.has_nulls || dataset.has_duplicates ? 'needs-attention' : 'ready'}`}>
                        {dataset.has_nulls || dataset.has_duplicates
                          ? <ShieldCheck size={14} />
                          : <CircleCheck size={14} />}
                        {dataset.has_nulls || dataset.has_duplicates ? 'Needs review' : 'Ready to analyze'}
                      </span>
                    </div>

                    <section className="quick-actions" aria-labelledby="quick-actions-title">
                      <div className="section-heading">
                        <div>
                          <h3 id="quick-actions-title">Quick actions</h3>
                          <p>Jump directly into your next analytical task.</p>
                        </div>
                      </div>

                      <div className="quick-action-grid">
                        <button type="button" className="quick-action-card" onClick={() => setActiveTab('preview')}>
                          <span className="quick-action-icon blue"><Table size={18} /></span>
                          <span>
                            <strong>Explore data</strong>
                            <small>Browse and inspect records</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                        <button type="button" className="quick-action-card" onClick={() => setActiveTab('quality')}>
                          <span className="quick-action-icon violet"><ShieldCheck size={18} /></span>
                          <span>
                            <strong>Check data quality</strong>
                            <small>Review missing and duplicate values</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                        <button type="button" className="quick-action-card" onClick={() => setActiveTab('stats')}>
                          <span className="quick-action-icon green"><BarChart2 size={18} /></span>
                          <span>
                            <strong>Run statistics</strong>
                            <small>View distributions and correlations</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                        <button type="button" className="quick-action-card" onClick={() => setActiveTab('ask')}>
                          <span className="quick-action-icon amber"><WandSparkles size={18} /></span>
                          <span>
                            <strong>Ask Data</strong>
                            <small>Use the safe question engine</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </section>

                    <div className="overview-content-grid">
                      <section className="recent-dataset-card" aria-labelledby="recent-dataset-title">
                        <div className="section-heading">
                          <div>
                            <h3 id="recent-dataset-title">Recent dataset</h3>
                            <p>The dataset currently active in this workspace.</p>
                          </div>
                        </div>
                        <button type="button" className="dataset-list-row" onClick={() => setActiveTab('preview')}>
                          <span className="dataset-file-icon"><Database size={18} /></span>
                          <span className="dataset-file-details">
                            <strong>{dataset.filename}</strong>
                            <small>
                              {dataset.row_count.toLocaleString()} rows · {dataset.column_count} columns
                            </small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      </section>

                      <section className="recommended-card" aria-labelledby="recommended-title">
                        <div className="section-heading">
                          <div>
                            <h3 id="recommended-title">Recommended next step</h3>
                            <p>Based on the actual data quality report.</p>
                          </div>
                        </div>
                        {dataset.has_nulls || dataset.has_duplicates ? (
                          <button type="button" className="recommendation-row" onClick={() => setActiveTab('export')}>
                            <span className="quick-action-icon amber"><Eraser size={18} /></span>
                            <span>
                              <strong>Clean dataset</strong>
                              <small>
                                {dataset.has_nulls ? 'Handle missing values' : 'Remove duplicate records'}
                              </small>
                            </span>
                            <ArrowUpRight size={16} />
                          </button>
                        ) : (
                          <button type="button" className="recommendation-row" onClick={() => setActiveTab('bi-dashboard')}>
                            <span className="quick-action-icon green"><SlidersHorizontal size={18} /></span>
                            <span>
                              <strong>Build a BI dashboard</strong>
                              <small>Explore KPIs and interactive visualizations</small>
                            </span>
                            <ArrowUpRight size={16} />
                          </button>
                        )}

                        {activeTab === 'projects' && (
                          <ProjectsWorkspace
                            datasetId={dataset?.dataset_id}
                            datasetName={dataset?.filename}
                          />
                        )}
                      </section>
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

                {activeTab === 'eda' && (
                  edaFetch.loading
                    ? <LoadingSpinner label="Running automated exploratory analysis..." />
                    : edaFetch.error
                    ? <ErrorMsg msg={edaFetch.error} />
                    : edaFetch.data && (
                        <div className="eda-dashboard">
                          <div className="eda-heading">
                            <div>
                              <p className="overview-eyebrow">Automated analysis</p>
                              <h2>Dataset findings</h2>
                            </div>
                            <span className="dataset-status ready">
                              <CircleCheck size={14} />
                              Calculated from data
                            </span>
                          </div>

                          <div className="kpi-grid">
                            <div className="kpi-card">
                              <div className="kpi-title">Rows</div>
                              <div className="kpi-value">{edaFetch.data.row_count.toLocaleString()}</div>
                            </div>
                            <div className="kpi-card">
                              <div className="kpi-title">Columns</div>
                              <div className="kpi-value">{edaFetch.data.column_count}</div>
                            </div>
                            <div className="kpi-card">
                              <div className="kpi-title">Missing values</div>
                              <div className="kpi-value">{edaFetch.data.missing_values}</div>
                            </div>
                            <div className="kpi-card">
                              <div className="kpi-title">Duplicate rows</div>
                              <div className="kpi-value">{edaFetch.data.duplicate_rows}</div>
                            </div>
                          </div>

                          <div className="eda-content-grid">
                            <section className="eda-panel">
                              <h3>Key findings</h3>
                              <div className="finding-list">
                                {edaFetch.data.findings.map((finding, index) => (
                                  <div key={index} className="finding-row">
                                    <CheckCircle2 size={16} />
                                    <span>{finding}</span>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className="eda-panel">
                              <h3>Recommended visualizations</h3>
                              <div className="finding-list">
                                {edaFetch.data.recommended_visualizations.map((item, index) => (
                                  <div key={index} className="finding-row">
                                    <BarChart2 size={16} />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>

                          {edaFetch.data.outliers.length > 0 && (
                            <section className="eda-panel">
                              <h3>IQR outlier analysis</h3>
                              <div className="table-wrapper">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>Column</th>
                                      <th>Outliers</th>
                                      <th>Percentage</th>
                                      <th>Lower bound</th>
                                      <th>Upper bound</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {edaFetch.data.outliers.map(item => (
                                      <tr key={item.column}>
                                        <td><strong>{item.column}</strong></td>
                                        <td>{item.count}</td>
                                        <td>{item.percentage}%</td>
                                        <td>{item.lower_bound ?? '—'}</td>
                                        <td>{item.upper_bound ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          )}
                        </div>
                      )
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

                {activeTab === 'visualizations' && (
                  <VisualizationStudio datasetId={dataset.dataset_id} columns={dataset.columns} />
                )}

                {activeTab === 'ml' && (
                  <MachineLearningLab datasetId={dataset.dataset_id} columns={dataset.columns} />
                )}

                {activeTab === 'reports' && (
                  <ReportStudio datasetId={dataset.dataset_id} datasetName={dataset.filename} />
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

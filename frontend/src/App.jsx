import { useState, useEffect, useCallback } from 'react'
import {
  Activity, RefreshCw, Layers, UploadCloud,
  ShieldCheck, BarChart2, HelpCircle, Download, Table, Columns
} from 'lucide-react'
import CsvUploader from './components/CsvUploader.jsx'
import DatasetOverview from './components/DatasetOverview.jsx'
import ColumnsInspector from './components/ColumnsInspector.jsx'
import DataTable from './components/DataTable.jsx'
import QualityReport from './components/QualityReport.jsx'
import { CategoryBarChart, NumericStatsChart, CorrelationHeatmap } from './components/Charts.jsx'
import QuestionEngine from './components/QuestionEngine.jsx'
import ExportPanel from './components/ExportPanel.jsx'

const TABS = [
  { id: 'overview',   label: 'Overview',    icon: Layers },
  { id: 'columns',    label: 'Columns',     icon: Columns },
  { id: 'preview',    label: 'Data Preview',icon: Table },
  { id: 'quality',    label: 'Data Quality',icon: ShieldCheck },
  { id: 'stats',      label: 'Statistics',  icon: BarChart2 },
  { id: 'ask',        label: 'Ask a Question', icon: HelpCircle },
  { id: 'export',     label: 'Clean & Export', icon: Download },
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
    // Switch the active session to the cleaned dataset transparently
    if (dataset) setDataset(prev => ({ ...prev, dataset_id: newId }))
  }

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-icon">IA</div>
            <div>
              <span className="brand-title">InsightAI</span>
              <span className="brand-badge">v0.3.0</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {healthLoading
              ? <div className="status-badge status-checking"><span className="status-dot" />Connecting…</div>
              : healthError
              ? <div className="status-badge status-error"><span className="status-dot" />API Offline</div>
              : <div className="status-badge status-healthy"><span className="status-dot" />Live · {healthLatency}ms</div>}
            <button className="btn btn-secondary" onClick={checkHealth} disabled={healthLoading}
              id="refresh-health-btn" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>
              <RefreshCw size={13} /> Ping
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">

        {/* Upload state */}
        {!dataset && (
          <>
            <section className="hero-section">
              <div className="hero-tag"><Layers size={14} />Full Stack Data Analysis Platform</div>
              <h1 className="hero-title">Upload a CSV. Understand it completely.</h1>
              <p className="hero-subtitle">
                Inspect data quality, compute descriptive statistics, explore correlations,
                visualize patterns with Recharts, ask safe natural-language queries,
                clean and export — all powered by Pandas and FastAPI, no AI keys required.
              </p>
            </section>
            <div className="card" style={{ padding: '1.75rem' }}>
              <div className="card-header">
                <h2 className="card-title"><UploadCloud size={17} color="var(--primary)" />Upload CSV Dataset</h2>
              </div>
              <CsvUploader onUploadSuccess={handleUploadSuccess} loading={uploadLoading} setLoading={setUploadLoading} />
            </div>
          </>
        )}

        {/* Dataset state */}
        {dataset && (
          <>
            {/* KPI bar */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <DatasetOverview dataset={dataset} onReset={handleReset} />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.1rem', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} id={`tab-${id}`} onClick={() => setActiveTab(id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0.65rem 1.1rem', whiteSpace: 'nowrap',
                    fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-main)',
                    color: activeTab === id ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent',
                    marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    transition: 'color 0.15s',
                  }}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>

            {/* Tab panel */}
            <div className="card" style={{ padding: '1.75rem' }}>

              {activeTab === 'overview' && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  <p>✅ Dataset successfully uploaded and parsed by Pandas. Navigate the tabs above to explore:</p>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                    <li><strong>Columns</strong> — inferred data types, null %, unique counts, sample values</li>
                    <li><strong>Data Preview</strong> — paginated row browser with null highlighting</li>
                    <li><strong>Data Quality</strong> — missing value bars, duplicate count, completeness score</li>
                    <li><strong>Statistics</strong> — mean/std/quartiles for numeric cols, category frequencies, correlation heatmap</li>
                    <li><strong>Ask a Question</strong> — safe whitelisted query engine (sum, mean, top_n, groupby…)</li>
                    <li><strong>Clean &amp; Export</strong> — drop duplicates, fill nulls, download CSV or JSON summary</li>
                  </ul>
                </div>
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
                  ? <LoadingSpinner label="Computing data quality…" />
                  : qFetch.error
                  ? <ErrorMsg msg={qFetch.error} />
                  : <QualityReport quality={qFetch.data} />
              )}

              {activeTab === 'stats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {sFetch.loading
                    ? <LoadingSpinner label="Running Pandas describe()…" />
                    : sFetch.error
                    ? <ErrorMsg msg={sFetch.error} />
                    : <>
                        {/* Numeric stats table */}
                        {sFetch.data?.numeric_stats?.length > 0 && (
                          <div>
                            <h3 style={sectionTitle}>Numeric Column Statistics</h3>
                            <p style={sectionSub}>Computed by Pandas describe() — not estimated.</p>
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

                        {/* Category frequency charts */}
                        {sFetch.data?.categorical_frequencies?.length > 0 && (
                          <div>
                            <h3 style={sectionTitle}>Category Frequencies</h3>
                            <p style={sectionSub}>Top values per categorical column.</p>
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

                  {/* Correlation */}
                  <div>
                    <h3 style={sectionTitle}>Correlation Matrix (Pearson)</h3>
                    <p style={sectionSub}>Only numeric columns are included.</p>
                    {cFetch.loading
                      ? <LoadingSpinner label="Computing correlations…" />
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

      <footer className="app-footer">
        InsightAI · CSV Data Analysis &amp; Reporting · FastAPI + Pandas + Recharts + React
      </footer>
    </div>
  )
}

// ── Mini helper components ──────────────────────────────────────────────────
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

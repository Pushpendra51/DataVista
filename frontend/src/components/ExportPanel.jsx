import { useState } from 'react'
import { Download, FileText, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'

const CLEANING_ACTIONS = [
  { value: 'drop_duplicates',  label: 'Drop Duplicate Rows',   needsCol: false, needsFill: false },
  { value: 'drop_nulls',       label: 'Drop Rows with Nulls',  needsCol: 'optional', needsFill: false },
  { value: 'fill_nulls_mean',  label: 'Fill Nulls → Mean',     needsCol: 'optional', needsFill: false },
  { value: 'fill_nulls_median',label: 'Fill Nulls → Median',   needsCol: 'optional', needsFill: false },
  { value: 'fill_nulls_mode',  label: 'Fill Nulls → Mode',     needsCol: 'required', needsFill: false },
  { value: 'fill_nulls_value', label: 'Fill Nulls → Custom Value', needsCol: 'required', needsFill: true },
]

export default function ExportPanel({ datasetId, columns, onDatasetCleaned }) {
  const [cleanAction, setCleanAction] = useState('drop_duplicates')
  const [cleanColumn, setCleanColumn] = useState('')
  const [fillValue, setFillValue] = useState('')
  const [cleanLoading, setCleanLoading] = useState(false)
  const [cleanResult, setCleanResult] = useState(null)
  const [cleanError, setCleanError] = useState(null)

  const selectedAction = CLEANING_ACTIONS.find(a => a.value === cleanAction)

  const handleClean = async () => {
    setCleanLoading(true)
    setCleanResult(null)
    setCleanError(null)
    const body = { action: cleanAction }
    if (cleanColumn) body.column = cleanColumn
    if (fillValue) body.fill_value = fillValue
    try {
      const res = await fetch(`/api/clean/${datasetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
      setCleanResult(data)
      onDatasetCleaned && onDatasetCleaned(data.new_dataset_id)
    } catch (err) {
      setCleanError(err.message)
    } finally {
      setCleanLoading(false)
    }
  }

  const handleExport = (type) => {
    window.open(`/api/export/${datasetId}/${type}`, '_blank')
  }

  const selectStyle = {
    background: '#0d1117',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#f9fafb',
    padding: '0.55rem 0.85rem',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Cleaning ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trash2 size={16} color="var(--warning)" /> Data Cleaning
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Each action creates a new cleaned dataset — the original is preserved.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action</label>
            <select id="clean-action-select" value={cleanAction} onChange={e => setCleanAction(e.target.value)} style={selectStyle}>
              {CLEANING_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          {selectedAction?.needsCol && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Column {selectedAction.needsCol === 'optional' ? '(optional)' : '(required)'}
              </label>
              <select id="clean-column-select" value={cleanColumn} onChange={e => setCleanColumn(e.target.value)} style={selectStyle}>
                <option value="">— All columns —</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          {selectedAction?.needsFill && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fill Value</label>
              <input
                id="clean-fill-value-input"
                type="text"
                value={fillValue}
                placeholder="e.g. Unknown, 0, N/A"
                onChange={e => setFillValue(e.target.value)}
                style={{ ...selectStyle, cursor: 'text' }}
              />
            </div>
          )}
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleClean}
          disabled={cleanLoading}
          id="apply-cleaning-btn"
          style={{ alignSelf: 'flex-start' }}
        >
          {cleanLoading ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
          {cleanLoading ? 'Processing...' : 'Apply Cleaning'}
        </button>

        {cleanError && (
          <div className="alert alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{cleanError}</span>
          </div>
        )}

        {cleanResult && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>{cleanResult.message}</strong>
              <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#6ee7b7' }}>
                Rows: {cleanResult.rows_before} → {cleanResult.rows_after} ({cleanResult.rows_removed} removed)
                · New session ID: <code>{cleanResult.new_dataset_id.slice(0, 8)}...</code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Exports ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} color="var(--primary)" /> Export
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Download the current dataset session or a full analysis summary.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleExport('csv')}
            id="export-csv-btn"
          >
            <Download size={15} />
            Download CSV
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport('summary')}
            id="export-summary-btn"
          >
            <FileText size={15} />
            Download Analysis Summary (JSON)
          </button>
        </div>
        <p style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>
          If you applied a cleaning action, use the new session ID from the result above to export the cleaned version.
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'

const SUPPORTED_OPS = [
  { value: 'sum',          label: 'Sum',          hint: 'Total of all values (numeric)' },
  { value: 'mean',         label: 'Average (Mean)', hint: 'Arithmetic mean (numeric)' },
  { value: 'median',       label: 'Median',        hint: 'Middle value (numeric)' },
  { value: 'min',          label: 'Minimum',       hint: 'Smallest value (numeric)' },
  { value: 'max',          label: 'Maximum',       hint: 'Largest value (numeric)' },
  { value: 'count',        label: 'Count',         hint: 'Non-null record count' },
  { value: 'unique_count', label: 'Unique Count',  hint: 'Number of distinct values' },
  { value: 'null_count',   label: 'Null Count',    hint: 'How many values are missing' },
  { value: 'top_n',        label: 'Top N Categories', hint: 'Most frequent values (categorical)' },
  { value: 'groupby',      label: 'Group By + Mean',  hint: 'Average of a numeric col per group' },
]

export default function QuestionEngine({ datasetId, columns }) {
  const [operation, setOperation] = useState('sum')
  const [column, setColumn] = useState(columns[0]?.name || '')
  const [groupBy, setGroupBy] = useState('')
  const [topN, setTopN] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const needsGroupBy = operation === 'groupby'
  const needsTopN = operation === 'top_n'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)

    const body = { operation, column, top_n: topN }
    if (needsGroupBy) body.group_by = groupBy

    try {
      const res = await fetch(`/api/query/${datasetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const colOptions = columns.map(c => (
    <option key={c.name} value={c.name}>{c.name} ({c.dtype})</option>
  ))

  const hint = SUPPORTED_OPS.find(o => o.value === operation)?.hint || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <HelpCircle size={16} color="var(--primary)" style={{ marginTop: 3 }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          All operations run real Pandas calculations on the uploaded dataset.
          No code is executed from your input — operations are selected from a strict whitelist.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Operation selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Operation
            </label>
            <select
              id="query-operation-select"
              value={operation}
              onChange={e => setOperation(e.target.value)}
              style={selectStyle}
            >
              {SUPPORTED_OPS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{hint}</span>
          </div>

          {/* Column selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Target Column
            </label>
            <select
              id="query-column-select"
              value={column}
              onChange={e => setColumn(e.target.value)}
              style={selectStyle}
            >
              {colOptions}
            </select>
          </div>

          {/* Group-by column */}
          {needsGroupBy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Group By Column
              </label>
              <select
                id="query-groupby-select"
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                style={selectStyle}
              >
                <option value="">— Select column —</option>
                {colOptions}
              </select>
            </div>
          )}

          {/* Top N */}
          {needsTopN && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Top N
              </label>
              <input
                type="number"
                min={1} max={50}
                value={topN}
                onChange={e => setTopN(Number(e.target.value))}
                style={{ ...selectStyle }}
                id="query-topn-input"
              />
            </div>
          )}
        </div>

        <div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="query-submit-btn"
          >
            {loading ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            {loading ? 'Calculating...' : 'Run Query'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {result.supported
              ? <CheckCircle2 size={18} color="var(--success)" />
              : <AlertCircle size={18} color="var(--warning)" />}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {result.supported ? 'Result' : 'Not Supported'}
            </span>
          </div>
          <div className="code-box" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {result.formatted_result}
          </div>
          {result.supported && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Operation: <strong>{result.operation}</strong> ·
              Column: <strong>{result.column}</strong>
              {result.group_by && <> · Grouped by: <strong>{result.group_by}</strong></>}
            </div>
          )}
        </div>
      )}
    </div>
  )
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

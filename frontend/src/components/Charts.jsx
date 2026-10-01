import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a3e635']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.825rem'
      }}>
        <p style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// ─── Category Frequency Bar Chart ─────────────────────────────────────────────
export function CategoryBarChart({ columnFreq }) {
  if (!columnFreq || columnFreq.frequencies.length === 0) return null

  const data = columnFreq.frequencies.map(f => ({
    name: f.value.length > 12 ? f.value.slice(0, 12) + '…' : f.value,
    fullName: f.value,
    Count: f.count,
    '%': f.percentage,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        {columnFreq.column}
        <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: 'var(--text-dim)' }}>
          ({columnFreq.total_unique} unique)
        </span>
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Count" radius={[3, 3, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Numeric Stats Bar Chart (mean comparison) ────────────────────────────────
export function NumericStatsChart({ numericStats }) {
  if (!numericStats || numericStats.length === 0) return null

  const data = numericStats
    .filter(s => s.mean !== null)
    .map(s => ({
      name: s.column.length > 12 ? s.column.slice(0, 12) + '…' : s.column,
      Mean: s.mean,
      Min: s.min_val,
      Max: s.max_val,
    }))

  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#9ca3af' }} />
        <Bar dataKey="Min" fill="#6b7280" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Mean" fill="#3b82f6" fillOpacity={0.9} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Max" fill="#8b5cf6" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Correlation Heat Grid (CSS grid, no extra lib) ────────────────────────────
export function CorrelationHeatmap({ correlation }) {
  if (!correlation || correlation.columns.length < 2) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Correlation requires at least 2 numeric columns.
      </p>
    )
  }

  const { columns, matrix } = correlation

  const getColor = (val) => {
    if (val === null) return '#1e293b'
    const v = Math.max(-1, Math.min(1, val))
    if (v > 0) {
      const g = Math.round(59 + (130 - 59) * v)
      return `rgba(59, ${g}, 246, ${0.15 + Math.abs(v) * 0.7})`
    } else {
      const intensity = Math.abs(v)
      return `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`
    }
  }

  const cellSize = Math.max(50, Math.min(80, Math.floor(520 / columns.length)))

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-block', minWidth: 'max-content' }}>
        {/* Header row */}
        <div style={{ display: 'flex', marginLeft: `${cellSize + 8}px` }}>
          {columns.map(col => (
            <div key={col} style={{
              width: cellSize, fontSize: '0.7rem', color: '#9ca3af',
              textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', padding: '0 2px 4px',
            }}>
              {col.length > 8 ? col.slice(0, 8) + '…' : col}
            </div>
          ))}
        </div>
        {/* Matrix rows */}
        {matrix.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
            <div style={{
              width: cellSize + 8, fontSize: '0.7rem', color: '#9ca3af',
              textAlign: 'right', paddingRight: 8, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {columns[i].length > 10 ? columns[i].slice(0, 10) + '…' : columns[i]}
            </div>
            {row.map((val, j) => (
              <div key={j} style={{
                width: cellSize, height: cellSize,
                background: getColor(val),
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 600,
                color: val !== null && Math.abs(val) > 0.3 ? '#fff' : '#9ca3af',
                marginRight: 3,
              }}>
                {val !== null ? val.toFixed(2) : 'N/A'}
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
          <div style={{ width: 14, height: 14, background: 'rgba(239,68,68,0.8)', borderRadius: 3 }} />
          <span>−1 (neg)</span>
          <div style={{ flex: 1, height: 6, background: 'linear-gradient(90deg, rgba(239,68,68,0.7), #1e293b, rgba(59,130,246,0.8))', borderRadius: 9999 }} />
          <span>+1 (pos)</span>
          <div style={{ width: 14, height: 14, background: 'rgba(59,130,246,0.8)', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  )
}

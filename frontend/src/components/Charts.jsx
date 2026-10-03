import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
  LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts'

/* Midnight Aurora Harmonized Spectrum */
const CHART_COLORS = ['#2dd4bf', '#818cf8', '#34d399', '#38bdf8', '#f472b6', '#a78bfa', '#fbbf24', '#f87171']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#090e1a', border: '1px solid rgba(45, 212, 191, 0.25)',
        borderRadius: '8px', padding: '0.65rem 1rem', fontSize: '0.825rem',
        boxShadow: '0 12px 30px -4px rgba(0,0,0,0.7), 0 0 15px rgba(45,212,191,0.1)', zIndex: 100
      }}>
        {label && <p style={{ color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#2dd4bf', fontWeight: 600, margin: '2px 0' }}>
            {p.name}: {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value.toLocaleString() : p.value.toFixed(2)) : p.value}
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
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Count" radius={[3, 3, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.88} />
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
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8' }} />
        <Bar dataKey="Min" fill="#475569" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Mean" fill="#2dd4bf" fillOpacity={0.92} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Max" fill="#818cf8" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
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
    if (val === null) return '#0d1322'
    const v = Math.max(-1, Math.min(1, val))
    if (v > 0) {
      // Ethereal Aurora Teal / Cyan gradient
      return `rgba(45, 212, 191, ${0.15 + Math.abs(v) * 0.72})`
    } else {
      // Aurora Coral Red gradient
      return `rgba(248, 113, 113, ${0.15 + Math.abs(v) * 0.72})`
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
              width: cellSize, fontSize: '0.7rem', color: '#94a3b8',
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
              width: cellSize + 8, fontSize: '0.7rem', color: '#94a3b8',
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
                color: val !== null && Math.abs(val) > 0.3 ? '#fff' : '#94a3b8',
                marginRight: 3,
              }}>
                {val !== null ? val.toFixed(2) : 'N/A'}
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <div style={{ width: 14, height: 14, background: 'rgba(248,113,113,0.85)', borderRadius: 3 }} />
          <span>−1 (neg)</span>
          <div style={{ flex: 1, height: 6, background: 'linear-gradient(90deg, rgba(248,113,113,0.7), #0d1322, rgba(45,212,191,0.8))', borderRadius: 9999 }} />
          <span>+1 (pos)</span>
          <div style={{ width: 14, height: 14, background: 'rgba(45,212,191,0.85)', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Power BI Style Donut Chart ───────────────────────────────────────────────
export function BIDonutChart({ data, valueKey = 'value', nameKey = 'name', height = 220 }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data to render</p>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={75}
          paddingAngle={3}
          dataKey={valueKey}
          nameKey={nameKey}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} layout="horizontal" align="center" verticalAlign="bottom" />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Power BI Style Line Chart ────────────────────────────────────────────────
export function BILineChart({ data, xKey = 'name', yKey = 'value', color = '#2dd4bf', height = 220 }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data to render</p>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Power BI Style Scatter Correlation Plot ─────────────────────────────────
export function BIScatterChart({ data, xKey, yKey, xLabel, yLabel, height = 240 }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data to render</p>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="x" name={xLabel || xKey} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis dataKey="y" name={yLabel || yKey} tick={{ fill: '#64748b', fontSize: 11 }} />
        <ZAxis dataKey="label" name="Item" />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Points" data={data} fill="#818cf8" fillOpacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

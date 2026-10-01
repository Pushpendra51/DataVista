import { Database, Hash, Type, HelpCircle } from 'lucide-react'

export default function ColumnsInspector({ columns }) {
  if (!columns || columns.length === 0) return null

  const getTypeIcon = (dtype) => {
    if (dtype.includes('int') || dtype.includes('float')) {
      return <Hash size={14} color="#60a5fa" />
    }
    if (dtype.includes('object') || dtype.includes('string')) {
      return <Type size={14} color="#a78bfa" />
    }
    return <Database size={14} color="#34d399" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Column Schema & Data Types ({columns.length} Columns)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Data types inferred directly by Pandas engine
          </p>
        </div>
      </div>

      <div className="columns-grid">
        {columns.map((col) => (
          <div key={col.name} className="column-card">
            <div className="column-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {getTypeIcon(col.dtype)}
                <span className="column-name">{col.name}</span>
              </div>
              <span className="dtype-badge">{col.dtype}</span>
            </div>

            <div className="column-stats">
              <span>
                Valid: <strong>{col.non_null_count}</strong>
              </span>
              <span>
                Missing:{' '}
                <strong style={{ color: col.null_count > 0 ? 'var(--warning)' : 'inherit' }}>
                  {col.null_count} ({col.null_percentage}%)
                </strong>
              </span>
            </div>

            <div className="column-stats">
              <span>
                Unique: <strong>{col.unique_count}</strong>
              </span>
            </div>

            {col.sample_values && col.sample_values.length > 0 && (
              <div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                  Sample Values:
                </span>
                <div className="sample-chips">
                  {col.sample_values.map((val, idx) => (
                    <span key={idx} className="sample-chip">
                      {String(val)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

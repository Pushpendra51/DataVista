import { AlertTriangle, CheckCircle2, Users, Hash } from 'lucide-react'

export default function QualityReport({ quality }) {
  if (!quality) return null

  const completePct = quality.complete_row_percentage
  const missingPct = quality.total_missing_percentage

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title"><Users size={14} /> Complete Rows</div>
          <div className="kpi-value" style={{ color: completePct === 100 ? 'var(--success)' : 'var(--warning)' }}>
            {quality.complete_rows.toLocaleString()}
          </div>
          <div className="kpi-subtext">{completePct}% of total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title"><Hash size={14} /> Missing Cells</div>
          <div className="kpi-value" style={{ color: quality.total_missing_cells > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {quality.total_missing_cells}
          </div>
          <div className="kpi-subtext">{missingPct}% of all cells</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title"><AlertTriangle size={14} /> Duplicate Rows</div>
          <div className="kpi-value" style={{ color: quality.duplicate_rows > 0 ? 'var(--error)' : 'var(--success)' }}>
            {quality.duplicate_rows}
          </div>
          <div className="kpi-subtext">{quality.duplicate_percentage}% duplication rate</div>
        </div>
      </div>

      {/* Per-column null breakdown */}
      {quality.columns_with_nulls.length === 0 ? (
        <div className="alert alert-success">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>No missing values detected. Dataset has complete data in all {quality.total_columns} columns.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Columns with Missing Values
          </h4>
          {quality.columns_with_nulls.map((col) => (
            <div key={col.column} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>{col.column}</span>
                <span style={{ color: 'var(--warning)' }}>
                  {col.null_count} missing ({col.null_percentage}%)
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${col.null_percentage}%`,
                  background: `linear-gradient(90deg, var(--warning), var(--error))`,
                  borderRadius: '9999px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

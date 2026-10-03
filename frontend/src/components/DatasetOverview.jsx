import { Rows, Columns, HardDrive, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'

export default function DatasetOverview({ dataset, onReset }) {
  if (!dataset) return null

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const totalNullCount = dataset.columns.reduce((acc, col) => acc + col.null_count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Dataset Overview: <span style={{ color: 'var(--primary)' }}>{dataset.filename}</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Session ID: <code style={{ color: '#38bdf8' }}>{dataset.dataset_id.slice(0, 8)}...</code>
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={onReset}
          title="Upload a different dataset"
          id="reset-dataset-btn"
        >
          <RotateCcw size={14} />
          Upload Another Dataset
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">
            <Rows size={16} /> Total Rows
          </div>
          <div className="kpi-value">{dataset.row_count.toLocaleString()}</div>
          <div className="kpi-subtext">Individual records</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <Columns size={16} /> Total Columns
          </div>
          <div className="kpi-value">{dataset.column_count}</div>
          <div className="kpi-subtext">Features & attributes</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <HardDrive size={16} /> File Size
          </div>
          <div className="kpi-value">{formatBytes(dataset.file_size_bytes)}</div>
          <div className="kpi-subtext">In-memory parsed</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            {totalNullCount > 0 ? (
              <AlertTriangle size={16} color="var(--warning)" />
            ) : (
              <CheckCircle size={16} color="var(--success)" />
            )}
            Missing Values
          </div>
          <div className="kpi-value" style={{ color: totalNullCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {totalNullCount}
          </div>
          <div className="kpi-subtext">
            {totalNullCount > 0 ? 'Detected in columns' : 'Complete data integrity'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            {dataset.has_duplicates ? (
              <AlertTriangle size={16} color="var(--warning)" />
            ) : (
              <CheckCircle size={16} color="var(--success)" />
            )}
            Duplicate Rows
          </div>
          <div className="kpi-value" style={{ color: dataset.has_duplicates ? 'var(--warning)' : 'var(--success)' }}>
            {dataset.duplicate_rows_count}
          </div>
          <div className="kpi-subtext">
            {dataset.has_duplicates ? 'Redundant rows detected' : 'No exact duplicate rows'}
          </div>
        </div>
      </div>
    </div>
  )
}

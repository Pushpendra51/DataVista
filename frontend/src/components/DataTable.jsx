import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Table, Loader2 } from 'lucide-react'

export default function DataTable({ datasetId, initialRows, columns, totalRows }) {
  const [rows, setRows] = useState(initialRows || [])
  const [offset, setOffset] = useState(0)
  const limit = 10
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Sync rows if initialRows changes (e.g. newly uploaded file)
  useEffect(() => {
    setRows(initialRows || [])
    setOffset(0)
  }, [initialRows, datasetId])

  const fetchPage = async (newOffset) => {
    if (newOffset < 0 || newOffset >= totalRows) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/dataset/${datasetId}/preview?offset=${newOffset}&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error(`Failed to load page: HTTP ${response.status}`)
      }
      const data = await response.json()
      setRows(data.rows)
      setOffset(newOffset)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startRow = totalRows === 0 ? 0 : offset + 1
  const endRow = Math.min(offset + limit, totalRows)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Table size={18} color="var(--primary)" />
            Dataset Preview
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing rows {startRow.toLocaleString()}–{endRow.toLocaleString()} of {totalRows.toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchPage(offset - limit)}
            disabled={offset === 0 || loading}
            id="prev-page-btn"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fetchPage(offset + limit)}
            disabled={offset + limit >= totalRows || loading}
            id="next-page-btn"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ padding: '0.5rem 1rem' }}>
          {error}
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table" id="dataset-preview-table">
          <thead>
            <tr>
              <th className="row-index-cell">#</th>
              {columns.map((col) => (
                <th key={col.name}>
                  <div>{col.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                    {col.dtype}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="spin" />
                    Fetching rows from backend...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No rows found in this slice.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="row-index-cell">{offset + rowIdx + 1}</td>
                  {columns.map((col) => {
                    const val = row[col.name]
                    return (
                      <td key={col.name}>
                        {val === null || val === undefined ? (
                          <span className="null-cell">null</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls" style={{ borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
          Page {Math.floor(offset / limit) + 1} of {Math.max(1, Math.ceil(totalRows / limit))}
        </span>
        <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
          Rows per page: {limit}
        </span>
      </div>
    </div>
  )
}

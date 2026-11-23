import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Table, Loader2, Search, Columns3, ArrowUpDown } from 'lucide-react'

export default function DataTable({ datasetId, initialRows, columns, totalRows }) {
  const [rows, setRows] = useState(initialRows || [])
  const [offset, setOffset] = useState(0)
  const limit = 10
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns.map(col => col.name)))
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const [matchedRows, setMatchedRows] = useState(totalRows)
  const searchTimer = useRef(null)

  // Sync rows if initialRows changes (e.g. newly uploaded file)
  useEffect(() => {
    setRows(initialRows || [])
    setOffset(0)
    setVisibleColumns(new Set(columns.map(col => col.name)))
    setSearch('')
    setSortBy('')
    setMatchedRows(totalRows)
  }, [initialRows, datasetId])

  const fetchPage = async (newOffset, overrides = {}) => {
    if (newOffset < 0) return
    setLoading(true)
    setError(null)
    const nextSearch = overrides.search ?? search
    const nextSortBy = overrides.sortBy ?? sortBy
    const nextSortDirection = overrides.sortDirection ?? sortDirection
    const params = new URLSearchParams({
      offset: String(newOffset),
      limit: String(limit),
      search: nextSearch,
      sort_direction: nextSortDirection,
    })
    if (nextSortBy) params.set('sort_by', nextSortBy)
    try {
      const response = await fetch(
        `/api/dataset/${datasetId}/preview?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error(`Failed to load page: HTTP ${response.status}`)
      }
      const data = await response.json()
      setRows(data.rows)
      setMatchedRows(data.total_rows)
      setOffset(newOffset)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startRow = matchedRows === 0 ? 0 : offset + 1
  const endRow = Math.min(offset + limit, matchedRows)
  const shownColumns = columns.filter(col => visibleColumns.has(col.name))

  const handleSearch = (value) => {
    setSearch(value)
    setOffset(0)
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      fetchPage(0, { search: value })
    }, 300)
  }

  const handleSort = (columnName) => {
    const nextDirection = sortBy === columnName && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortBy(columnName)
    setSortDirection(nextDirection)
    setOffset(0)
    fetchPage(0, { sortBy: columnName, sortDirection: nextDirection })
  }

  const toggleColumn = (columnName) => {
    setVisibleColumns(previous => {
      const next = new Set(previous)
      if (next.has(columnName)) next.delete(columnName)
      else next.add(columnName)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Table size={18} color="var(--primary)" />
            Dataset Preview
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing rows {startRow.toLocaleString()}–{endRow.toLocaleString()} of {matchedRows.toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setColumnMenuOpen(value => !value)}
            aria-expanded={columnMenuOpen}
          >
            <Columns3 size={16} />
            Columns
          </button>
          {columnMenuOpen && (
            <div className="column-picker-menu">
              {columns.map(col => (
                <label key={col.name}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.name)}
                    onChange={() => toggleColumn(col.name)}
                  />
                  <span>{col.name}</span>
                </label>
              ))}
            </div>
          )}
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
            disabled={offset + limit >= matchedRows || loading}
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

      <div className="data-table-toolbar">
        <label className="table-search">
          <Search size={15} />
          <input
            type="search"
            value={search}
            onChange={event => handleSearch(event.target.value)}
            placeholder="Search across dataset"
          />
        </label>
        {search && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleSearch('')}
          >
            Clear search
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <table className="data-table" id="dataset-preview-table">
          <thead>
            <tr>
              <th className="row-index-cell">#</th>
              {shownColumns.map((col) => (
                <th key={col.name}>
                  <button
                    type="button"
                    className="table-sort-button"
                    onClick={() => handleSort(col.name)}
                  >
                    <span>{col.name}</span>
                    <ArrowUpDown size={12} />
                  </button>
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
                <td colSpan={shownColumns.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="spin" />
                    Fetching rows from backend...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={shownColumns.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No rows found in this slice.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="row-index-cell">{offset + rowIdx + 1}</td>
                  {shownColumns.map((col) => {
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
          Page {Math.floor(offset / limit) + 1} of {Math.max(1, Math.ceil(matchedRows / limit))}
        </span>
        <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
          Rows per page: {limit}
        </span>
      </div>
    </div>
  )
}

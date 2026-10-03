import { useState, useEffect, useMemo } from 'react'
import {
  SlidersHorizontal, Filter, Plus, Trash2, Edit3, RotateCcw,
  BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  ScatterChart as ScatterIcon, Table as TableIcon, Activity,
  Maximize2, CheckCircle2, ChevronRight, Layers, ArrowUpRight, ArrowDownRight, Printer
} from 'lucide-react'
import {
  CategoryBarChart, BIDonutChart, BILineChart, BIScatterChart
} from './Charts.jsx'

export default function BIDashboard({ datasetId, columns, totalRows }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Slicer filter states: { colName: Set of selected values OR { min, max } }
  const [slicers, setSlicers] = useState({})
  
  // Custom Widget configuration
  const [widgets, setWidgets] = useState([])
  const [isAddingWidget, setIsAddingWidget] = useState(false)
  const [editingWidgetId, setEditingWidgetId] = useState(null)
  
  // Active Preset View
  const [activePreset, setActivePreset] = useState('executive')
  
  // Focus / Expand Widget Modal
  const [focusedWidget, setFocusedWidget] = useState(null)

  // New Widget Form State
  const [widgetForm, setWidgetForm] = useState({
    title: '',
    type: 'bar',
    dimension: '',
    metric: '',
    agg: 'SUM',
    color: '#3b82f6'
  })

  // Categorical vs Numeric columns categorization
  const categoricals = useMemo(() => {
    return columns.filter(c => c.dtype.includes('object') || c.dtype.includes('string') || c.dtype.includes('category') || c.unique_count <= 25)
  }, [columns])

  const numerics = useMemo(() => {
    return columns.filter(c => c.dtype.includes('int') || c.dtype.includes('float'))
  }, [columns])

  // 1. Fetch full records for client-side Power BI engine
  useEffect(() => {
    async function fetchRecords() {
      if (!datasetId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/dataset/${datasetId}/records?limit=10000`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Failed to load dataset records')
        setRecords(data.records || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [datasetId])

  // 2. Initialize Smart Auto-Generated Dashboard Widgets based on columns
  useEffect(() => {
    if (columns.length === 0) return

    const primaryCat = categoricals[0]?.name || columns[0]?.name
    const secondaryCat = categoricals[1]?.name || primaryCat
    const primaryNum = numerics[0]?.name || (columns.find(c => c.name !== primaryCat)?.name || primaryCat)
    const secondaryNum = numerics[1]?.name || primaryNum

    const defaultWidgets = [
      {
        id: 'w-1',
        title: `${primaryNum} by ${primaryCat}`,
        type: 'bar',
        dimension: primaryCat,
        metric: primaryNum,
        agg: 'SUM',
        color: '#3b82f6'
      },
      {
        id: 'w-2',
        title: `${secondaryCat} Distribution`,
        type: 'donut',
        dimension: secondaryCat,
        metric: primaryNum,
        agg: 'COUNT',
        color: '#8b5cf6'
      },
      {
        id: 'w-3',
        title: `${primaryNum} Trend Sequence`,
        type: 'line',
        dimension: primaryCat,
        metric: primaryNum,
        agg: 'AVG',
        color: '#10b981'
      },
      ...(numerics.length >= 2 ? [{
        id: 'w-4',
        title: `${primaryNum} vs ${secondaryNum} Scatter`,
        type: 'scatter',
        dimension: primaryCat,
        metric: primaryNum,
        secondaryMetric: secondaryNum,
        agg: 'SUM',
        color: '#f59e0b'
      }] : [])
    ]
    setWidgets(defaultWidgets)

    if (primaryCat && !widgetForm.dimension) {
      setWidgetForm(prev => ({ ...prev, dimension: primaryCat, metric: primaryNum }))
    }
  }, [columns, categoricals, numerics])

  // 3. Filter Records dynamically based on Slicers
  const filteredRecords = useMemo(() => {
    if (Object.keys(slicers).length === 0) return records

    return records.filter(row => {
      for (const [col, filterVal] of Object.entries(slicers)) {
        if (!filterVal) continue
        
        // Categorical multi-select filter
        if (filterVal instanceof Set && filterVal.size > 0) {
          const val = row[col] === null || row[col] === undefined ? '(Blank)' : String(row[col])
          if (!filterVal.has(val)) return false
        }
        
        // Numeric Min-Max Range filter
        if (typeof filterVal === 'object' && !(filterVal instanceof Set)) {
          const num = Number(row[col])
          if (isNaN(num)) return false
          if (filterVal.min !== undefined && num < filterVal.min) return false
          if (filterVal.max !== undefined && num > filterVal.max) return false
        }
      }
      return true
    })
  }, [records, slicers])

  // 4. Slicer Toggle Handlers
  const toggleCategoricalSlicer = (col, val) => {
    setSlicers(prev => {
      const currentSet = new Set(prev[col] || [])
      if (currentSet.has(val)) {
        currentSet.delete(val)
      } else {
        currentSet.add(val)
      }
      const next = { ...prev }
      if (currentSet.size === 0) {
        delete next[col]
      } else {
        next[col] = currentSet
      }
      return next
    })
  }

  const clearAllSlicers = () => setSlicers({})

  const activeSlicerCount = useMemo(() => {
    return Object.values(slicers).reduce((acc, val) => {
      if (val instanceof Set) return acc + val.size
      if (val && typeof val === 'object') return acc + 1
      return acc
    }, 0)
  }, [slicers])

  // 5. Aggregate metrics helper function for visual charts
  const aggregateData = (dimCol, metricCol, aggType) => {
    if (!dimCol || filteredRecords.length === 0) return []
    const groups = {}

    filteredRecords.forEach(r => {
      const dimVal = r[dimCol] === null || r[dimCol] === undefined ? '(Blank)' : String(r[dimCol])
      if (!groups[dimVal]) groups[dimVal] = []
      const val = Number(r[metricCol])
      if (!isNaN(val)) groups[dimVal].push(val)
    })

    const result = Object.entries(groups).map(([name, vals]) => {
      let aggregatedValue = 0
      if (vals.length > 0) {
        if (aggType === 'SUM') aggregatedValue = vals.reduce((a, b) => a + b, 0)
        else if (aggType === 'AVG') aggregatedValue = vals.reduce((a, b) => a + b, 0) / vals.length
        else if (aggType === 'COUNT') aggregatedValue = vals.length
        else if (aggType === 'MIN') aggregatedValue = Math.min(...vals)
        else if (aggType === 'MAX') aggregatedValue = Math.max(...vals)
      } else {
        if (aggType === 'COUNT') aggregatedValue = groups[name].length
      }

      return {
        name: name.length > 15 ? name.slice(0, 15) + '…' : name,
        fullName: name,
        value: Number(aggregatedValue.toFixed(2)),
        count: vals.length
      }
    })

    // Sort descending by value
    return result.sort((a, b) => b.value - a.value).slice(0, 15)
  }

  // 6. Compute Dynamic KPI Metrics for Callout Bar
  const kpiMetrics = useMemo(() => {
    const totalCount = filteredRecords.length
    const primaryNumCol = numerics[0]?.name

    if (!primaryNumCol || totalCount === 0) {
      return [
        { label: 'Active Records', value: totalCount.toLocaleString(), badge: `${Math.round((totalCount / (totalRows || 1)) * 100)}% of total` },
        { label: 'Total Columns', value: columns.length, badge: 'Schema' },
        { label: 'Categories', value: categoricals.length, badge: 'Dimensions' },
        { label: 'Numeric Fields', value: numerics.length, badge: 'Metrics' }
      ]
    }

    const numVals = filteredRecords.map(r => Number(r[primaryNumCol])).filter(n => !isNaN(n))
    const sumVal = numVals.reduce((a, b) => a + b, 0)
    const avgVal = numVals.length > 0 ? sumVal / numVals.length : 0
    const maxVal = numVals.length > 0 ? Math.max(...numVals) : 0

    return [
      {
        label: 'Filtered Row Count',
        value: totalCount.toLocaleString(),
        sub: `of ${totalRows?.toLocaleString()} rows`,
        badge: `${Math.round((totalCount / (totalRows || 1)) * 100)}% active`,
        icon: Activity
      },
      {
        label: `Total ${primaryNumCol}`,
        value: sumVal >= 1000000 ? `${(sumVal / 1000000).toFixed(2)}M` : sumVal >= 1000 ? `${(sumVal / 1000).toFixed(1)}k` : sumVal.toFixed(2),
        sub: `SUM aggregation`,
        badge: 'Key Metric',
        icon: BarChart3
      },
      {
        label: `Average ${primaryNumCol}`,
        value: avgVal.toFixed(2),
        sub: `MEAN metric`,
        badge: 'Baseline',
        icon: LineIcon
      },
      {
        label: `Peak ${primaryNumCol}`,
        value: maxVal >= 1000000 ? `${(maxVal / 1000000).toFixed(2)}M` : maxVal.toFixed(2),
        sub: `MAX recorded`,
        badge: 'High Mark',
        icon: ArrowUpRight
      }
    ]
  }, [filteredRecords, numerics, columns, totalRows, categoricals])

  // 7. Add / Edit Widget Handler
  const handleSaveWidget = (e) => {
    e.preventDefault()
    if (!widgetForm.title || !widgetForm.dimension) return

    if (editingWidgetId) {
      setWidgets(prev => prev.map(w => w.id === editingWidgetId ? { ...widgetForm, id: editingWidgetId } : w))
      setEditingWidgetId(null)
    } else {
      const newW = {
        ...widgetForm,
        id: `w-${Date.now()}`
      }
      setWidgets(prev => [...prev, newW])
    }
    setIsAddingWidget(false)
    setWidgetForm({
      title: '',
      type: 'bar',
      dimension: categoricals[0]?.name || columns[0]?.name || '',
      metric: numerics[0]?.name || '',
      agg: 'SUM',
      color: '#3b82f6'
    })
  }

  const handleDeleteWidget = (id) => {
    setWidgets(prev => prev.filter(w => w.id !== id))
  }

  const handleEditWidget = (widget) => {
    setWidgetForm(widget)
    setEditingWidgetId(widget.id)
    setIsAddingWidget(true)
  }

  // 8. Preset Switcher
  const applyPreset = (presetKey) => {
    setActivePreset(presetKey)
    const primaryCat = categoricals[0]?.name || columns[0]?.name
    const secondaryCat = categoricals[1]?.name || primaryCat
    const primaryNum = numerics[0]?.name || primaryCat
    const secondaryNum = numerics[1]?.name || primaryNum

    if (presetKey === 'executive') {
      setWidgets([
        { id: 'w-1', title: `${primaryNum} by ${primaryCat}`, type: 'bar', dimension: primaryCat, metric: primaryNum, agg: 'SUM', color: '#3b82f6' },
        { id: 'w-2', title: `${secondaryCat} Share`, type: 'donut', dimension: secondaryCat, metric: primaryNum, agg: 'COUNT', color: '#8b5cf6' },
        { id: 'w-3', title: `${primaryCat} Performance Matrix`, type: 'matrix', dimension: primaryCat, metric: primaryNum, agg: 'AVG', color: '#10b981' }
      ])
    } else if (presetKey === 'trends') {
      setWidgets([
        { id: 'w-1', title: `${primaryNum} Trend Line`, type: 'line', dimension: primaryCat, metric: primaryNum, agg: 'AVG', color: '#10b981' },
        ...(numerics.length >= 2 ? [{ id: 'w-2', title: `${primaryNum} vs ${secondaryNum} Correlation`, type: 'scatter', dimension: primaryCat, metric: primaryNum, secondaryMetric: secondaryNum, agg: 'SUM', color: '#f59e0b' }] : []),
        { id: 'w-3', title: `${primaryNum} Distribution`, type: 'bar', dimension: primaryCat, metric: primaryNum, agg: 'MAX', color: '#ec4899' }
      ])
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ fontWeight: 600 }}>Loading Power BI Dataset Engine…</p>
        <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>Fetching record slices for client-side dynamic slicing</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>⚠️ Failed to load BI dataset records: {error}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── BI Header Toolbar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-light)',
        borderRadius: '12px', padding: '1rem 1.25rem', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '0.5rem',
            borderRadius: '8px', color: '#fff', display: 'flex', boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
          }}>
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Power BI Interactive Dashboard
              <span className="brand-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>BI Engine</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Real-time cross-filtering, dynamic slicers, KPI scorecards &amp; custom chart canvas
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Preset buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-dark)', borderRadius: '8px', padding: 3, border: '1px solid var(--border-light)' }}>
            <button
              onClick={() => applyPreset('executive')}
              style={{
                padding: '0.35rem 0.75rem', fontSize: '0.775rem', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: activePreset === 'executive' ? 'var(--primary)' : 'transparent',
                color: activePreset === 'executive' ? '#fff' : 'var(--text-muted)'
              }}
            >
              Executive
            </button>
            <button
              onClick={() => applyPreset('trends')}
              style={{
                padding: '0.35rem 0.75rem', fontSize: '0.775rem', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: activePreset === 'trends' ? 'var(--primary)' : 'transparent',
                color: activePreset === 'trends' ? '#fff' : 'var(--text-muted)'
              }}
            >
              Trends
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setWidgetForm({
                title: '',
                type: 'bar',
                dimension: categoricals[0]?.name || columns[0]?.name || '',
                metric: numerics[0]?.name || '',
                agg: 'SUM',
                color: '#3b82f6'
              })
              setEditingWidgetId(null)
              setIsAddingWidget(true)
            }}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <Plus size={14} /> Add BI Visual
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => window.print()}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            title="Print or Save PDF of Dashboard"
          >
            <Printer size={14} /> Export View
          </button>
        </div>
      </div>

      {/* ── KPI Callout Scorecards Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {kpiMetrics.map((kpi, idx) => {
          const IconComp = kpi.icon || Activity
          return (
            <div key={idx} className="column-card" style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
              border: '1px solid rgba(255,255,255,0.08)', padding: '1.1rem 1.25rem', borderRadius: '12px',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)' }}>{kpi.label}</span>
                <span style={{
                  fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '9999px',
                  background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  {kpi.badge}
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconComp size={12} color="var(--primary)" /> {kpi.sub || 'Live calculation'}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Main Dashboard Split: Left Slicers Sidebar + Right Visual Canvas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* ── Left Power BI Slicers Sidebar ── */}
        <aside style={{
          background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border-light)',
          borderRadius: '12px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} color="var(--primary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Slicers &amp; Filters</span>
            </div>
            {activeSlicerCount > 0 && (
              <button
                onClick={clearAllSlicers}
                style={{
                  background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'
                }}
              >
                <RotateCcw size={12} /> Clear ({activeSlicerCount})
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredRecords.length.toLocaleString()}</strong> of <strong>{totalRows?.toLocaleString()}</strong> rows
          </div>

          {/* Categorical Slicers */}
          {categoricals.slice(0, 4).map(cat => {
            const seriesValues = Array.from(new Set(records.map(r => r[cat.name] === null || r[cat.name] === undefined ? '(Blank)' : String(r[cat.name])))).slice(0, 10)
            const currentSelected = slicers[cat.name] || new Set()

            return (
              <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cat.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{seriesValues.length} values</span>
                </label>

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '140px',
                  overflowY: 'auto', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '6px', padding: '0.4rem', border: '1px solid var(--border-light)'
                }}>
                  {seriesValues.map(val => {
                    const isChecked = currentSelected.has(val)
                    return (
                      <label
                        key={val}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem',
                          color: isChecked ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
                          padding: '0.2rem 0.3rem', borderRadius: '4px',
                          background: isChecked ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategoricalSlicer(cat.name, val)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </aside>

        {/* ── Right Dynamic Visual Widgets Canvas ── */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {widgets.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <BarChart3 size={32} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
              <h3>Your BI Canvas is Empty</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Click "+ Add BI Visual" above to build your custom chart or KPI matrix widget.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {widgets.map(w => {
                const data = aggregateData(w.dimension, w.metric, w.agg)

                return (
                  <div key={w.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                    
                    {/* Widget Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {w.title}
                        </h4>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {w.agg} of {w.metric} by {w.dimension}
                        </span>
                      </div>

                      {/* Widget Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          onClick={() => setFocusedWidget({ widget: w, data })}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 3 }}
                          title="Focus / Expand View"
                        >
                          <Maximize2 size={14} />
                        </button>
                        <button
                          onClick={() => handleEditWidget(w)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 3 }}
                          title="Edit Widget"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteWidget(w.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 3 }}
                          title="Remove Visual"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Widget Visual Content */}
                    <div style={{ marginTop: '0.25rem' }}>
                      {w.type === 'bar' && <CategoryBarChart columnFreq={{ column: w.dimension, frequencies: data.map(d => ({ value: d.fullName, count: d.value, percentage: 0 })), total_unique: data.length }} />}
                      {w.type === 'donut' && <BIDonutChart data={data} height={210} />}
                      {w.type === 'line' && <BILineChart data={data} color={w.color || '#3b82f6'} height={210} />}
                      {w.type === 'scatter' && (
                        <BIScatterChart
                          data={filteredRecords.slice(0, 50).map((r, idx) => ({
                            x: Number(r[w.metric]) || 0,
                            y: Number(r[w.secondaryMetric || w.metric]) || 0,
                            label: String(r[w.dimension] || idx)
                          }))}
                          xKey={w.metric}
                          yKey={w.secondaryMetric || w.metric}
                          height={210}
                        />
                      )}
                      {w.type === 'matrix' && (
                        <div className="table-wrapper" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Category ({w.dimension})</th>
                                <th>{w.agg} ({w.metric})</th>
                                <th>Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.map(row => (
                                <tr key={row.fullName}>
                                  <td style={{ fontWeight: 600 }}>{row.fullName}</td>
                                  <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{row.value.toLocaleString()}</td>
                                  <td>{row.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Add / Edit Widget Modal Drawer ── */}
      {isAddingWidget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              {editingWidgetId ? 'Edit BI Visual Widget' : 'Add New BI Visual Widget'}
            </h3>

            <form onSubmit={handleSaveWidget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Widget Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={widgetForm.title}
                  onChange={e => setWidgetForm({ ...widgetForm, title: e.target.value })}
                  placeholder="e.g. Sales by Department"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Visual Type</label>
                  <select
                    className="input-field"
                    value={widgetForm.type}
                    onChange={e => setWidgetForm({ ...widgetForm, type: e.target.value })}
                  >
                    <option value="bar">Bar / Column Chart</option>
                    <option value="donut">Donut Chart</option>
                    <option value="line">Line Trend Chart</option>
                    <option value="scatter">Scatter Correlation</option>
                    <option value="matrix">Pivot Breakdown Matrix</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Aggregation</label>
                  <select
                    className="input-field"
                    value={widgetForm.agg}
                    onChange={e => setWidgetForm({ ...widgetForm, agg: e.target.value })}
                  >
                    <option value="SUM">SUM</option>
                    <option value="AVG">AVERAGE (Mean)</option>
                    <option value="COUNT">COUNT</option>
                    <option value="MIN">MIN</option>
                    <option value="MAX">MAX</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Dimension (Category)</label>
                  <select
                    className="input-field"
                    value={widgetForm.dimension}
                    onChange={e => setWidgetForm({ ...widgetForm, dimension: e.target.value })}
                  >
                    {columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Metric (Numeric)</label>
                  <select
                    className="input-field"
                    value={widgetForm.metric}
                    onChange={e => setWidgetForm({ ...widgetForm, metric: e.target.value })}
                  >
                    {columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddingWidget(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Widget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Focus / Expand View Modal ── */}
      {focusedWidget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {focusedWidget.widget.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Expanded Power BI View ({focusedWidget.widget.agg} of {focusedWidget.widget.metric} by {focusedWidget.widget.dimension})
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setFocusedWidget(null)}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              {focusedWidget.widget.type === 'bar' && <CategoryBarChart columnFreq={{ column: focusedWidget.widget.dimension, frequencies: focusedWidget.data.map(d => ({ value: d.fullName, count: d.value, percentage: 0 })), total_unique: focusedWidget.data.length }} />}
              {focusedWidget.widget.type === 'donut' && <BIDonutChart data={focusedWidget.data} height={320} />}
              {focusedWidget.widget.type === 'line' && <BILineChart data={focusedWidget.data} color={focusedWidget.widget.color || '#3b82f6'} height={320} />}
              {focusedWidget.widget.type === 'matrix' && (
                <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category ({focusedWidget.widget.dimension})</th>
                        <th>{focusedWidget.widget.agg} ({focusedWidget.widget.metric})</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusedWidget.data.map(row => (
                        <tr key={row.fullName}>
                          <td style={{ fontWeight: 600 }}>{row.fullName}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{row.value.toLocaleString()}</td>
                          <td>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

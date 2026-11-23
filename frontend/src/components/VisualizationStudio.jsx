import { useMemo, useState } from 'react'
import { BarChart3, Download, Loader2, Sparkles } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#0891b2', '#d97706', '#dc2626']
const CHART_AXIS = { fill: '#64748B', fontSize: 11 }
const CHART_GRID = '#E2E8F0'
const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  color: '#0F172A',
  boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
  fontSize: '12px',
}

export default function VisualizationStudio({ datasetId, columns }) {
  const numerics = useMemo(() => columns.filter(c => /int|float/.test(c.dtype)), [columns])
  const categoricals = useMemo(() => columns.filter(c => !/int|float/.test(c.dtype)), [columns])
  const [chartType, setChartType] = useState('bar')
  const [xColumn, setXColumn] = useState(categoricals[0]?.name || columns[0]?.name || '')
  const [yColumn, setYColumn] = useState(numerics[0]?.name || '')
  const [aggregation, setAggregation] = useState('count')
  const [title, setTitle] = useState('')
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateChart = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/visualizations/${datasetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chart_type: chartType,
          x_column: xColumn,
          y_column: chartType === 'scatter' ? yColumn : (aggregation === 'count' ? null : yColumn),
          aggregation,
          title,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Chart generation failed')
      setChart(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const chartData = chart?.points || []
  const scatterData = chartData.map(point => ({ x: point.value, y: point.secondary, name: point.name }))

  const chartElement = () => {
    if (!chart) return null
    if (chart.chart_type === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart><CartesianGrid stroke={CHART_GRID} /><XAxis dataKey="x" name={chart.x_label} tick={CHART_AXIS} /><YAxis dataKey="y" name={chart.y_label} tick={CHART_AXIS} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Scatter data={scatterData} fill="#2563eb" /></ScatterChart>
        </ResponsiveContainer>
      )
    }
    if (chart.chart_type === 'pie' || chart.chart_type === 'doughnut') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={chart.chart_type === 'doughnut' ? 85 : 0} outerRadius={125}>
              {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      )
    }
    if (chart.chart_type === 'line') {
      return <ResponsiveContainer width="100%" height={360}><LineChart data={chartData}><CartesianGrid stroke={CHART_GRID} /><XAxis dataKey="name" tick={CHART_AXIS} /><YAxis tick={CHART_AXIS} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} /></LineChart></ResponsiveContainer>
    }
    if (chart.chart_type === 'area') {
      return <ResponsiveContainer width="100%" height={360}><AreaChart data={chartData}><CartesianGrid stroke={CHART_GRID} /><XAxis dataKey="name" tick={CHART_AXIS} /><YAxis tick={CHART_AXIS} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Area type="monotone" dataKey="value" fill="#eff6ff" stroke="#2563eb" /></AreaChart></ResponsiveContainer>
    }
    return (
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chartData}>
          <CartesianGrid stroke={CHART_GRID} />
          <XAxis dataKey="name" tick={CHART_AXIS} />
          <YAxis tick={CHART_AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="studio-layout">
      <form className="studio-controls" onSubmit={generateChart}>
        <div className="studio-heading"><span className="quick-action-icon blue"><BarChart3 size={18} /></span><div><h3>Visualization Studio</h3><p>Build a chart from calculated dataset values.</p></div></div>
        <label>Chart type<select className="input-field" value={chartType} onChange={e => setChartType(e.target.value)}>{['bar','line','pie','doughnut','area','scatter','histogram','box'].map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>X-axis<select className="input-field" value={xColumn} onChange={e => setXColumn(e.target.value)}>{columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
        {chartType === 'scatter' && <label>Y-axis<select className="input-field" value={yColumn} onChange={e => setYColumn(e.target.value)}>{numerics.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>}
        {!['scatter','histogram','box','pie','doughnut'].includes(chartType) && <><label>Y-axis<select className="input-field" value={yColumn} onChange={e => setYColumn(e.target.value)}><option value="">Count</option>{numerics.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label><label>Aggregation<select className="input-field" value={aggregation} onChange={e => setAggregation(e.target.value)}>{['count','sum','mean','median','min','max'].map(value => <option key={value}>{value}</option>)}</select></label></>}
        <label>Chart title<input className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Optional title" /></label>
        <button className="btn btn-primary" type="submit" disabled={loading || !xColumn}>{loading ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}Generate chart</button>
      </form>
      <section className="chart-workspace">
        {error && <div className="alert alert-error">{error}</div>}
        {!chart && !error && <div className="analyst-empty">Configure the chart controls and generate a real visualization.</div>}
        {chart && <><div className="chart-heading"><div><p>{chart.x_label} and {chart.y_label}</p><h3>{chart.title}</h3></div><button className="icon-btn" type="button" title="Print chart" onClick={() => window.print()}><Download size={16} /></button></div>{chartElement()}</>}
      </section>
    </div>
  )
}

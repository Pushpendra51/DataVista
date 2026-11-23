import { useState } from 'react'
import { BrainCircuit, Loader2, Play } from 'lucide-react'

export default function MachineLearningLab({ datasetId, columns }) {
  const numerics = columns.filter(c => /int|float/.test(c.dtype))
  const [task, setTask] = useState('regression')
  const [target, setTarget] = useState(numerics[0]?.name || '')
  const [features, setFeatures] = useState([])
  const [model, setModel] = useState('linear')
  const [testSize, setTestSize] = useState(20)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggleFeature = (name) => {
    setFeatures(previous => previous.includes(name)
      ? previous.filter(item => item !== name)
      : [...previous, name])
  }

  const train = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch(`/api/ml/${datasetId}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          target_column: task === 'clustering' ? null : target,
          feature_columns: features,
          test_size: testSize / 100,
          model,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Model training failed')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const availableTargets = task === 'classification'
    ? columns
    : numerics

  return (
    <div className="studio-layout">
      <form className="studio-controls" onSubmit={train}>
        <div className="studio-heading">
          <span className="quick-action-icon violet"><BrainCircuit size={18} /></span>
          <div><h3>Machine Learning Lab</h3><p>Train a bounded scikit-learn experiment.</p></div>
        </div>
        <label>Task
          <select className="input-field" value={task} onChange={event => {
            const next = event.target.value
            setTask(next)
            setModel(next === 'regression' ? 'linear' : next === 'classification' ? 'logistic' : 'kmeans')
          }}>
            <option value="regression">Regression</option>
            <option value="classification">Classification</option>
            <option value="clustering">Clustering</option>
          </select>
        </label>
        {task !== 'clustering' && (
          <label>Target column
            <select className="input-field" value={target} onChange={event => setTarget(event.target.value)}>
              {availableTargets.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
            </select>
          </label>
        )}
        {task !== 'clustering' && (
          <label>Model
            <select className="input-field" value={model} onChange={event => setModel(event.target.value)}>
              {task === 'regression'
                ? <><option value="linear">Linear Regression</option><option value="ridge">Ridge</option><option value="forest">Random Forest</option></>
                : <><option value="logistic">Logistic Regression</option><option value="forest">Random Forest</option></>}
            </select>
          </label>
        )}
        {task !== 'clustering' && (
          <label>Test split
            <select className="input-field" value={testSize} onChange={event => setTestSize(Number(event.target.value))}>
              {[10, 20, 30, 40].map(value => <option key={value} value={value}>{value}%</option>)}
            </select>
          </label>
        )}
        <fieldset className="feature-picker">
          <legend>Feature columns</legend>
          {columns.map(column => (
            <label key={column.name}>
              <input
                type="checkbox"
                checked={features.includes(column.name)}
                disabled={task !== 'clustering' && column.name === target}
                onChange={() => toggleFeature(column.name)}
              />
              <span>{column.name}</span>
            </label>
          ))}
        </fieldset>
        <button className="btn btn-primary" type="submit" disabled={loading || features.length === 0}>
          {loading ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
          Train model
        </button>
      </form>
      <section className="chart-workspace">
        {error && <div className="alert alert-error">{error}</div>}
        {!result && !error && <div className="analyst-empty">Select features and train a real model on the uploaded dataset.</div>}
        {result && (
          <div className="ml-results">
            <div className="chart-heading"><div><p>{result.task} experiment</p><h3>{result.model} model</h3></div></div>
            <div className="kpi-grid">
              {Object.entries(result.metrics).map(([name, value]) => (
                <div className="kpi-card" key={name}>
                  <div className="kpi-title">{name.replaceAll('_', ' ')}</div>
                  <div className="kpi-value">{typeof value === 'number' ? value : String(value)}</div>
                </div>
              ))}
            </div>
            {Object.keys(result.feature_importance).length > 0 && (
              <div className="eda-panel">
                <h3>Feature importance</h3>
                <div className="finding-list">
                  {Object.entries(result.feature_importance).map(([name, value]) => (
                    <div className="finding-row" key={name}><strong>{name}</strong><span>{value}</span></div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(result.cluster_sizes).length > 0 && (
              <div className="eda-panel">
                <h3>Cluster sizes</h3>
                {Object.entries(result.cluster_sizes).map(([name, value]) => (
                  <div className="finding-row" key={name}><strong>Cluster {name}</strong><span>{value} rows</span></div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

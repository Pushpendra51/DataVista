import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Printer, FileType } from 'lucide-react'

export default function ReportStudio({ datasetId, datasetName }) {
  const [title, setTitle] = useState(datasetName ? `${datasetName} Analysis Report` : 'DataVista Analysis Report')
  const [savedReports, setSavedReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('datavista-reports') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('datavista-reports', JSON.stringify(savedReports))
  }, [savedReports])

  const download = (format) => {
    window.open(`/api/export/${datasetId}/${format}`, '_blank', 'noopener')
  }

  const saveReport = () => {
    setSavedReports(previous => [{
      id: crypto.randomUUID(),
      title: title.trim() || 'Untitled Report',
      datasetId,
      datasetName,
      createdAt: new Date().toISOString(),
    }, ...previous].slice(0, 50))
  }

  return (
    <div className="report-layout">
      <section className="studio-controls report-controls">
        <div className="studio-heading">
          <span className="quick-action-icon blue"><FileText size={18} /></span>
          <div><h3>Report Studio</h3><p>Create a professional export from real analysis results.</p></div>
        </div>
        <label>Report title
          <input className="input-field" value={title} onChange={event => setTitle(event.target.value)} />
        </label>
        <button className="btn btn-primary" type="button" onClick={saveReport}>Save report metadata</button>
      </section>

      <section className="chart-workspace">
        <div className="chart-heading">
          <div><p>Available exports</p><h3>{title}</h3></div>
        </div>
        <div className="report-export-grid">
          <button type="button" className="report-export-card" onClick={() => download('html')}>
            <span className="quick-action-icon blue"><Printer size={18} /></span>
            <span><strong>Print / PDF</strong><small>Professional HTML report</small></span>
            <Download size={16} />
          </button>
          <button type="button" className="report-export-card" onClick={() => download('xlsx')}>
            <span className="quick-action-icon green"><FileSpreadsheet size={18} /></span>
            <span><strong>Excel workbook</strong><small>Data, quality, and statistics sheets</small></span>
            <Download size={16} />
          </button>
          <button type="button" className="report-export-card" onClick={() => download('csv')}>
            <span className="quick-action-icon violet"><FileType size={18} /></span>
            <span><strong>Dataset CSV</strong><small>Current dataset values</small></span>
            <Download size={16} />
          </button>
          <button type="button" className="report-export-card" onClick={() => download('summary')}>
            <span className="quick-action-icon amber"><FileText size={18} /></span>
            <span><strong>Analysis JSON</strong><small>Quality, statistics, and correlation</small></span>
            <Download size={16} />
          </button>
        </div>

        <div className="eda-panel saved-report-panel">
          <h3>Saved report metadata</h3>
          {savedReports.length === 0
            ? <p className="muted-text">No reports saved yet.</p>
            : savedReports.map(report => (
                <div className="finding-row" key={report.id}>
                  <FileText size={16} />
                  <span><strong>{report.title}</strong><small>{report.datasetName} · {new Date(report.createdAt).toLocaleString()}</small></span>
                </div>
              ))}
        </div>
      </section>
    </div>
  )
}

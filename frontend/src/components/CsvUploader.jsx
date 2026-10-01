import { useState, useRef } from 'react'
import { UploadCloud, FileText, AlertCircle, Sparkles, Loader2 } from 'lucide-react'

// Built-in verified sample dataset so users/interviewers can test instantly with 1-click
const SAMPLE_CSV = `transaction_id,customer_name,region,product_category,unit_price,quantity,discount_pct,order_date
1001,Aarav Sharma,North,Electronics,1200.0,2,0.05,2026-01-15
1002,Pooja Patel,West,Home Appliances,450.5,1,0.00,2026-01-16
1003,Rohan Verma,South,Electronics,85.0,5,0.10,2026-01-17
1004,Neha Gupta,East,Furniture,320.0,3,0.15,2026-01-18
1005,Vikram Singh,North,Office Supplies,45.0,12,0.00,2026-01-19
1006,Ananya Roy,East,Electronics,950.0,1,0.05,2026-01-20
1007,Karan Mehta,West,Home Appliances,,2,0.00,2026-01-21
1008,Sunita Rao,South,Furniture,640.0,2,0.20,2026-01-22
1009,Aarav Sharma,North,Electronics,1200.0,2,0.05,2026-01-15
1010,Deepak Joshi,North,Office Supplies,25.0,20,0.00,2026-01-23`

export default function CsvUploader({ onUploadSuccess, loading, setLoading }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)

    // Client-side extension validation
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError("Please select a valid CSV file (.csv extension).")
      return
    }

    // Client-side size validation (10 MB max)
    if (file.size === 0) {
      setError("The selected file is empty (0 bytes).")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The selected file exceeds the 10 MB limit.")
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setLoading(true)
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || `Upload failed with HTTP ${response.status}`)
      }

      onUploadSuccess(data)
    } catch (err) {
      setError(err.message || 'Network error occurred while uploading.')
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleLoadDemoDataset = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const file = new File([blob], 'ecommerce_sales_sample.csv', { type: 'text/csv' })
    handleFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        className={`dropzone-container ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        id="csv-dropzone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          accept=".csv"
          className="file-input-hidden"
          id="csv-file-input"
        />

        <div className="dropzone-icon">
          {loading ? (
            <Loader2 size={32} className="spin" />
          ) : (
            <UploadCloud size={32} />
          )}
        </div>

        <div>
          <h3 className="dropzone-title">
            {loading ? "Processing CSV with Pandas..." : "Upload your CSV Dataset"}
          </h3>
          <p className="dropzone-subtitle">
            Drag and drop your file here, or click to browse (Max 10 MB)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current && fileInputRef.current.click()
            }}
          >
            <FileText size={16} />
            Browse File
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation()
              handleLoadDemoDataset()
            }}
            title="Load built-in 10-row sales dataset"
            id="load-demo-btn"
          >
            <Sparkles size={16} color="var(--primary)" />
            Load Demo Dataset
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Upload Validation Failed:</strong> {error}
          </div>
        </div>
      )}
    </div>
  )
}

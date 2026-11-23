import { useEffect, useState } from 'react'
import { FolderKanban, Plus, Pencil, Trash2, Database } from 'lucide-react'

export default function ProjectsWorkspace({ datasetId, datasetName }) {
  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('datavista-projects') || '[]')
    } catch {
      return []
    }
  })
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    localStorage.setItem('datavista-projects', JSON.stringify(projects))
  }, [projects])

  const submit = (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    if (editingId) {
      setProjects(previous => previous.map(project =>
        project.id === editingId ? { ...project, name: cleanName, updatedAt: new Date().toISOString() } : project
      ))
      setEditingId(null)
    } else {
      setProjects(previous => [{
        id: crypto.randomUUID(),
        name: cleanName,
        datasetId: datasetId || null,
        datasetName: datasetName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ...previous])
    }
    setName('')
  }

  const attachDataset = (projectId) => {
    if (!datasetId) return
    setProjects(previous => previous.map(project =>
      project.id === projectId
        ? { ...project, datasetId, datasetName, updatedAt: new Date().toISOString() }
        : project
    ))
  }

  const remove = (projectId) => {
    if (!window.confirm('Delete this project?')) return
    setProjects(previous => previous.filter(project => project.id !== projectId))
  }

  return (
    <div className="projects-layout">
      <form className="studio-controls" onSubmit={submit}>
        <div className="studio-heading">
          <span className="quick-action-icon violet"><FolderKanban size={18} /></span>
          <div><h3>{editingId ? 'Rename project' : 'Create project'}</h3><p>Organize local datasets and reports.</p></div>
        </div>
        <label>Project name
          <input className="input-field" value={name} onChange={event => setName(event.target.value)} placeholder="Customer analysis" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          <Plus size={16} />{editingId ? 'Save name' : 'Create project'}
        </button>
      </form>

      <section className="chart-workspace">
        <div className="chart-heading"><div><p>Workspace</p><h3>My Projects</h3></div></div>
        {projects.length === 0
          ? <div className="analyst-empty">No projects yet. Create one to attach the active dataset.</div>
          : <div className="project-list">
              {projects.map(project => (
                <article className="project-card" key={project.id}>
                  <span className="quick-action-icon violet"><FolderKanban size={18} /></span>
                  <div className="project-details">
                    <strong>{project.name}</strong>
                    <small>{project.datasetName ? <><Database size={12} /> {project.datasetName}</> : 'No dataset attached'}</small>
                  </div>
                  {datasetId && (
                    <button className="btn btn-secondary" type="button" onClick={() => attachDataset(project.id)}>Attach active dataset</button>
                  )}
                  <button className="icon-btn" type="button" title="Rename" onClick={() => { setEditingId(project.id); setName(project.name) }}><Pencil size={15} /></button>
                  <button className="icon-btn" type="button" title="Delete" onClick={() => remove(project.id)}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>}
      </section>
    </div>
  )
}

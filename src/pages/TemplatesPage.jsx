import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal.jsx'

function TemplateCard({ template, onSelect }) {
  const taskCount = template.tasks?.length ?? 0
  return (
    <article className="template-card">
      <div className="template-card-header">
        <div>
          <h3>{template.make} {template.model}</h3>
          <p className="muted small">{template.slug}</p>
        </div>
        <span className="task-badge">{taskCount} tasks</span>
      </div>
      
      {template.description && (
        <p className="template-description">{template.description}</p>
      )}
      
      {taskCount > 0 && (
        <details className="template-tasks">
          <summary className="muted small">View maintenance schedule</summary>
          <ul className="task-list">
            {template.tasks.map((task) => (
              <li key={task.id} className="task-item">
                <span className="task-name">{task.task_name}</span>
                <span className="task-meta muted small">
                  {task.system} • {task.interval_miles ? `${task.interval_miles} mi` : 'Time-based'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      
      {onSelect && (
        <button 
          type="button" 
          className="ghost small"
          onClick={() => onSelect(template)}
        >
          Use Template
        </button>
      )}
    </article>
  )
}

function TemplatesPage({ templates, templatesLoading, templatesError }) {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    make: '',
    model: '',
    year: '',
    engine: '',
    description: ''
  })

  const handleCreateTemplate = (e) => {
    e.preventDefault()
    // TODO: Implement template creation
    console.log('Creating template:', newTemplate)
    setCreateModalOpen(false)
    setNewTemplate({ make: '', model: '', year: '', engine: '', description: '' })
  }

  const content = useMemo(() => {
    if (templatesLoading) {
      return <div className="empty-state"><p className="muted">Loading templates...</p></div>
    }
    if (templatesError) {
      return <div className="empty-state"><p className="error-text">Error loading templates: {templatesError}</p></div>
    }
    if (!templates || templates.length === 0) {
      return (
        <div className="empty-state">
          <h3>No templates yet</h3>
          <p className="muted">Create your first vehicle template to reuse maintenance schedules.</p>
        </div>
      )
    }
    return (
      <div className="templates-grid">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    )
  }, [templates, templatesLoading, templatesError])

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h2>Vehicle Templates</h2>
          <p className="muted">
            Reusable maintenance schedules for different vehicle types
          </p>
        </div>
        <button 
          type="button" 
          className="primary"
          onClick={() => setCreateModalOpen(true)}
        >
          Create Template
        </button>
      </header>
      <div className="page-content">{content}</div>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Vehicle Template"
      >
        <form onSubmit={handleCreateTemplate} className="stack">
          <label>
            <span>Make</span>
            <input
              type="text"
              value={newTemplate.make}
              onChange={(e) => setNewTemplate({ ...newTemplate, make: e.target.value })}
              placeholder="Dodge"
              required
            />
          </label>
          <label>
            <span>Model</span>
            <input
              type="text"
              value={newTemplate.model}
              onChange={(e) => setNewTemplate({ ...newTemplate, model: e.target.value })}
              placeholder="Ram 2500"
              required
            />
          </label>
          <label>
            <span>Year (optional)</span>
            <input
              type="text"
              value={newTemplate.year}
              onChange={(e) => setNewTemplate({ ...newTemplate, year: e.target.value })}
              placeholder="2000"
            />
          </label>
          <label>
            <span>Engine (optional)</span>
            <input
              type="text"
              value={newTemplate.engine}
              onChange={(e) => setNewTemplate({ ...newTemplate, engine: e.target.value })}
              placeholder="5.9 Cummins 24V"
            />
          </label>
          <label>
            <span>Description (optional)</span>
            <textarea
              value={newTemplate.description}
              onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              placeholder="Describe this vehicle template..."
              rows={3}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Create Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export { TemplatesPage }

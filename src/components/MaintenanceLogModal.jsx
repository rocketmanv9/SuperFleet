import { Modal } from './Modal.jsx'
import { formatMiles } from '../utils/formatters.js'

function MaintenanceLogModal({
  open,
  onClose,
  task,
  selectedVehicle,
  logForm,
  onLogFormChange,
  onSubmitLog,
  logSubmitting,
  canLog,
}) {
  const footer = (
    <>
      <button type="button" className="ghost" onClick={onClose}>
        Cancel
      </button>
      <button
        type="submit"
        className="primary"
        form="maintenance-log-form"
        disabled={!canLog || !task || logSubmitting}
      >
        {!canLog ? 'View only' : logSubmitting ? 'Recording...' : 'Save log'}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title={task ? `Log ${task.title}` : 'Log maintenance'} footer={footer}>
      {!task ? (
        <p className="muted">Select a maintenance item to populate this form.</p>
      ) : (
        <form id="maintenance-log-form" className="log-form" onSubmit={onSubmitLog}>
          <p className="muted small">
            Recording completion for <strong>{task.title}</strong>
          </p>
          <label>
            <span>Completion mileage</span>
            <input
              type="number"
              value={logForm.mileage}
              onChange={(event) => onLogFormChange('mileage', event.target.value)}
              placeholder={selectedVehicle ? formatMiles(selectedVehicle.current_mileage ?? 0) : ''}
              disabled={!canLog}
            />
          </label>
          <div className="grid two">
            <label>
              <span>Cost</span>
              <input
                type="number"
                value={logForm.cost}
                onChange={(event) => onLogFormChange('cost', event.target.value)}
                placeholder="250"
                disabled={!canLog}
              />
            </label>
            <label>
              <span>Hours</span>
              <input
                type="number"
                value={logForm.hours}
                onChange={(event) => onLogFormChange('hours', event.target.value)}
                placeholder="2.5"
                disabled={!canLog}
              />
            </label>
          </div>
          <label>
            <span>Notes</span>
            <textarea
              value={logForm.notes}
              onChange={(event) => onLogFormChange('notes', event.target.value)}
              rows={3}
              placeholder="Details, vendor, invoice, etc."
              disabled={!canLog}
            />
          </label>
        </form>
      )}
    </Modal>
  )
}

export { MaintenanceLogModal }

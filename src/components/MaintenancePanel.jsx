import { TaskPill } from './TaskPill.jsx'
import { formatDate, formatMiles, getTaskStatus } from '../utils/formatters.js'

function MaintenancePanel({
  selectedVehicle,
  maintenanceItems,
  maintenanceLoading,
  maintenanceError,
  onLogTask,
  organization,
  userRole,
}) {
  const isFleet = organization?.type === 'fleet'
  const canLogTasks = userRole !== 'viewer'

  return (
    <section className="panel maintenance-panel">
      <header>
        <div>
          <p className="eyebrow">{isFleet ? 'Maintenance tracker' : 'My maintenance'}</p>
          <h2>{selectedVehicle ? selectedVehicle.name : 'Select a vehicle'}</h2>
        </div>
        {maintenanceError && <p className="error-text">{maintenanceError}</p>}
      </header>
      <div className="maintenance-content">
        <div className="maintenance-list">
          {maintenanceLoading ? (
            <p className="muted">Loading maintenance items...</p>
          ) : maintenanceItems.length === 0 ? (
            <p className="muted">
              No open maintenance items. Completed tasks live in the Supabase <code>maintenance_logs</code> table.
            </p>
          ) : (
            maintenanceItems.map((item) => {
              const status = getTaskStatus(item, selectedVehicle?.current_mileage)
              return (
                <article key={item.id} className="maintenance-card">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="muted">
                      Due {formatDate(item.due_date)} / {item.due_mileage ? `${formatMiles(item.due_mileage)}` : 'Set mileage'}
                    </p>
                  </div>
                  <div className="maintenance-meta">
                    <span className={`risk ${item.risk_level ?? 'low'}`}>{item.risk_level ?? 'low'}</span>
                    <TaskPill tone={status.tone} label={status.label} helper={status.helper} />
                    {canLogTasks && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => onLogTask(item, selectedVehicle?.current_mileage)}
                      >
                        Log completion
                      </button>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

export { MaintenancePanel }

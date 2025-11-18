import { MaintenancePanel } from './MaintenancePanel.jsx'
import { ReminderPanel } from './ReminderPanel.jsx'

function MaintenanceTab({
  organization,
  maintenancePanelProps,
  reminderPanelProps,
  maintenanceSummary,
  dueSoonTasks,
  overdueTasks,
}) {
  const isFleet = organization?.type === 'fleet'
  return (
    <div className="tab-content maintenance-tab">
      <section className="maintenance-summary">
        <div>
          <p className="eyebrow">Open tasks</p>
          <strong>{maintenanceSummary.total}</strong>
          <p className="muted small">
            {isFleet ? 'Active maintenance items' : 'Personal upkeep'}
          </p>
        </div>
        <div>
          <p className="eyebrow">Due soon</p>
          <strong>{dueSoonTasks.length}</strong>
          <p className="muted small">
            {isFleet ? 'Inside 500 mi / 7 days' : 'Coming up next'}
          </p>
        </div>
        <div>
          <p className="eyebrow">Overdue</p>
          <strong>{overdueTasks.length}</strong>
          <p className="muted small">
            {isFleet ? 'Handle ASAP' : 'Catch up to stay on streak'}
          </p>
        </div>
      </section>

      <div className="maintenance-row">
        <div>
          <MaintenancePanel {...maintenancePanelProps} />
        </div>
        <div>
          <ReminderPanel {...reminderPanelProps} />
        </div>
      </div>
    </div>
  )
}

export { MaintenanceTab }


import { TaskPill } from './TaskPill.jsx'
import { formatDate, formatMiles, getTaskStatus } from '../utils/formatters.js'

function ReminderPanel({ reminders, remindersLoading, remindersError, organization }) {
  const isFleet = organization?.type === 'fleet'
  return (
    <section className="panel reminders-panel">
      <header>
        <div>
          <p className="eyebrow">{isFleet ? 'Fleet reminders' : 'My reminders'}</p>
          <h2>Upcoming & overdue</h2>
        </div>
        {remindersError && <p className="error-text">{remindersError}</p>}
      </header>
      {remindersLoading ? (
        <p className="muted">Syncing reminders...</p>
      ) : reminders.length === 0 ? (
        <p className="muted">Reminders from your maintenance items will appear here.</p>
      ) : (
        <ul className="reminder-list">
          {reminders.map((reminder) => {
            const status = getTaskStatus(reminder, reminder.vehicle_mileage)
            return (
              <li key={reminder.id}>
                <div>
                  <strong>{reminder.title}</strong>
                  <p className="muted">
                    {reminder.vehicle_name} / {formatDate(reminder.due_date)} /{' '}
                    {reminder.due_mileage ? formatMiles(reminder.due_mileage) : 'Set mileage'}
                  </p>
                </div>
                <div className="reminder-meta">
                  <span className={`risk ${reminder.risk_level ?? 'low'}`}>
                    {reminder.risk_level ?? 'low'}
                  </span>
                  <TaskPill tone={status.tone} label={status.label} helper={status.helper} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export { ReminderPanel }

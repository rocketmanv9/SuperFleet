import { VehiclePanel } from './VehiclePanel.jsx'
import { TeamPanel } from './TeamPanel.jsx'
import { formatDate, formatMiles, currencyFormatter } from '../utils/formatters.js'

function StatusTab({
  organization,
  vehicle,
  statusStats,
  vehiclesPanelProps,
  userInfo,
  dueSoonTasks,
  overdueTasks,
  teamPanelProps,
  onOpenMaintenanceTab,
  onLogTask,
}) {
  const {
    level,
    hpPercent,
    xpProgressPercent,
    xpToNext,
    statusEffects,
    healthBreakdown,
    recentDrives,
  } = statusStats
  const isFleet = organization?.type === 'fleet'
  const ownerLabel = isFleet ? 'Owner' : 'Driver'

  if (!vehicle) {
    return (
      <div className="tab-content status-tab">
        <section className="empty-state">
          <h3>Add your first truck</h3>
          <p className="muted">
            No vehicles yet. Use the form below to add your primary rig and start tracking health,
            miles, and maintenance streaks.
          </p>
        </section>
        <VehiclePanel {...vehiclesPanelProps} />
      </div>
    )
  }

  const heroMileage = formatMiles(vehicle.current_mileage ?? 0)
  const maintenanceHighlights = [...overdueTasks, ...dueSoonTasks].slice(0, 4)
  const layoutStyles = {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(320px, 1.2fr) minmax(240px, 0.9fr)',
    gap: '1.5rem',
    alignItems: 'stretch',
    marginBottom: '1.5rem',
  }
  const lowerGridStyles = {
    display: 'grid',
    gridTemplateColumns: isFleet ? 'minmax(0, 2fr) minmax(0, 1fr)' : '1fr',
    gap: '1.5rem',
  }

  return (
    <div className="tab-content status-tab">
      <div style={layoutStyles}>
        <section className="profile-card" style={{ minHeight: '100%' }}>
          <div className="profile-main">
            <div>
              <p className="eyebrow">{ownerLabel}</p>
              <h3>{userInfo.name}</h3>
              <p className="muted small">{isFleet ? userInfo.role : 'You'}</p>
            </div>
            <div>
              <p className="eyebrow">Rig</p>
              <h2>{vehicle.name}</h2>
              <p className="muted">{heroMileage}</p>
            </div>
          </div>
          <div className="profile-stats">
            <div>
              <p className="eyebrow">Level</p>
              <span className="level-badge">Lv {level}</span>
            </div>
            <div className="bar-stack">
              <p>XP to next</p>
              <div className="bar">
                <div style={{ width: `${xpProgressPercent}%` }} />
              </div>
              <small>{xpToNext.toLocaleString()} XP remaining</small>
            </div>
            <div className="bar-stack">
              <p>Health</p>
              <div className="bar hp">
                <div style={{ width: `${hpPercent}%` }} />
              </div>
              <small>{hpPercent}% HP</small>
            </div>
          </div>
          <div className="status-effects">
            {statusEffects.map((effect) => (
              <span key={`${effect.label}-${effect.type}`} className={`effect-pill effect-${effect.type}`}>
                <strong>{effect.label}</strong>
                <small>{effect.description}</small>
              </span>
            ))}
          </div>
          <div className="recent-card" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <h3>Recent drives</h3>
            {recentDrives.length === 0 ? (
              <p className="muted">Log fuel entries to see recent drives.</p>
            ) : (
              <ul>
                {recentDrives.slice(0, 2).map((drive) => (
                  <li key={drive.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{formatDate(drive.date)}</strong>
                      <span className="muted small">{(drive.miles ?? 0).toLocaleString()} mi</span>
                    </div>
                    <div>
                      {drive.mpg ? <span>{drive.mpg.toFixed(1)} MPG</span> : <span>- MPG</span>}
                      {drive.cost ? (
                        <span className="muted small">
                          {currencyFormatter.format(Number(drive.cost ?? 0))}
                        </span>
                      ) : (
                        <span className="muted small">No cost</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel maintenance-panel" style={{ minHeight: '100%' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
            <div>
              <p className="eyebrow">Maintenance</p>
              <h2>Due & overdue</h2>
            </div>
            <button type="button" className="primary" onClick={onOpenMaintenanceTab}>
              Add maintenance
            </button>
          </header>
          <div className="maintenance-list">
            {maintenanceHighlights.length === 0 ? (
              <p className="muted">No open maintenance items right now.</p>
            ) : (
              maintenanceHighlights.map((task) => (
                <article key={task.id} className="maintenance-card">
                  <div>
                    <h3>{task.title}</h3>
                    <p className="muted">
                      {task.due_date ? formatDate(task.due_date) : 'Set date'} /{' '}
                      {task.due_mileage ? formatMiles(task.due_mileage) : 'Set mileage'}
                    </p>
                  </div>
                  <div className="maintenance-meta">
                    <span className={`risk ${task.risk_level ?? 'low'}`}>{task.risk_level ?? 'low'}</span>
                    <span className={`badge ${overdueTasks.includes(task) ? 'danger' : 'warning'}`}>
                      {overdueTasks.includes(task) ? 'Overdue' : 'Due soon'}
                    </span>
                    {onLogTask && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => onLogTask(task, vehicle.current_mileage)}
                      >
                        Mark as done
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="health-card" style={{ minHeight: '100%' }}>
          <h3>System health</h3>
          <ul>
            {healthBreakdown.map((item) => (
              <li key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value}%</span>
                </div>
                <div className="bar tiny">
                  <div style={{ width: `${item.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div style={lowerGridStyles}>
        <VehiclePanel {...vehiclesPanelProps} />
        {isFleet && <TeamPanel {...teamPanelProps} />}
      </div>
    </div>
  )
}

export { StatusTab }

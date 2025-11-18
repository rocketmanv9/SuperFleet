const fleetNavSections = [
  { label: 'Dashboard', hint: 'Overview' },
  { label: 'Vehicles', hint: 'Fleet list' },
  { label: 'Maintenance', hint: 'Tasks & logs' },
  { label: 'Fuel', hint: 'Usage' },
  { label: 'Team', hint: 'Members' },
  { label: 'Reminders', hint: 'Alerts' },
]

const personalNavSections = [
  { label: 'Status', hint: 'My vehicle' },
  { label: 'Maintenance', hint: 'Upkeep' },
  { label: 'Insights', hint: 'Stats' },
]

function Sidebar({ organization, vehicleCount, memberCount, userRole }) {
  const isFleet = organization?.type === 'fleet'
  const navSections = isFleet ? fleetNavSections : personalNavSections
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>{organization?.name ?? 'Fleet'}</h3>
        <p className="muted small">
          {isFleet ? 'Multi-tenant workspace' : 'Personal garage'}
        </p>
      </div>
      <ul className="sidebar-nav">
        {navSections.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <p>{item.hint}</p>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <div>
          <p className="eyebrow">Vehicles</p>
          <strong>{vehicleCount}</strong>
        </div>
        {isFleet ? (
          <div>
            <p className="eyebrow">Members</p>
            <strong>{memberCount}</strong>
            <p className="muted small">{userRole}</p>
          </div>
        ) : (
          <div>
            <p className="eyebrow">Mode</p>
            <strong>Solo</strong>
            <p className="muted small">Just you</p>
          </div>
        )}
      </div>
    </aside>
  )
}

export { Sidebar }

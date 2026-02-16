const fleetTabs = [
  { id: 'status', label: 'Fleet status', hint: 'Overview' },
  { id: 'maintenance', label: 'Maintenance', hint: 'Tasks' },
  { id: 'insights', label: 'Insights', hint: 'Stats' },
]

const personalTabs = [
  { id: 'status', label: 'My vehicle', hint: 'Status' },
  { id: 'maintenance', label: 'Maintenance', hint: 'Upkeep' },
  { id: 'insights', label: 'Insights', hint: 'Stats' },
]

function Sidebar({
  organization,
  vehicleCount,
  memberCount,
  userRole,
  activeTab,
  onSelectTab,
  onOpenTemplates,
}) {
  const isFleet = organization?.type === 'fleet'
  const tabs = isFleet ? fleetTabs : personalTabs
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>{organization?.name ?? 'Fleet'}</h3>
        <p className="muted small">
          {isFleet ? 'Multi-tenant workspace' : 'Personal garage'}
        </p>
      </div>
      <ul className="sidebar-nav">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab(tab.id)}
            >
              <span>{tab.label}</span>
              <p>{tab.hint}</p>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={`nav-button ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={onOpenTemplates}
          >
            <span>Templates</span>
            <p>Manage</p>
          </button>
        </li>
      </ul>
      <div className="sidebar-actions">
        <button
          type="button"
          className={`nav-button ${activeTab === 'organization' ? 'active' : ''}`}
          onClick={() => onSelectTab('organization')}
        >
          <span>Organization</span>
          <p>Invites & Members</p>
        </button>
        <button
          type="button"
          className={`nav-button ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => onSelectTab('account')}
        >
          <span>Account</span>
          <p>Settings</p>
        </button>
      </div>
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

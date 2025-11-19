const fleetTabs = [
  { id: 'status', label: 'Fleet status' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'insights', label: 'Insights' },
]

const personalTabs = [
  { id: 'status', label: 'My vehicle' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'insights', label: 'Insights' },
]

function TabNavigation({ activeTab, onSelect, organization, onSignOut, onOpenTemplates }) {
  const isFleet = organization?.type === 'fleet'
  const tabs = isFleet ? fleetTabs : personalTabs
  return (
    <nav className="tab-navigation">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </a>
      ))}
      <a
        href="#templates"
        className={activeTab === 'templates' ? 'active' : ''}
        onClick={() => onOpenTemplates()}
      >
        Templates
      </a>
      <button type="button" className="ghost" onClick={onSignOut}>
        Sign Out
      </button>
    </nav>
  )
}

export { TabNavigation }


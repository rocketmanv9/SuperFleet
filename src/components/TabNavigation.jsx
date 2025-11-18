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

function TabNavigation({ activeTab, onSelect, organization }) {
  const isFleet = organization?.type === 'fleet'
  const tabs = isFleet ? fleetTabs : personalTabs
  return (
    <div className="tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export { TabNavigation }


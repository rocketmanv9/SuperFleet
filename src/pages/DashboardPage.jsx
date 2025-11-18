import { Toast } from '../components/Toast.jsx'
import { Navbar } from '../components/Navbar.jsx'
import { Sidebar } from '../components/Sidebar.jsx'
import { TabNavigation } from '../components/TabNavigation.jsx'
import { StatusTab } from '../components/StatusTab.jsx'
import { MaintenanceTab } from '../components/MaintenanceTab.jsx'
import { InsightsTab } from '../components/InsightsTab.jsx'

function DashboardPage({
  organization,
  vehicleCount,
  memberCount,
  supabaseReady,
  onSignOut,
  userInfo,
  activeTab,
  onSelectTab,
  toast,
  onDismissToast,
  vehiclesPanelProps,
  maintenancePanelProps,
  fuelPanelProps,
  reminderPanelProps,
  statusStats,
  selectedVehicle,
  insightStats,
  maintenanceSummary,
  dueSoonTasks,
  overdueTasks,
  teamPanelProps,
  onOpenMaintenanceTab,
}) {
  return (
    <div className="app-shell">
      <Sidebar
        organization={organization}
        vehicleCount={vehicleCount}
        memberCount={memberCount}
        userRole={userInfo.role}
      />
      <div className="app-main">
        <Navbar
          organization={organization}
          userInfo={userInfo}
          onSignOut={onSignOut}
          supabaseReady={supabaseReady}
        />
        <main className="dashboard">
          <Toast toast={toast} onDismiss={onDismissToast} />
          {!supabaseReady && (
            <section className="banner info">
              Connect Supabase (<code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code>) to power the live
              experience.
            </section>
          )}

          <TabNavigation activeTab={activeTab} onSelect={onSelectTab} organization={organization} />

          {activeTab === 'status' && (
            <StatusTab
              organization={organization}
              vehicle={selectedVehicle}
              statusStats={statusStats}
              vehiclesPanelProps={vehiclesPanelProps}
              userInfo={userInfo}
              dueSoonTasks={dueSoonTasks}
              overdueTasks={overdueTasks}
              teamPanelProps={teamPanelProps}
              onOpenMaintenanceTab={onOpenMaintenanceTab}
              onLogTask={maintenancePanelProps.onSelectTask}
            />
          )}
          {activeTab === 'maintenance' && (
            <MaintenanceTab
              organization={organization}
              maintenancePanelProps={maintenancePanelProps}
              reminderPanelProps={reminderPanelProps}
              maintenanceSummary={maintenanceSummary}
              dueSoonTasks={dueSoonTasks}
              overdueTasks={overdueTasks}
            />
          )}
          {activeTab === 'insights' && (
            <InsightsTab
              organization={organization}
              fuelPanelProps={fuelPanelProps}
              insightStats={insightStats}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export { DashboardPage }

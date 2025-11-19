import { StatusTab } from '../components/StatusTab.jsx'
import { MaintenanceTab } from '../components/MaintenanceTab.jsx'
import { InsightsTab } from '../components/InsightsTab.jsx'

function DashboardPage({
  organization,
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
  userInfo,
  activeTab,
}) {
  return (
    <>
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
    </>
  )
}

export { DashboardPage }

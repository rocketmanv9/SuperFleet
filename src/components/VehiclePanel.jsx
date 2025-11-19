import { formatMiles } from '../utils/formatters.js'

function VehiclePanel({
  displayedVehicles,
  vehiclesLoading,
  vehiclesError,
  selectedVehicleId,
  onSelectVehicle,
  onAddVehicleClick,
  onEditVehicle,
  onDeleteVehicle,
  showActiveOnly,
  onToggleActiveOnly,
  organization,
}) {
  const isFleet = organization?.type === 'fleet'
  return (
    <section className="panel vehicles-panel">
      <header>
        <div>
          <p className="eyebrow">{isFleet ? 'Vehicle dashboard' : 'My vehicles'}</p>
          <h2>{isFleet ? 'Fleet overview' : 'Personal garage'}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {vehiclesError && <p className="error-text">{vehiclesError}</p>}
          {typeof showActiveOnly === 'boolean' && onToggleActiveOnly && (
            <label className="muted small" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Active only
              <input type="checkbox" checked={showActiveOnly} onChange={onToggleActiveOnly} />
            </label>
          )}
          <button type="button" className="primary" onClick={onAddVehicleClick}>
            Add vehicle
          </button>
        </div>
      </header>
      <div className="vehicles-layout">
        <div className="vehicle-list">
          {vehiclesLoading ? (
            <p className="muted">Loading vehicles...</p>
          ) : displayedVehicles.length === 0 ? (
            <p className="muted">
              No vehicles yet. Tap “Add vehicle” to get started and we will hydrate maintenance templates
              automatically.
            </p>
          ) : (
            displayedVehicles.map((vehicle) => (
              <article
                key={vehicle.id}
                className={`vehicle-card ${vehicle.id === selectedVehicleId ? 'selected' : ''}`}
              >
                <div onClick={() => onSelectVehicle(vehicle.id)} style={{ cursor: 'pointer' }}>
                  <h3>{vehicle.name}</h3>
                  <p className="muted">
                    {vehicle.make} / {vehicle.model} / {vehicle.year ?? '—'}
                  </p>
                </div>
                <div className="vehicle-meta">
                  <span>{formatMiles(vehicle.current_mileage)}</span>
                  <span className={`status ${vehicle.status ?? 'active'}`}>
                    {vehicle.status ?? 'active'}
                  </span>
                </div>
                {vehicle.maintenance_summary && (
                  <div className="vehicle-summary" style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                    <span>{vehicle.maintenance_summary.total_items} tasks</span>
                    <span> / </span>
                    <span>{vehicle.maintenance_summary.completed_logs} done</span>
                    {vehicle.maintenance_summary.overdue_items > 0 && (
                      <>
                        <span> / </span>
                        <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                          {vehicle.maintenance_summary.overdue_items} overdue
                        </span>
                      </>
                    )}
                  </div>
                )}
                <div className="vehicle-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {onEditVehicle && (
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => onEditVehicle(vehicle)}
                    >
                      Edit
                    </button>
                  )}
                  {onDeleteVehicle && (
                    <button
                      type="button"
                      className="danger small"
                      onClick={() => onDeleteVehicle(vehicle.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export { VehiclePanel }

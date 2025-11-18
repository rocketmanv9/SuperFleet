import { formatMiles } from '../utils/formatters.js'

function VehiclePanel({
  displayedVehicles,
  vehiclesLoading,
  vehiclesError,
  selectedVehicleId,
  onSelectVehicle,
  onAddVehicleClick,
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
                onClick={() => onSelectVehicle(vehicle.id)}
              >
                <div>
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
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export { VehiclePanel }

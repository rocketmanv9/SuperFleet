import { useMemo, useState } from 'react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState('name')

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const searched = !query
      ? displayedVehicles
      : displayedVehicles.filter((vehicle) => {
          const haystack = [
            vehicle.name,
            vehicle.make,
            vehicle.model,
            vehicle.vin,
            vehicle.year,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return haystack.includes(query)
        })

    const sorted = [...searched]
    sorted.sort((a, b) => {
      if (sortMode === 'mileage-desc') {
        return Number(b.current_mileage || 0) - Number(a.current_mileage || 0)
      }
      if (sortMode === 'mileage-asc') {
        return Number(a.current_mileage || 0) - Number(b.current_mileage || 0)
      }
      return String(a.name || '').localeCompare(String(b.name || ''))
    })

    return sorted
  }, [displayedVehicles, searchQuery, sortMode])

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
        <div className="vehicle-list" style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
            <input
              type="search"
              placeholder="Search by name, make, model, VIN..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="mileage-desc">Sort: Highest mileage</option>
              <option value="mileage-asc">Sort: Lowest mileage</option>
            </select>
          </div>

          {vehiclesLoading ? (
            <p className="muted">Loading vehicles...</p>
          ) : filteredVehicles.length === 0 ? (
            <p className="muted">
              {displayedVehicles.length === 0
                ? 'No vehicles yet. Tap “Add vehicle” to get started and we will hydrate maintenance templates automatically.'
                : 'No vehicles match your current search.'}
            </p>
          ) : (
            filteredVehicles.map((vehicle) => (
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

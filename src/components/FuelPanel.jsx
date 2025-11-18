import { FuelCostChart } from './FuelCostChart.jsx'
import { currencyFormatter, formatDate } from '../utils/formatters.js'

function FuelPanel({ fuelLogs, fuelLoading, fuelError, fuelSummary, organization, onLogFuel }) {
  const isFleet = organization?.type === 'fleet'

  return (
    <section className="panel fuel-panel">
      <header>
        <div>
          <p className="eyebrow">{isFleet ? 'Fuel logs' : 'My fuel logs'}</p>
          <h2>{isFleet ? 'Usage & costs' : 'Mileage & spend'}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {fuelError && <p className="error-text">{fuelError}</p>}
          <button type="button" className="primary" onClick={onLogFuel}>
            Log fuel
          </button>
        </div>
      </header>
      <div className="fuel-grid">
        <div className="fuel-list">
          {fuelLoading ? (
            <p className="muted">Syncing fuel entries...</p>
          ) : fuelLogs.length === 0 ? (
            <p className="muted">No fuel entries yet. Log the latest fill-up to start tracking.</p>
          ) : (
            <ul>
              {fuelLogs.map((log) => (
                <li key={log.id}>
                  <div>
                    <strong>{formatDate(log.log_date)}</strong>
                    <span className="muted">
                      {log.miles_driven ?? '-'} mi / {log.gallons ?? '-'} gal
                    </span>
                  </div>
                  <div>
                    <span>{currencyFormatter.format(Number(log.cost ?? 0))}</span>
                    {log.miles_driven && log.gallons && (
                      <span className="muted">
                        {(Number(log.miles_driven) / Number(log.gallons)).toFixed(1)} MPG
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="streak-card">
          <h3>Fuel summary</h3>
          <div className="fuel-summary">
            <div>
              <p className="eyebrow">Total spend ({fuelLogs.length || 0} logs)</p>
              <strong>{currencyFormatter.format(fuelSummary.totalSpend)}</strong>
            </div>
            <div>
              <p className="eyebrow">Avg MPG</p>
              <strong>{fuelSummary.avgMpg}</strong>
            </div>
          </div>
          <p className="muted small">
            Keep logging fill-ups to refine insights. Supabase stores entries in <code>fuel_logs</code>.
          </p>
        </div>
        <div className="fuel-chart">
          <h3>Fuel spend</h3>
          <FuelCostChart logs={fuelLogs} />
        </div>
      </div>
    </section>
  )
}

export { FuelPanel }

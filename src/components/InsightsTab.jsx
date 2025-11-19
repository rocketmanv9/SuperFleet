import { FuelPanel } from './FuelPanel.jsx'

function InsightsTab({ organization, fuelPanelProps, insightStats }) {
  const { costPerMile, totalSpend, reliabilityScore, predictedDays, totalMiles } = insightStats
  const isFleet = organization?.type === 'fleet'

  return (
    <div className="tab-content insights-tab">
      <section className="insights-grid">
        <div className="insight-card">
          <p className="eyebrow">Cost per mile</p>
          <strong>${costPerMile.toFixed(2)}</strong>
          <p className="muted small">Fuel + maintenance blended rate</p>
        </div>
        <div className="insight-card">
          <p className="eyebrow">Reliability score</p>
          <strong>{reliabilityScore}%</strong>
          <p className="muted small">
            {reliabilityScore > 80 ? 'Legendary uptime' : 'Dial in maintenance and fuel logs'}
          </p>
        </div>
        <div className="insight-card">
          <p className="eyebrow">Next service ETA</p>
          <strong>{predictedDays ? `${predictedDays} days` : 'Sync schedule'}</strong>
          <p className="muted small">Based on current mileage trend</p>
        </div>
        <div className="insight-card">
          <p className="eyebrow">Lifetime miles</p>
          <strong>{totalMiles.toLocaleString()} mi</strong>
          <p className="muted small">
            {isFleet ? 'Total fleet mileage' : 'Keep chasing milestones'}
          </p>
        </div>
        <div className="insight-card">
          <p className="eyebrow">Total spend logged</p>
          <strong>${totalSpend.toFixed(2)}</strong>
          <p className="muted small">
            {isFleet ? 'Across all fleet fuel entries' : 'Across your entries'}
          </p>
        </div>
      </section>
      <FuelPanel {...fuelPanelProps} />
    </div>
  )
}

export { InsightsTab }


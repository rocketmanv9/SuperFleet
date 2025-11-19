function FuelCostChart({ logs }) {
  if (!logs?.length) {
    return <p className="muted">Fuel entries will appear here once logged.</p>
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime(),
  )
  const maxCost = Math.max(...sorted.map((log) => Number(log.cost ?? 0)), 0)
  const points = sorted.map((log, index) => {
    const x = sorted.length === 1 ? 50 : (index / (sorted.length - 1)) * 100
    const y = maxCost ? 100 - (Number(log.cost) / maxCost) * 100 : 100
    return `${x},${y}`
  })
  const lastPoint = points[points.length - 1] ?? '0,0'
  const [lastX, lastY] = lastPoint.split(',')

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Fuel spend over time">
      <polyline points={points.join(' ')} />
      <circle cx={lastX} cy={lastY} r="2" />
    </svg>
  )
}

export { FuelCostChart }

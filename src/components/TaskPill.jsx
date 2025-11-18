function TaskPill({ tone, label, helper }) {
  return (
    <span className={`task-pill task-pill-${tone}`}>
      <strong>{label}</strong>
      <span>{helper}</span>
    </span>
  )
}

export { TaskPill }

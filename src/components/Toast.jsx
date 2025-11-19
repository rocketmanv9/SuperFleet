function Toast({ toast, onDismiss }) {
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.tone}`}>
      <span>{toast.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  )
}

export { Toast }

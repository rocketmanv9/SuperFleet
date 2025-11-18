import { createPortal } from 'react-dom'
import { useEffect } from 'react'

const overlayStyles = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  zIndex: 1000,
}

const dialogStyles = {
  width: 'min(540px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  borderRadius: '16px',
  boxShadow: 'var(--shadow-lg)',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-medium)',
}

const headerStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 24px 0 24px',
  gap: '12px',
}

const closeButtonStyles = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
}

const bodyStyles = {
  padding: '16px 24px 24px 24px',
}

const footerStyles = {
  padding: '0 24px 24px 24px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
}

function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div
      style={overlayStyles}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Modal dialog'}
      onClick={() => onClose?.()}
    >
      <div style={dialogStyles} onClick={(event) => event.stopPropagation()}>
        {(title || onClose) && (
          <header style={headerStyles}>
            {title ? <h3>{title}</h3> : <span />}
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close dialog" style={closeButtonStyles}>
                ×
              </button>
            )}
          </header>
        )}
        <div style={bodyStyles}>{children}</div>
        {footer && <footer style={footerStyles}>{footer}</footer>}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export { Modal }

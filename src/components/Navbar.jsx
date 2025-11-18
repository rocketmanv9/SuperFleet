function Navbar({ organization, userInfo, onSignOut, supabaseReady }) {
  const initial = (userInfo.name || 'U').slice(0, 1).toUpperCase()
  const isFleet = organization?.type === 'fleet'
  const subtitle = isFleet ? userInfo.role : 'Solo driver'
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">SF</div>
        <div>
          <p className="eyebrow">Super Fleet</p>
          <h2>{organization?.name ?? 'Fleet'}</h2>
        </div>
      </div>
      <div className="navbar-actions">
        <div className="navbar-user">
          <span className="avatar">{initial}</span>
          <div>
            <strong>{userInfo.name}</strong>
            <p className="muted small">{subtitle}</p>
          </div>
        </div>
        <button type="button" className="ghost" onClick={onSignOut} disabled={!supabaseReady}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export { Navbar }

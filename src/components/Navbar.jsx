function Navbar({ userInfo, onSignOut, supabaseReady }) {
  const initial = (userInfo.name || 'U').slice(0, 1).toUpperCase()
  return (
    <header className="navbar compact">
      <div className="navbar-actions">
        <div className="navbar-user">
          <span className="avatar">{initial}</span>
          <div>
            <strong>{userInfo.name}</strong>
            <p className="muted small">{userInfo.role}</p>
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

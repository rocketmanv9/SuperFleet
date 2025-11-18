function AuthPage({
  authMode,
  loginForm,
  registerForm,
  authLoading,
  authError,
  supabaseReady,
  onSignIn,
  onSignUp,
  onLoginChange,
  onRegisterChange,
  onToggleMode,
}) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <header>
          <p className="eyebrow">Super Fleet</p>
          <h1>
            {authMode === 'signIn'
              ? 'Sign in to manage your fleet'
              : 'Create your fleet workspace'}
          </h1>
          <p className="muted">
            {authMode === 'signIn'
              ? 'Use your Supabase credentials. Each user only sees their organization.'
              : 'Invite-only? No problem--spin up a workspace with your own organization name.'}
          </p>
        </header>
        {authMode === 'signIn' ? (
          <form onSubmit={onSignIn} className="stack">
            <label>
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => onLoginChange('email', event.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => onLoginChange('password', event.target.value)}
                required
              />
            </label>
            <button type="submit" className="primary" disabled={authLoading || !supabaseReady}>
              {authLoading ? 'Signing in...' : 'Sign in'}
            </button>
            {authError && <p className="error-text">{authError}</p>}
          </form>
        ) : (
          <form onSubmit={onSignUp} className="stack">
            <label>
              <span>Full name</span>
              <input
                value={registerForm.full_name}
                onChange={(event) => onRegisterChange('full_name', event.target.value)}
                placeholder="Avery Park"
              />
            </label>
            <label>
              <span>Organization</span>
              <input
                value={registerForm.organization_name}
                onChange={(event) => onRegisterChange('organization_name', event.target.value)}
                placeholder="Northwind Logistics"
                required
              />
            </label>
            <label>
              <span>Work email</span>
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) => onRegisterChange('email', event.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => onRegisterChange('password', event.target.value)}
                minLength={6}
                required
              />
            </label>
            <button type="submit" className="primary" disabled={authLoading || !supabaseReady}>
              {authLoading ? 'Creating workspace...' : 'Create workspace'}
            </button>
            {authError && <p className="error-text">{authError}</p>}
          </form>
        )}
        <button type="button" className="link-button" onClick={onToggleMode}>
          {authMode === 'signIn' ? 'Need an account? Create one' : 'Have an account? Sign in'}
        </button>
        {!supabaseReady && (
          <p className="muted small">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to use live data.
          </p>
        )}
      </div>
    </div>
  )
}

export { AuthPage }

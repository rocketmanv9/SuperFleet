import { formatPhoneNumber } from '../utils/formatters'

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
            <fieldset className="mode-toggle" style={{ border: 'none', padding: 0 }}>
              <legend className="muted small">Workspace mode</legend>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="radio"
                    name="register-mode"
                    value="create"
                    checked={registerForm.mode === 'create'}
                    onChange={() => onRegisterChange('mode', 'create')}
                  />
                  Create organization
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="radio"
                    name="register-mode"
                    value="join"
                    checked={registerForm.mode === 'join'}
                    onChange={() => onRegisterChange('mode', 'join')}
                  />
                  Join with invite
                </label>
              </div>
            </fieldset>
            {registerForm.mode === 'create' ? (
              <label>
                <span>Organization name</span>
                <input
                  value={registerForm.organization_name}
                  onChange={(event) => onRegisterChange('organization_name', event.target.value)}
                  placeholder="Northwind Logistics"
                  required={registerForm.mode === 'create'}
                />
              </label>
            ) : (
              <label>
                <span>Invitation token</span>
                <input
                  value={registerForm.invite_token}
                  onChange={(event) => onRegisterChange('invite_token', event.target.value)}
                  placeholder="Paste invitation token"
                  required={registerForm.mode === 'join'}
                />
              </label>
            )}
            <label>
              <span>Phone number</span>
              <input
                type="tel"
                value={registerForm.phone_number}
                onChange={(event) =>
                  onRegisterChange('phone_number', formatPhoneNumber(event.target.value))
                }
                placeholder="+12345678910"
                pattern="^\+[0-9]{7,15}$"
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
              {authLoading
                ? registerForm.mode === 'create'
                  ? 'Creating workspace...'
                  : 'Joining...'
                : registerForm.mode === 'create'
                ? 'Create workspace'
                : 'Join workspace'}
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

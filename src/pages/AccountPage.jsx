function AccountPage({
  userInfo,
  onUpdateAccount,
  isUpdating,
}) {
  return (
    <div className="page-container">
      <header className="page-header">
        <h2>Account Settings</h2>
        <p className="muted">Manage your personal information and preferences</p>
      </header>
      <div className="page-content">
        <section className="panel">
          <header>
            <h3>Profile Information</h3>
          </header>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                defaultValue={userInfo.name}
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                defaultValue={userInfo.email}
                placeholder="your.email@example.com"
                disabled
              />
              <p className="muted small">Email cannot be changed</p>
            </div>
            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                defaultValue={userInfo.role}
                disabled
              />
              <p className="muted small">Assigned by organization</p>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="primary" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>

        <section className="panel">
          <header>
            <h3>Security</h3>
          </header>
          <div className="form-group">
            <label>Change Password</label>
            <button type="button" className="secondary">
              Update Password
            </button>
            <p className="muted small">You will receive an email to reset your password</p>
          </div>
        </section>

        <section className="panel">
          <header>
            <h3>Danger Zone</h3>
          </header>
          <div className="form-group">
            <label>Delete Account</label>
            <button type="button" className="danger">
              Delete My Account
            </button>
            <p className="muted small">This action cannot be undone</p>
          </div>
        </section>
      </div>
    </div>
  )
}

export { AccountPage }

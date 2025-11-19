function OrganizationSelectorPage({
  organizations,
  loading,
  error,
  onSelect,
  onSignOut,
  onCreate,
  onLeave,
  invitations,
  invitationsLoading,
  onAcceptInvite,
}) {
  const hasInvites = invitations && invitations.length > 0
  let createInputRef = null
  return (
    <div className="org-shell">
      <div className="org-card">
        <header>
          <h1>Select an Organization</h1>
          <p className="muted">Choose which workspace you want to manage.</p>
        </header>
        {loading && <p>Loading organizations...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && organizations.length === 0 && (
          <p>No organizations found for this account.</p>
        )}
        {!loading && !error && organizations.length > 0 && (
          <ul className="org-list">
            {organizations.map((org) => (
              <li key={org.id} className="org-row">
                <div className="org-info">
                  <strong>{org.name}</strong>
                  <span className="muted small">{org.type}</span>
                </div>
                <div className="row-actions">
                  <button type="button" className="primary" onClick={() => onSelect(org.id)}>
                    Use
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onLeave && onLeave(org.id)}
                    disabled={org.role === 'owner'}
                  >
                    {org.role === 'owner' ? 'Owner' : 'Leave'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <section className="create-org">
          <h2 className="small">Create Organization</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const name = createInputRef?.value?.trim()
              if (name) onCreate && onCreate(name)
              if (createInputRef) createInputRef.value = ''
            }}
            className="stack"
          >
            <input
              placeholder="New org name"
              ref={(el) => (createInputRef = el)}
              required
            />
            <button type="submit" className="primary">
              Create
            </button>
          </form>
        </section>
        <section className="pending-invites">
          <h2 className="small">Invitations</h2>
          {invitationsLoading && <p>Loading invitations...</p>}
          {!invitationsLoading && !hasInvites && <p className="muted small">No pending invites.</p>}
          {!invitationsLoading && hasInvites && (
            <ul className="invite-list">
              {invitations.map((inv) => (
                <li key={inv.id} className="invite-row">
                  <div className="invite-info">
                    <strong>{inv.organization_name}</strong>
                    <span className="muted small">Role: {inv.role}</span>
                  </div>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onAcceptInvite && onAcceptInvite(inv.token)}
                  >
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="actions stack">
          <button type="button" className="link-button" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

export { OrganizationSelectorPage }

function TeamPanel({ members, membersLoading, membersError, organization, userRole, onInviteClick }) {
  const canInvite = userRole === 'owner' || userRole === 'admin'

  return (
    <section className="panel team-panel">
      <header>
        <div>
          <p className="eyebrow">Team</p>
          <h2>{organization?.name ?? 'Organization'} members</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {membersError && <p className="error-text">{membersError}</p>}
          {canInvite && (
            <button type="button" className="primary" onClick={onInviteClick}>
              Invite teammate
            </button>
          )}
        </div>
      </header>
      <div className="team-grid">
        <div className="member-list" style={{ gridColumn: '1 / -1' }}>
          {membersLoading ? (
            <p className="muted">Loading teammates...</p>
          ) : members.length === 0 ? (
            <p className="muted">
              Add your first teammate to collaborate on maintenance, reminders, and fuel logs.
            </p>
          ) : (
            <ul>
              {members.map((member) => (
                <li key={member.id}>
                  <div>
                    <strong>{member.full_name ?? member.email}</strong>
                    <span className="muted">{member.email}</span>
                  </div>
                  <span className={`role ${member.role}`}>{member.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {!canInvite && (
        <p className="muted small" style={{ marginTop: '1rem' }}>
          You need admin permissions to send invites or edit members.
        </p>
      )}
    </section>
  )
}

export { TeamPanel }

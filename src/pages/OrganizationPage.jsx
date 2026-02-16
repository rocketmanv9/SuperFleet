const roleDefinitions = [
  {
    name: 'owner',
    label: 'Owner',
    color: '#f59e0b',
    permissions: [
      'Full access to all features',
      'Manage organization settings',
      'Invite and remove members',
      'Assign roles to members',
      'Delete organization',
    ],
  },
  {
    name: 'admin',
    label: 'Admin',
    color: '#3b82f6',
    permissions: [
      'Manage all vehicles and maintenance',
      'Invite new members',
      'View all team activity',
      'Cannot delete organization',
    ],
  },
  {
    name: 'member',
    label: 'Member',
    color: '#10b981',
    permissions: [
      'Add and edit vehicles',
      'Log maintenance and fuel',
      'View team vehicles',
      'Cannot invite others',
    ],
  },
  {
    name: 'viewer',
    label: 'Viewer',
    color: '#64748b',
    permissions: [
      'View vehicles and maintenance logs',
      'View reports and insights',
      'Cannot edit or add data',
      'Read-only access',
    ],
  },
]

function OrganizationPage({
  invitations,
  invitationsLoading,
  sentInvitations,
  sentInvitationsLoading,
  onAcceptInvite,
  onCopyInviteToken,
  onRevokeInvite,
  teamPanelProps,
  canInvite,
}) {
  return (
    <div className="page-container">
      <header className="page-header">
        <h2>Organization Management</h2>
        <div>
          {canInvite && (
            <button type="button" className="primary" onClick={teamPanelProps.onInviteClick}>
              Invite Member
            </button>
          )}
        </div>
      </header>
      <div className="page-content">
        <section className="panel">
          <header>
            <h3>Incoming Invitations</h3>
          </header>
          {invitationsLoading ? (
            <p>Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="muted">You have no pending invitations.</p>
          ) : (
            <ul className="invite-list">
              {invitations.map((invite) => (
                <li key={invite.id}>
                  <span>
                    You have been invited to join <strong>{invite.organization_name}</strong>.
                  </span>
                  <button
                    type="button"
                    className="primary small"
                    onClick={() => onAcceptInvite(invite.token)}
                  >
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canInvite && (
          <section className="panel">
            <header>
              <h3>Sent Invitations</h3>
              <p className="muted small">Copy invite tokens or revoke pending invites.</p>
            </header>
            {sentInvitationsLoading ? (
              <p>Loading sent invites...</p>
            ) : sentInvitations.length === 0 ? (
              <p className="muted">No pending invites sent from this organization.</p>
            ) : (
              <ul className="invite-list">
                {sentInvitations.map((invite) => (
                  <li key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <span>
                      <strong>{invite.invitee_email}</strong> · role: <strong>{invite.role}</strong>
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="ghost small"
                        onClick={() => onCopyInviteToken(invite.token)}
                      >
                        Copy token
                      </button>
                      <button
                        type="button"
                        className="danger small"
                        onClick={() => onRevokeInvite(invite.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="panel">
          <header>
            <h3>Team Members</h3>
          </header>
          <p className="muted">Members will be displayed here when you add team members to your organization.</p>
        </section>

        <section className="panel">
          <header>
            <h3>Role Permissions</h3>
            <p className="muted small">Understanding what each role can do in your organization</p>
          </header>
          <div className="roles-grid">
            {roleDefinitions.map((role) => (
              <article key={role.name} className="role-card">
                <div className="role-header">
                  <span
                    className="role-badge"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.label}
                  </span>
                </div>
                <ul className="role-permissions">
                  {role.permissions.map((permission, idx) => (
                    <li key={idx} className="permission-item">
                      <span className="permission-icon">✓</span>
                      {permission}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export { OrganizationPage }

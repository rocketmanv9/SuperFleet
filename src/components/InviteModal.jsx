import { Modal } from './Modal.jsx'

function InviteModal({ open, onClose, inviteForm, onInviteFormChange, onSubmitInvite, inviteSubmitting, canInvite, roles }) {
  const footer = (
    <>
      <button type="button" className="ghost" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="primary" form="invite-form" disabled={!canInvite || inviteSubmitting}>
        {!canInvite ? 'View only' : inviteSubmitting ? 'Sending...' : 'Send invite'}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title="Invite teammate" footer={footer}>
      {!canInvite ? (
        <p className="muted small">You need admin permissions to invite or edit members.</p>
      ) : (
        <form id="invite-form" className="invite-form" onSubmit={onSubmitInvite}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(event) => onInviteFormChange('email', event.target.value)}
              placeholder="person@company.com"
            />
          </label>
          <label>
            <span>Role</span>
            <select value={inviteForm.role} onChange={(event) => onInviteFormChange('role', event.target.value)}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            Invites store inside <code>organization_invites</code> with links to Supabase Auth.
          </p>
        </form>
      )}
    </Modal>
  )
}

export { InviteModal }

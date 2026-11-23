import { useEffect, useState } from 'react';
import { useAuth } from './authContext';
import { authErrorMessage } from './authErrors';

const NO_STATUS = { type: '', text: '' };

// On this page a credential error can only mean the current password was wrong.
const profileErrorMessage = (err) =>
  ['auth/invalid-credential', 'auth/wrong-password'].includes(err?.code)
    ? 'Your current password is incorrect. Check it and try again.'
    : authErrorMessage(err);

// Status line under a form: green for success, red for errors, neutral otherwise.
function FormStatus({ status }) {
  if (!status.text) return null;
  const className = status.type === 'error' ? 'form-error' : status.type === 'success' ? 'form-success' : 'form-hint';
  return <p className={className} role={status.type === 'error' ? 'alert' : 'status'}>{status.text}</p>;
}

// Asks the browser to warn before closing or reloading the tab while `active` is true.
function useLeaveWarning(active) {
  useEffect(() => {
    if (!active) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
}

export default function Profile({ profile, tasks, onSave, onDirtyChange }) {
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const dirty = detailsDirty || passwordDirty;

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useLeaveWarning(dirty);

  const completed = tasks.filter((task) => task.completed).length;
  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || profile.email[0]?.toUpperCase() || 'U';

  return (
    <main className="profile-page">
      <section className="card profile-summary" aria-labelledby="profile-name">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div>
          <h2 id="profile-name">{profile.fullName || 'Your profile'}</h2>
          <p className="profile-email">{profile.email}</p>
        </div>
      </section>

      <DetailsForm profile={profile} onSave={onSave} onDirtyChange={setDetailsDirty} />
      <PasswordForm onDirtyChange={setPasswordDirty} />

      <section className="card" aria-labelledby="task-overview-heading">
        <h2 id="task-overview-heading">Task overview</h2>
        <dl className="profile-stats">
          <div><dt>Total tasks</dt><dd>{tasks.length}</dd></div>
          <div><dt>Completed</dt><dd>{completed}</dd></div>
          <div><dt>Pending</dt><dd>{tasks.length - completed}</dd></div>
        </dl>
      </section>
    </main>
  );
}

function DetailsForm({ profile, onSave, onDirtyChange }) {
  const { updateAccount } = useAuth();
  const [draft, setDraft] = useState({ ...profile });
  const [currentPassword, setCurrentPassword] = useState('');
  const [status, setStatus] = useState(NO_STATUS);
  const [busy, setBusy] = useState(false);

  const emailChanged = draft.email.trim() !== profile.email;
  const dirty = draft.fullName.trim() !== profile.fullName || emailChanged;
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  function handleChange(e) {
    setDraft({ ...draft, [e.target.name]: e.target.value });
    setStatus(NO_STATUS);
  }

  function discard() {
    setDraft({ ...profile });
    setCurrentPassword('');
    setStatus(NO_STATUS);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fullName = draft.fullName.trim();
    const email = draft.email.trim();
    if (!fullName) {
      setStatus({ type: 'error', text: 'Enter your full name.' });
      return;
    }

    setBusy(true);
    setStatus(NO_STATUS);
    try {
      const { emailPending } = await updateAccount({ fullName, email, currentPassword });
      // The email shown stays the old one until the user confirms the new address.
      const saved = { fullName, email: profile.email };
      onSave(saved);
      setDraft(saved);
      setCurrentPassword('');
      setStatus({
        type: 'success',
        text: emailPending
          ? `Name saved. To finish changing your email, open the link we sent to ${email}.`
          : 'Profile saved.',
      });
    } catch (err) {
      setStatus({ type: 'error', text: profileErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="profile-details-heading">
      <h2 id="profile-details-heading">Personal information</h2>
      <p className="profile-description">Change the name other list members see, or the email you sign in with.</p>
      <form className="task-form" onSubmit={handleSubmit}>
        <div className="profile-fields">
          <div className="form-group">
            <label htmlFor="profile-fullName">Full name</label>
            <input id="profile-fullName" name="fullName" type="text" autoComplete="name"
              placeholder="e.g., Juan dela Cruz" value={draft.fullName} onChange={handleChange} disabled={busy} required />
          </div>
          <div className="form-group">
            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" name="email" type="email" autoComplete="email"
              value={draft.email} onChange={handleChange} disabled={busy} required />
          </div>
        </div>

        {emailChanged && (
          <div className="form-group">
            <label htmlFor="profile-currentPassword">Current password</label>
            <input id="profile-currentPassword" type="password" autoComplete="current-password"
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              aria-describedby="profile-currentPassword-hint" disabled={busy} required />
            <p id="profile-currentPassword-hint" className="field-hint">We need this to confirm it's you before changing your email.</p>
          </div>
        )}

        <FormStatus status={dirty && !status.text ? { type: 'hint', text: 'You have unsaved changes.' } : status} />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!dirty || busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={discard} disabled={!dirty || busy}>
            Discard changes
          </button>
        </div>
      </form>
    </section>
  );
}

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

function PasswordForm({ onDirtyChange }) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [status, setStatus] = useState(NO_STATUS);
  const [busy, setBusy] = useState(false);

  const dirty = Object.values(form).some(Boolean);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setStatus(NO_STATUS);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setStatus({ type: 'error', text: "The new passwords don't match. Type the same password in both fields." });
      return;
    }

    setBusy(true);
    setStatus(NO_STATUS);
    try {
      await changePassword(form.current, form.next);
      setForm(EMPTY_PASSWORDS);
      setStatus({ type: 'success', text: 'Password changed. Use your new password next time you sign in.' });
    } catch (err) {
      setStatus({ type: 'error', text: profileErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="password-heading">
      <h2 id="password-heading">Change password</h2>
      <form className="task-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password-current">Current password</label>
          <input id="password-current" name="current" type="password" autoComplete="current-password"
            value={form.current} onChange={handleChange} disabled={busy} required />
        </div>
        <div className="profile-fields">
          <div className="form-group">
            <label htmlFor="password-next">New password</label>
            <input id="password-next" name="next" type="password" autoComplete="new-password" minLength={6}
              aria-describedby="password-next-hint" value={form.next} onChange={handleChange} disabled={busy} required />
            <p id="password-next-hint" className="field-hint">At least 6 characters.</p>
          </div>
          <div className="form-group">
            <label htmlFor="password-confirm">Confirm new password</label>
            <input id="password-confirm" name="confirm" type="password" autoComplete="new-password" minLength={6}
              value={form.confirm} onChange={handleChange} disabled={busy} required />
          </div>
        </div>

        <FormStatus status={status} />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!dirty || busy}>
            {busy ? 'Changing…' : 'Change password'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => { setForm(EMPTY_PASSWORDS); setStatus(NO_STATUS); }} disabled={!dirty || busy}>
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}

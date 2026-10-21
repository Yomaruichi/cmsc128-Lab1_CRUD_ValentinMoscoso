import { useState } from 'react';

export default function Profile({ profile, tasks, onSave }) {
  const [draft, setDraft] = useState({ ...profile });
  const [saved, setSaved] = useState(false);
  const completed = tasks.filter((task) => task.completed).length;
  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || profile.email[0]?.toUpperCase() || 'U';

  function handleChange(event) {
    setDraft({ ...draft, [event.target.name]: event.target.value });
    setSaved(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const fullName = draft.fullName.trim();
    if (!fullName) {
      event.currentTarget.elements.fullName.setCustomValidity('Enter your full name.');
      event.currentTarget.elements.fullName.reportValidity();
      return;
    }
    const updatedProfile = { fullName, email: draft.email.trim() };
    onSave(updatedProfile);
    setDraft(updatedProfile);
    setSaved(true);
  }

  return (
    <main className="profile-page">
      <section className="card profile-summary" aria-labelledby="profile-name">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div>
          <h2 id="profile-name">{profile.fullName || 'Your Profile'}</h2>
          <p className="profile-email">{profile.email}</p>
        </div>
      </section>

      <section className="card" aria-labelledby="profile-details-heading">
        <h2 id="profile-details-heading">Personal Information</h2>
        <p className="profile-description">
          Update your name and email address. Changes are saved for this session.
        </p>
        <form className="task-form" onSubmit={handleSubmit}>
          <div className="profile-fields">
            <div className="form-group">
              <label htmlFor="profile-fullName">Full Name</label>
              <input
                id="profile-fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="e.g., Juan dela Cruz"
                value={draft.fullName}
                onChange={(event) => {
                  event.target.setCustomValidity('');
                  handleChange(event);
                }}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-email">Email Address</label>
              <input
                id="profile-email"
                name="email"
                type="email"
                autoComplete="email"
                value={draft.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="profile-actions">
            <button type="submit" className="btn btn-primary">Save Changes</button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={(event) => {
                event.currentTarget.form.elements.fullName.setCustomValidity('');
                setDraft({ ...profile });
                setSaved(false);
              }}
            >
              Cancel
            </button>
            <span className="profile-status" role="status">
              {saved ? 'Profile updated.' : ''}
            </span>
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby="task-overview-heading">
        <h2 id="task-overview-heading">Task Overview</h2>
        <dl className="profile-stats">
          <div><dt>Total Tasks</dt><dd>{tasks.length}</dd></div>
          <div><dt>Completed</dt><dd>{completed}</dd></div>
          <div><dt>Pending</dt><dd>{tasks.length - completed}</dd></div>
        </dl>
      </section>
    </main>
  );
}

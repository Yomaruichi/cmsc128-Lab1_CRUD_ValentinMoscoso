import { useState } from 'react';
import './ListBar.css';

// List switcher + collaborative list management.
// The buttons shown here are a convenience only; the server re-checks ownership
// and membership on every request.
export default function ListBar({
  lists,
  activeListId,
  currentUid,
  onSelect,
  onCreate,
  onDelete,
  onAddMember,
  onRemoveMember,
}) {
  const [newName, setNewName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const active = lists.find((l) => l.id === activeListId) || null;

  async function run(action, successText) {
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      await action();
      if (successText) setMsg({ type: 'info', text: successText });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  function handleSelect(e) {
    setMsg({ type: '', text: '' });
    onSelect(e.target.value);
  }

  function handleCreate(e) {
    e.preventDefault();
    run(async () => {
      await onCreate(newName.trim());
      setNewName('');
    }, 'List created.');
  }

  function handleAdd(e) {
    e.preventDefault();
    run(async () => {
      await onAddMember(active.id, email.trim());
      setEmail('');
    }, 'Member added.');
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${active.name}" and all of its tasks? This cannot be undone.`)) return;
    run(() => onDelete(active.id));
  }

  function handleLeave() {
    if (!window.confirm(`Leave "${active.name}"? You will lose access to its tasks.`)) return;
    run(() => onRemoveMember(active.id, currentUid));
  }

  function handleRemove(member) {
    if (!window.confirm(`Remove ${member.displayName || member.email} from "${active.name}"?`)) return;
    run(() => onRemoveMember(active.id, member.uid));
  }

  const ownerName = (list) => {
    const owner = list.members.find((m) => m.uid === list.ownerId);
    return owner?.displayName || owner?.email || 'owner';
  };

  return (
    <section className="card list-bar">
      <div className="list-bar-row">
        <div className="control-group">
          <label htmlFor="listSelect">To-Do List:</label>
          <select id="listSelect" value={activeListId} onChange={handleSelect}>
            <option value="personal">Personal</option>
            {lists.length > 0 && (
              <optgroup label="Collaborative">
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.isOwner ? '' : ` (shared by ${ownerName(l)})`}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <form className="list-inline-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New collaborative list name"
            aria-label="New collaborative list name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
            required
          />
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            Create List
          </button>
        </form>
      </div>

      {msg.text && (
        <p className={msg.type === 'error' ? 'form-error' : 'form-info'} role="alert">
          {msg.text}
        </p>
      )}

      {active && (
        <div className="list-members">
          <h3>Members of "{active.name}"</h3>
          <ul>
            {active.members.map((m) => (
              <li key={m.uid}>
                <span>
                  {m.displayName || m.email}
                  {m.uid === active.ownerId && ' (owner)'}
                  {m.uid === currentUid && ' (you)'}
                </span>
                {active.isOwner && m.uid !== active.ownerId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => handleRemove(m)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          {active.isOwner ? (
            <form className="list-inline-form" onSubmit={handleAdd}>
              <input
                type="email"
                placeholder="Add a member by email"
                aria-label="Email of the user to add"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Add Member
              </button>
            </form>
          ) : (
            <p className="login-subtitle">Only the list owner can add or remove members.</p>
          )}

          <div className="list-danger">
            {active.isOwner ? (
              <button type="button" className="btn btn-danger" disabled={busy} onClick={handleDelete}>
                Delete List
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={handleLeave}>
                Leave List
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

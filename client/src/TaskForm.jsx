export const EMPTY_TASK = { title: '', dueDate: '', priority: 'Med', tag: 'School' };

// Add/edit form for one task. The parent owns the form values so it can
// load a task into the form when the user clicks Edit.
export default function TaskForm({ form, onChange, onSubmit, onCancel, isEditing, saving, listTitle }) {
  const handleChange = (e) => onChange({ ...form, [e.target.id]: e.target.value });
  const submitLabel = isEditing
    ? (saving ? 'Saving…' : 'Save changes')
    : (saving ? 'Adding…' : 'Add task');

  return (
    <section className="card" aria-labelledby="task-form-heading">
      <h2 id="task-form-heading">{isEditing ? 'Edit task' : `Add a task to ${listTitle}`}</h2>
      <form onSubmit={onSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input type="text" id="title" placeholder="e.g., Submit software architecture diagram" value={form.title} onChange={handleChange} maxLength={200} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dueDate">Due date and time</label>
            <input type="datetime-local" id="dueDate" value={form.dueDate} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={form.priority} onChange={handleChange}>
              <option value="Low">Low</option><option value="Med">Medium</option><option value="High">High</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="tag">Tag</label>
            <select id="tag" value={form.tag} onChange={handleChange}>
              <option value="School">School</option><option value="Personal">Personal</option><option value="Others">Others</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{submitLabel}</button>
          {isEditing && <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel editing</button>}
        </div>
      </form>
    </section>
  );
}

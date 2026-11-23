// Shows the tasks of the active list, plus the loading and empty states.
export default function TaskList({
  title, tasks, totalCount, loading, busyIds,
  canDelete, creatorName, onToggle, onEdit, onDelete, onClearFilters,
}) {
  return (
    <section className="card" aria-labelledby="task-list-heading" aria-busy={loading}>
      <h2 id="task-list-heading">{title}</h2>
      {loading ? (
        <p className="empty-state">Loading tasks…</p>
      ) : totalCount === 0 ? (
        <p className="empty-state">No tasks yet. Add your first one using the form above.</p>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <p>No tasks match these filters.</p>
          <button type="button" className="btn-link" onClick={onClearFilters}>Clear filters</button>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              busy={busyIds.has(task.id)}
              canDelete={canDelete(task)}
              creator={creatorName?.(task)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskItem({ task, busy, canDelete, creator, onToggle, onEdit, onDelete }) {
  const checkboxId = `task-done-${task.id}`;

  return (
    <li className={`task-item ${task.completed ? 'completed' : ''}`}>
      <div className="task-main">
        <input type="checkbox" id={checkboxId} checked={task.completed} disabled={busy} onChange={() => onToggle(task)} />
        {/* The label makes the title the checkbox's accessible name and a larger click target. */}
        <label htmlFor={checkboxId} className="task-title">{task.title}</label>
      </div>
      <div className="task-details">
        <span className="task-date">Due {task.dueDate ? new Date(task.dueDate).toLocaleString() : '—'}</span>
        <span className={`badge priority-${task.priority.toLowerCase()}`}>{task.priority === 'Med' ? 'Medium' : task.priority} priority</span>
        <span className="badge tag">{task.tag}</span>
        {creator && <span className="task-date">Added by {creator}</span>}
      </div>
      <div className="task-actions">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEdit(task)} aria-label={`Edit "${task.title}"`}>Edit</button>
        {canDelete && (
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}>Delete</button>
        )}
      </div>
    </li>
  );
}

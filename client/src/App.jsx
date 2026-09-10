import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { getTodos, addTodo, updateTodo, toggleTodo, deleteTodo } from './api';

const EMPTY_FORM = { title: '', dueDate: '', priority: 'Med', tag: 'School' };

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [sortBy, setSortBy] = useState('createdAt');
  const [filterTag, setFilterTag] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Load tasks from the server on first render
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await getTodos();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.id]: e.target.value });
  }

  // Add or Save Edit — same form drives both
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await updateTodo(editingId, form);
        setTasks(tasks.map((t) => (t.id === editingId ? updated : t)));
        setEditingId(null);
      } else {
        const created = await addTodo(form);
        setTasks([created, ...tasks]);
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      dueDate: task.dueDate || '',
      priority: task.priority,
      tag: task.tag,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleToggle(task) {
    try {
      const updated = await toggleTodo(task.id, !task.completed);
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id);
      setTasks(tasks.filter((t) => t.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err.message);
    }
  }

  // Derived list: filter then sort, without touching the original `tasks` state
  const visibleTasks = useMemo(() => {
    const priorityRank = { High: 0, Med: 1, Low: 2 };

    return tasks
      .filter((t) => filterTag === 'All' || t.tag === filterTag)
      .filter((t) => filterPriority === 'All' || t.priority === filterPriority)
      .slice()
      .sort((a, b) => {
        if (sortBy === 'dueDate') return (a.dueDate || '').localeCompare(b.dueDate || '');
        if (sortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
        if (sortBy === 'tag') return a.tag.localeCompare(b.tag);
        // default: createdAt, newest first (server already orders this way)
        return 0;
      });
  }, [tasks, sortBy, filterTag, filterPriority]);

  return (
    <div className="app-container">
      <header>
        <h1>To-Do List</h1>
      </header>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* ADD / EDIT TASK FORM */}
      <section className="card">
        <h2>{editingId ? 'Edit Task' : 'Add New Task'}</h2>
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              placeholder="e.g., Submit Software Architecture Diagram"
              value={form.title}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueDate">Due Date & Time</label>
              <input
                type="datetime-local"
                id="dueDate"
                value={form.dueDate}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select id="priority" value={form.priority} onChange={handleFormChange}>
                <option value="Low">Low</option>
                <option value="Med">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tag">Tag / Category</label>
              <select id="tag" value={form.tag} onChange={handleFormChange}>
                <option value="School">School</option>
                <option value="Personal">Personal</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            {editingId ? 'Save Changes' : 'Add Task'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </section>

      {/* FILTER & SORT CONTROLS */}
      <section className="card controls-bar">
        <div className="control-group">
          <label htmlFor="sort">Sort By:</label>
          <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt">Date Added</option>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="tag">Tag</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="filterTag">Tag:</label>
          <select id="filterTag" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="All">All Tags</option>
            <option value="School">School</option>
            <option value="Personal">Personal</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="filterPriority">Priority:</label>
          <select id="filterPriority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Med">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </section>

      {/* TASK LIST DISPLAY */}
      <section className="card">
        <h2>Your Tasks</h2>
        {loading ? (
          <p>Loading...</p>
        ) : visibleTasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul className="task-list">
            {visibleTasks.map((task) => (
              <li
                key={task.id}
                className={`task-item ${task.completed ? 'completed' : ''}`}
              >
                <div className="task-main">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                  />
                  <span className="task-title">{task.title}</span>
                </div>

                <div className="task-details">
                  <span className="task-date">
                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : '—'}
                  </span>
                  <span className={`badge priority-${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <span className="badge tag">{task.tag}</span>
                </div>

                <div className="task-actions">
                  <button className="btn btn-secondary" onClick={() => startEdit(task)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(task.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
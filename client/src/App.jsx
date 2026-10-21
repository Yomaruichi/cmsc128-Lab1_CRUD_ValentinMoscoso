import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Login from './Login';
import Profile from './Profile';
import { useAuth } from './authContext';
import { getTodos, addTodo, updateTodo, toggleTodo, deleteTodo } from './api';

const EMPTY_FORM = { title: '', dueDate: '', priority: 'Med', tag: 'School' };

export default function App() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState('tasks');
  const [profile, setProfile] = useState({ fullName: '', email: '' });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [filterTag, setFilterTag] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError(null);
      setPage('tasks');
      setProfile({ fullName: '', email: '' });
      setLoading(false);
      return;
    }

    setProfile({ fullName: user.displayName || '', email: user.email || '' });
    loadTasks();
  }, [user]);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      setTasks(await getTodos());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.id]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await updateTodo(editingId, form);
        setTasks(tasks.map((task) => (task.id === editingId ? updated : task)));
        setEditingId(null);
      } else {
        const created = await addTodo(form);
        setTasks([created, ...tasks]);
      }
      setForm(EMPTY_FORM);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({ title: task.title, dueDate: task.dueDate || '', priority: task.priority, tag: task.tag });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleToggle(task) {
    try {
      const updated = await toggleTodo(task.id, !task.completed);
      setTasks(tasks.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id);
      setTasks(tasks.filter((task) => task.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleTasks = useMemo(() => {
    const priorityRank = { High: 0, Med: 1, Low: 2 };
    return tasks
      .filter((task) => filterTag === 'All' || task.tag === filterTag)
      .filter((task) => filterPriority === 'All' || task.priority === filterPriority)
      .slice()
      .sort((a, b) => {
        if (sortBy === 'dueDate') return (a.dueDate || '').localeCompare(b.dueDate || '');
        if (sortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
        if (sortBy === 'tag') return a.tag.localeCompare(b.tag);
        return 0;
      });
  }, [tasks, sortBy, filterTag, filterPriority]);

  if (!user) {
    return (
      <div className="app-container">
        <header><h1>To-Do List App</h1></header>
        <Login />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header-bar">
        <h1>{page === 'profile' ? 'Your Profile' : 'To-Do List'}</h1>
        <nav className="header-actions" aria-label="Main navigation">
          <button className={`btn ${page === 'tasks' ? 'btn-primary' : 'btn-secondary'}`} aria-current={page === 'tasks' ? 'page' : undefined} onClick={() => setPage('tasks')}>Tasks</button>
          <button className={`btn ${page === 'profile' ? 'btn-primary' : 'btn-secondary'}`} aria-current={page === 'profile' ? 'page' : undefined} onClick={() => setPage('profile')}>Profile</button>
          <button className="btn btn-secondary" onClick={logout}>Log Out</button>
        </nav>
      </header>

      {error && <p style={{ color: 'red' }} role="alert">{error}</p>}

      {page === 'profile' ? (
        <Profile profile={profile} tasks={tasks} onSave={setProfile} />
      ) : (
        <>
          <section className="card">
            <h2>{editingId ? 'Edit Task' : 'Add New Task'}</h2>
            <form onSubmit={handleSubmit} className="task-form">
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input type="text" id="title" placeholder="e.g., Submit Software Architecture Diagram" value={form.title} onChange={handleFormChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dueDate">Due Date &amp; Time</label>
                  <input type="datetime-local" id="dueDate" value={form.dueDate} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select id="priority" value={form.priority} onChange={handleFormChange}>
                    <option value="Low">Low</option><option value="Med">Medium</option><option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="tag">Tag / Category</label>
                  <select id="tag" value={form.tag} onChange={handleFormChange}>
                    <option value="School">School</option><option value="Personal">Personal</option><option value="Others">Others</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Task'}</button>
              {editingId && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>}
            </form>
          </section>

          <section className="card controls-bar">
            <div className="control-group">
              <label htmlFor="sort">Sort By:</label>
              <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="createdAt">Date Added</option><option value="dueDate">Due Date</option><option value="priority">Priority</option><option value="tag">Tag</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="filterTag">Tag:</label>
              <select id="filterTag" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                <option value="All">All Tags</option><option value="School">School</option><option value="Personal">Personal</option><option value="Others">Others</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="filterPriority">Priority:</label>
              <select id="filterPriority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="All">All Priorities</option><option value="Low">Low</option><option value="Med">Medium</option><option value="High">High</option>
              </select>
            </div>
          </section>

          <section className="card">
            <h2>Your Tasks</h2>
            {loading ? <p>Loading...</p> : visibleTasks.length === 0 ? (
              <p>{tasks.length === 0 ? 'No tasks yet.' : 'No tasks match your filters.'}</p>
            ) : (
              <ul className="task-list">
                {visibleTasks.map((task) => (
                  <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-main">
                      <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task)} />
                      <span className="task-title">{task.title}</span>
                    </div>
                    <div className="task-details">
                      <span className="task-date">Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : '—'}</span>
                      <span className={`badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
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
        </>
      )}
    </div>
  );
}

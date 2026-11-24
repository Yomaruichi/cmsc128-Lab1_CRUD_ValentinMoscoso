import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Login from './Login';
import Profile from './Profile';
import ListBar from './ListBar';
import TaskForm, { EMPTY_TASK } from './TaskForm';
import TaskFilters, { DEFAULT_FILTERS } from './TaskFilters';
import TaskList from './TaskList';
import useConfirm from './useConfirm';
import { useAuth } from './authContext';
import {
  getTodos, addTodo, updateTodo, toggleTodo, deleteTodo,
  getLists, createList, deleteList, addMember, removeMember,
} from './api';

const PERSONAL = 'personal';
const UNDO_MS = 8000; // how long a deleted task can be restored, and how long notices stay up
const PRIORITY_RANK = { High: 0, Med: 1, Low: 2 };

// The undo timer dies with the tab, so the pending delete is also written to
// localStorage and finished on the next load if the tab closed during the undo window.
const PENDING_KEY = 'pendingDelete';
function savePendingDelete(value) {
  try {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* storage blocked: the delete still runs while the tab stays open */ }
}
function readPendingDelete() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)); } catch { return null; }
}

function applyFilters(tasks, { sortBy, tag, priority }) {
  return tasks
    .filter((task) => tag === 'All' || task.tag === tag)
    .filter((task) => priority === 'All' || task.priority === priority)
    .slice()
    .sort((a, b) => {
      if (sortBy === 'dueDate') return (a.dueDate || '').localeCompare(b.dueDate || '');
      if (sortBy === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sortBy === 'tag') return a.tag.localeCompare(b.tag);
      return 0; // createdAt: the server already returns newest first
    });
}

export default function App() {
  const { user, logout } = useAuth();
  const [confirm, confirmDialog] = useConfirm();

  // Page and profile
  const [page, setPage] = useState('tasks');
  const [profile, setProfile] = useState({ fullName: '', email: '' });
  const [profileDirty, setProfileDirty] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Lists and tasks
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(PERSONAL);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_TASK);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Feedback: `error` stays until the next successful action; `notice` fades out.
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // A deleted task is hidden right away but only removed on the server after
  // UNDO_MS, so Undo can bring back the exact same task (same id, creator, date).
  const pendingDelete = useRef(null);
  const activeListRef = useRef(activeListId);
  useEffect(() => { activeListRef.current = activeListId; }, [activeListId]);

  const activeList = lists.find((list) => list.id === activeListId) || null;
  const listTitle = activeList ? activeList.name : 'Personal list';
  const displayName = profile.fullName || profile.email.split('@')[0];

  useEffect(() => {
    if (!user) {
      setLists([]);
      setActiveListId(PERSONAL);
      setTasks([]);
      setForm(EMPTY_TASK);
      setEditingId(null);
      setError(null);
      setNotice(null);
      setPage('tasks');
      setProfile({ fullName: '', email: '' });
      setLoading(false);
      return;
    }

    setLists([]);
    setActiveListId(PERSONAL);
    setPage('tasks'); // the integrated flow always lands on Tasks after sign-in
    setProfile({ fullName: user.displayName || '', email: user.email || '' });
    let ignore = false;
    getLists()
      .then((data) => { if (!ignore) setLists(data); })
      .catch((err) => { if (!ignore) setError(`Couldn't load your shared lists. ${err.message}`); });
    return () => { ignore = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const leftover = readPendingDelete();
        if (leftover?.uid === user.uid) {
          savePendingDelete(null);
          await deleteTodo(leftover.taskId).catch(() => {}); // already gone or not allowed: nothing to restore
        }
        const data = await getTodos(activeListId);
        if (!ignore) setTasks(data);
      } catch (err) {
        if (!ignore) {
          setTasks([]);
          setError(`Couldn't load tasks. ${err.message}`);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [user, activeListId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const showNotice = (text, onUndo) => setNotice({ id: Date.now(), text, onUndo });

  // ---- Navigation ----

  const confirmDiscardProfile = () => confirm({
    title: 'Discard your profile changes?',
    body: "You edited your profile but haven't saved it. If you leave now, those edits will be lost.",
    confirmLabel: 'Discard changes',
    cancelLabel: 'Keep editing',
    danger: true,
  });

  async function goTo(next) {
    if (next === page) return;
    if (page === 'profile' && profileDirty && !(await confirmDiscardProfile())) return;
    setProfileDirty(false);
    setPage(next);
  }

  async function handleLogout() {
    if (page === 'profile' && profileDirty && !(await confirmDiscardProfile())) return;
    setLoggingOut(true);
    try {
      await commitDelete(); // finish a pending delete while we still have a token
      await logout();
    } catch {
      setError("Couldn't log out. Check your connection and try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  // ---- Lists ----

  function handleSelectList(id) {
    commitDelete();
    cancelEdit();
    setActiveListId(id);
  }

  async function handleCreateList(name) {
    const created = await createList(name);
    setLists((current) => [...current, created]);
    handleSelectList(created.id);
  }

  async function handleDeleteList(id) {
    await deleteList(id);
    setLists((current) => current.filter((list) => list.id !== id));
    handleSelectList(PERSONAL);
  }

  async function handleAddMember(id, email) {
    const updated = await addMember(id, email);
    setLists((current) => current.map((list) => (list.id === id ? updated : list)));
  }

  async function handleRemoveMember(id, memberUid) {
    await removeMember(id, memberUid);
    if (memberUid === user.uid) {
      setLists((current) => current.filter((list) => list.id !== id));
      handleSelectList(PERSONAL);
    } else {
      setLists(await getLists());
    }
  }

  // ---- Tasks ----

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const listId = activeListId;
    // The user may switch lists while the request is in flight; only touch
    // the visible tasks if they still belong to the list the task was saved to.
    const stillOnList = () => activeListRef.current === listId;
    try {
      if (editingId) {
        const updated = await updateTodo(editingId, form);
        if (stillOnList()) setTasks((current) => current.map((task) => (task.id === editingId ? updated : task)));
        setEditingId(null);
        showNotice('Changes saved.');
      } else {
        const created = await addTodo({ ...form, listId });
        if (stillOnList()) setTasks((current) => [created, ...current]);
        showNotice(`Task added to ${listTitle}.`);
      }
      setForm(EMPTY_TASK);
      setError(null);
    } catch (err) {
      setError(`Couldn't save the task. ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({ title: task.title, dueDate: task.dueDate || '', priority: task.priority, tag: task.tag });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_TASK);
  }

  async function handleToggle(task) {
    setBusyIds((ids) => new Set(ids).add(task.id));
    try {
      const updated = await toggleTodo(task.id, !task.completed);
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
      setError(null);
    } catch (err) {
      setError(`Couldn't update "${task.title}". ${err.message}`);
    } finally {
      setBusyIds((ids) => { const next = new Set(ids); next.delete(task.id); return next; });
    }
  }

  async function handleDelete(task) {
    const ok = await confirm({
      title: `Delete "${task.title}"?`,
      body: 'You can undo this for a few seconds after deleting.',
      confirmLabel: 'Delete task',
      cancelLabel: 'Keep task',
      danger: true,
    });
    if (!ok) return;

    commitDelete(); // only the latest delete can be undone
    const index = tasks.findIndex((item) => item.id === task.id);
    setTasks((current) => current.filter((item) => item.id !== task.id));
    if (editingId === task.id) cancelEdit();
    pendingDelete.current = { task, index, listId: activeListId, timer: setTimeout(commitDelete, UNDO_MS) };
    savePendingDelete({ uid: user.uid, taskId: task.id });
    showNotice(`Deleted "${task.title}".`, undoDelete);
  }

  function restoreTask({ task, index }) {
    setTasks((current) => {
      const next = [...current];
      next.splice(index, 0, task);
      return next;
    });
  }

  function undoDelete() {
    const pending = pendingDelete.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingDelete.current = null;
    savePendingDelete(null);
    restoreTask(pending);
    showNotice(`Restored "${pending.task.title}".`);
  }

  // Sends the pending delete to the server now. Safe to call when nothing is pending.
  async function commitDelete() {
    const pending = pendingDelete.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingDelete.current = null;
    try {
      await deleteTodo(pending.task.id);
      savePendingDelete(null);
    } catch (err) {
      savePendingDelete(null);
      setError(`Couldn't delete "${pending.task.title}", so it's back in the list. ${err.message}`);
      if (activeListRef.current === pending.listId) restoreTask(pending);
    }
  }

  const canDelete = (task) => !activeList || task.ownerId === user.uid || activeList.isOwner;
  const creatorName = (task) => {
    const member = activeList?.members.find((member) => member.uid === task.ownerId);
    return member ? member.displayName || member.email : 'a former member';
  };

  const visibleTasks = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  if (!user) {
    return (
      <div className="app-container">
        <header><h1 className="app-title">To-Do List</h1></header>
        <Login />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header-bar">
        <div>
          <p className="greeting">Hello, {displayName}</p>
          <h1>{page === 'profile' ? 'Your profile' : 'Tasks'}</h1>
        </div>
        <nav className="header-actions" aria-label="Main navigation">
          {[['tasks', 'Tasks'], ['profile', 'Profile']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="nav-link"
              aria-current={page === id ? 'page' : undefined}
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="btn btn-secondary" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </nav>
      </header>

      {error && <p className="app-error" role="alert">{error}</p>}

      {page === 'profile' ? (
        <Profile profile={profile} tasks={tasks} onSave={setProfile} onDirtyChange={setProfileDirty} />
      ) : (
        <main>
          <ListBar
            lists={lists}
            activeListId={activeListId}
            currentUid={user.uid}
            onSelect={handleSelectList}
            onCreate={handleCreateList}
            onDelete={handleDeleteList}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
          <TaskForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={cancelEdit}
            isEditing={Boolean(editingId)}
            saving={saving}
            listTitle={listTitle}
          />
          <TaskFilters filters={filters} onChange={setFilters} />
          <TaskList
            title={listTitle}
            tasks={visibleTasks}
            totalCount={tasks.length}
            loading={loading}
            busyIds={busyIds}
            canDelete={canDelete}
            creatorName={activeList ? creatorName : null}
            onToggle={handleToggle}
            onEdit={startEdit}
            onDelete={handleDelete}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)}
          />
        </main>
      )}

      <div className="toast-region" role="status" aria-live="polite">
        {notice && (
          <div className="toast" key={notice.id}>
            <span>{notice.text}</span>
            {notice.onUndo && <button type="button" className="toast-action" onClick={notice.onUndo}>Undo</button>}
          </div>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}

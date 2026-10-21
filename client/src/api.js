import { auth } from './firebase';

const BASE_URL = 'http://localhost:5000/api/todos';

async function authHeaders(extra = {}) {
  const token = await auth.currentUser?.getIdToken();
  return { ...extra, Authorization: `Bearer ${token}` };
}

async function parseError(res, fallback) {
  try {
    const err = await res.json();
    return new Error(err.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

// GET all tasks
export async function getTodos() {
  const res = await fetch(BASE_URL, { headers: await authHeaders() });
  if (!res.ok) throw await parseError(res, 'Failed to fetch todos');
  return res.json();
}

// POST a new task
export async function addTodo(task) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(task),
  });
  if (!res.ok) throw await parseError(res, 'Failed to create task');
  return res.json();
}

// PUT — edit any subset of fields
export async function updateTodo(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw await parseError(res, 'Failed to update task');
  return res.json();
}

// PUT - toggling done
export async function toggleTodo(id, completed) {
  return updateTodo(id, { completed });
}

// DELETE
export async function deleteTodo(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw await parseError(res, 'Failed to delete task');
}
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body } = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = 'Request failed';
    try { message = (await res.json()).error || message; } catch { /* non-JSON error */ }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

// listId is 'personal' for existing per-user tasks or a collaborative list ID.
export const getTodos = (listId = 'personal') =>
  request(`/todos?listId=${encodeURIComponent(listId)}`);
export const addTodo = (task) => request('/todos', { method: 'POST', body: task });
export const updateTodo = (id, updates) => request(`/todos/${id}`, { method: 'PUT', body: updates });
export const toggleTodo = (id, completed) => updateTodo(id, { completed });
export const deleteTodo = (id) => request(`/todos/${id}`, { method: 'DELETE' });

export const getLists = () => request('/lists');
export const createList = (name) => request('/lists', { method: 'POST', body: { name } });
export const deleteList = (id) => request(`/lists/${id}`, { method: 'DELETE' });
export const addMember = (id, email) => request(`/lists/${id}/members`, { method: 'POST', body: { email } });
export const removeMember = (id, memberUid) => request(`/lists/${id}/members/${memberUid}`, { method: 'DELETE' });

const BASE_URL = 'http://localhost:5000/api/todos';

// GET all tasks
export async function getTodos() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
}

// POST a new task
// task: { title, dueDate, time, priority, tag }
export async function addTodo(task) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create task');
  }
  return res.json();
}

// PUT — edit any subset of fields, e.g. { title, dueDate, time, priority, tag }
export async function updateTodo(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update task');
  }
  return res.json();
}

// PUT - toggling done
export async function toggleTodo(id, completed) {
  return updateTodo(id, { completed });
}

// DELETE
export async function deleteTodo(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete task');
  }
}
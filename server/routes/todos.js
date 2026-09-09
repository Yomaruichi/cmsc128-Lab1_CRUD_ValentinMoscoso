const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');

const router = express.Router();

function todosCollection() {
  return db.collection('todos');
}

// GET /api/todos — list all tasks
router.get('/', async (req, res) => {
  try {
    const snapshot = await todosCollection()
      .orderBy('createdAt', 'desc')
      .get();

    const todos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(todos);
  } catch (err) {
    console.error('GET /todos failed:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// POST /api/todos — add a new task
// Body: { title, dueDate, priority, tag }
router.post('/', async (req, res) => {
  const { title, dueDate, priority, tag } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const docRef = await todosCollection().add({
      title: title.trim(),
      dueDate: dueDate || null,
      priority: priority || 'Med',
      tag: tag || 'Others',
      completed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const newDoc = await docRef.get();
    res.status(201).json({ id: newDoc.id, ...newDoc.data() });
  } catch (err) {
    console.error('POST /todos failed:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/todos/:id — edit a task (any subset of fields), or toggle completed
// Body: any of { title, dueDate, priority, tag, completed }
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, dueDate, priority, tag, completed } = req.body;

  const updates = {};
  if (typeof title === 'string' && title.trim()) updates.title = title.trim();
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (priority !== undefined) updates.priority = priority;
  if (tag !== undefined) updates.tag = tag;
  if (typeof completed === 'boolean') updates.completed = completed;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  try {
    const docRef = todosCollection().doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error('PUT /todos/:id failed:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/todos/:id — delete a task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = todosCollection().doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await docRef.delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /todos/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
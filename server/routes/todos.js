const express = require('express');
const { admin, db } = require('../config/firebaseadmin');
const { validId, getListForMember, getTaskForUser } = require('../lib/access');

const router = express.Router();
const PRIORITIES = ['Low', 'Med', 'High'];
const TAGS = ['School', 'Personal', 'Others'];
const MAX_TITLE = 200;
const personalTasks = (uid) => db.collection('users').doc(uid).collection('todos');
const sharedTasks = () => db.collection('tasks');
const parseListId = (raw) => (!raw || raw === 'personal' ? null : raw);

router.param('id', (req, res, next, id) =>
  validId(id) ? next() : res.status(404).json({ error: 'Task not found' })
);

function validate(body, { requireTitle = false } = {}) {
  const updates = {};
  if (requireTitle || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > MAX_TITLE) {
      return { error: `Title is required (max ${MAX_TITLE} characters)` };
    }
    updates.title = body.title.trim();
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate !== null && (typeof body.dueDate !== 'string' || body.dueDate.length > 40)) return { error: 'Invalid due date' };
    updates.dueDate = body.dueDate || null;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return { error: 'Invalid priority' };
    updates.priority = body.priority;
  }
  if (body.tag !== undefined) {
    if (!TAGS.includes(body.tag)) return { error: 'Invalid tag' };
    updates.tag = body.tag;
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') return { error: 'Invalid completed value' };
    updates.completed = body.completed;
  }
  return { updates };
}

// Personal reads keep using the existing users/{uid}/todos records. Shared list
// tasks live in the shared collection and are only returned to list members.
router.get('/', async (req, res) => {
  try {
    const listId = parseListId(req.query.listId);
    let todos;
    if (listId === null) {
      // The original app stored personal tasks under users/{uid}/todos. The
      // Activity 3 seeder and newer ownership schema use /tasks with listId:null.
      // Read both so existing records and seeded records appear together.
      const [legacySnapshot, ownedSnapshot] = await Promise.all([
        personalTasks(req.uid).orderBy('createdAt', 'desc').get(),
        sharedTasks().where('ownerId', '==', req.uid).where('listId', '==', null).get(),
      ]);
      todos = [
        ...legacySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        ...ownedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ];
    } else {
      const list = await getListForMember(listId, req.uid);
      if (!list) return res.status(404).json({ error: 'List not found' });
      const snapshot = await sharedTasks().where('listId', '==', list.id).get();
      todos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    todos.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    res.json(todos);
  } catch (err) {
    console.error('GET /todos failed:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.post('/', async (req, res) => {
  const { error, updates } = validate(req.body, { requireTitle: true });
  if (error) return res.status(400).json({ error });
  try {
    const listId = parseListId(req.body.listId);
    if (listId === null) {
      // Preserve the established personal-task schema and its existing data.
      const docRef = await personalTasks(req.uid).add({
        dueDate: null, priority: 'Med', tag: 'Others', ...updates,
        completed: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return res.status(201).json({ id: doc.id, ...doc.data() });
    }
    const list = await getListForMember(listId, req.uid);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const docRef = await sharedTasks().add({
      dueDate: null, priority: 'Med', tag: 'Others', ...updates,
      completed: false, ownerId: req.uid, listId: list.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('POST /todos failed:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req, res) => {
  const { error, updates } = validate(req.body);
  if (error) return res.status(400).json({ error });
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  try {
    const found = await getTaskForUser(req.params.id, req.uid);
    if (!found) {
      // Fallback preserves access to legacy personal records in the per-user collection.
      const ref = personalTasks(req.uid).doc(req.params.id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Task not found' });
      await ref.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      const updated = await ref.get();
      return res.json({ id: updated.id, ...updated.data() });
    }
    await found.ref.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updated = await found.ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('PUT /todos/:id failed:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const found = await getTaskForUser(req.params.id, req.uid);
    if (found) {
      if (found.list && found.task.ownerId !== req.uid && found.list.ownerId !== req.uid) {
        return res.status(403).json({ error: 'Only the task creator or the list owner can delete this task' });
      }
      await found.ref.delete();
      return res.status(204).send();
    }
    // Preserve deletes for older per-user tasks that predate shared lists.
    const ref = personalTasks(req.uid).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Task not found' });
    await ref.delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /todos/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;

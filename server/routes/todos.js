const express = require('express');

const { admin, db } = require('../config/firebaseadmin');

const { validId, getListForMember, getTaskForUser } = require('../lib/access');

const router = express.Router();

const PRIORITIES = ['Low', 'Med', 'High'];

const TAGS = ['School', 'Personal', 'Others'];

const MAX_TITLE = 200;

function personalTasksCollection(uid) {
  return db.collection('users').doc(uid).collection('todos');
}

const tasksCollection = () => db.collection('tasks');

function parseListId(listId) {
  if (!listId || listId === 'personal') {
    return null;
  }

  return listId;
}

router.param('id', (req, res, next, id) => {
  if (!validId(id)) {
    return res.status(404).json({ error: 'Task not found' });
  }

  next();
});

function validateTaskFields(requestData, { requireTitle = false } = {}) {
  const updates = {};

  if (requireTitle || requestData.title !== undefined) {
    if (
      typeof requestData.title !== 'string' ||
      !requestData.title.trim() ||
      requestData.title.trim().length > MAX_TITLE
    ) {
      return { error: `Title is required (max ${MAX_TITLE} characters)` };
    }

    updates.title = requestData.title.trim();
  }

  if (requestData.dueDate !== undefined) {
    if (requestData.dueDate !== null && (typeof requestData.dueDate !== 'string' || requestData.dueDate.length > 40)) {
      return { error: 'Invalid due date' };
    }

    updates.dueDate = requestData.dueDate || null;
  }

  if (requestData.priority !== undefined) {
    if (!PRIORITIES.includes(requestData.priority)) {
      return { error: 'Invalid priority' };
    }

    updates.priority = requestData.priority;
  }

  if (requestData.tag !== undefined) {
    if (!TAGS.includes(requestData.tag)) {
      return { error: 'Invalid tag' };
    }

    updates.tag = requestData.tag;
  }

  if (requestData.completed !== undefined) {
    if (typeof requestData.completed !== 'boolean') {
      return { error: 'Invalid completed value' };
    }

    updates.completed = requestData.completed;
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
      const [legacyTasksSnapshot, ownedTasksSnapshot] = await Promise.all([
        personalTasksCollection(req.uid)
          .orderBy('createdAt', 'desc')
          .get(),
        tasksCollection()
          .where('ownerId', '==', req.uid)
          .where('listId', '==', null)
          .get(),
      ]);

      todos = [
        ...legacyTasksSnapshot.docs.map((taskSnapshot) => ({ id: taskSnapshot.id, ...taskSnapshot.data() })),
        ...ownedTasksSnapshot.docs.map((taskSnapshot) => ({ id: taskSnapshot.id, ...taskSnapshot.data() })),
      ];
    } else {
      const list = await getListForMember(listId, req.uid);

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      const tasksSnapshot = await tasksCollection()
        .where('listId', '==', list.id)
        .get();

      todos = tasksSnapshot.docs.map((taskSnapshot) => ({ id: taskSnapshot.id, ...taskSnapshot.data() }));
    }

    todos.sort((firstTask, secondTask) => {
      const firstCreatedAt = firstTask.createdAt?.toMillis?.() || 0;

      const secondCreatedAt = secondTask.createdAt?.toMillis?.() || 0;

      return secondCreatedAt - firstCreatedAt;
    });

    res.json(todos);
  } catch (err) {
    console.error('GET /todos failed:', err);

    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.post('/', async (req, res) => {
  const { error, updates } = validateTaskFields(req.body, { requireTitle: true });

  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const listId = parseListId(req.body.listId);

    if (listId === null) {
      // Preserve the established personal-task schema and its existing data.
      const taskReference = await personalTasksCollection(req.uid).add({
        dueDate: null,
        priority: 'Med',
        tag: 'Others',
        ...updates,
        completed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const taskSnapshot = await taskReference.get();

      return res.status(201).json({ id: taskSnapshot.id, ...taskSnapshot.data() });
    }

    const list = await getListForMember(listId, req.uid);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const taskReference = await tasksCollection().add({
      dueDate: null,
      priority: 'Med',
      tag: 'Others',
      ...updates,
      completed: false,
      ownerId: req.uid,
      listId: list.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const taskSnapshot = await taskReference.get();

    res.status(201).json({ id: taskSnapshot.id, ...taskSnapshot.data() });
  } catch (err) {
    console.error('POST /todos failed:', err);

    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req, res) => {
  const { error, updates } = validateTaskFields(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const accessibleTask = await getTaskForUser(req.params.id, req.uid);

    if (!accessibleTask) {
      // Fallback preserves access to legacy personal records in the per-user collection.
      const taskReference = personalTasksCollection(req.uid).doc(req.params.id);

      const taskSnapshot = await taskReference.get();

      if (!taskSnapshot.exists) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await taskReference.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updatedTaskSnapshot = await taskReference.get();

      return res.json({ id: updatedTaskSnapshot.id, ...updatedTaskSnapshot.data() });
    }

    await accessibleTask.ref.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedTaskSnapshot = await accessibleTask.ref.get();

    res.json({ id: updatedTaskSnapshot.id, ...updatedTaskSnapshot.data() });
  } catch (err) {
    console.error('PUT /todos/:id failed:', err);

    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const accessibleTask = await getTaskForUser(req.params.id, req.uid);

    if (accessibleTask) {
      if (
        accessibleTask.list &&
        accessibleTask.task.ownerId !== req.uid &&
        accessibleTask.list.ownerId !== req.uid
      ) {
        return res.status(403).json({ error: 'Only the task creator or the list owner can delete this task' });
      }

      await accessibleTask.ref.delete();

      return res.status(204).send();
    }

    // Preserve deletes for older per-user tasks that predate shared lists.
    const taskReference = personalTasksCollection(req.uid).doc(req.params.id);

    const taskSnapshot = await taskReference.get();

    if (!taskSnapshot.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await taskReference.delete();

    res.status(204).send();
  } catch (err) {
    console.error('DELETE /todos/:id failed:', err);

    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;

const { db } = require('../config/firebaseadmin');

// Firestore auto-IDs are 20 alphanumeric characters. Rejecting anything else up
// front stops path tricks such as "a/b" and keeps malformed IDs away from the DB.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const validId = (id) => typeof id === 'string' && ID_PATTERN.test(id);

// Returns the list if `uid` is a member of it, otherwise null.
// "Does not exist" and "exists but you are not a member" both return null on
// purpose, so a caller can never learn that someone else's list/task exists.
async function getListForMember(listId, uid) {
  if (!validId(listId)) return null;
  const snap = await db.collection('lists').doc(listId).get();
  if (!snap.exists) return null;
  const list = { id: snap.id, ...snap.data() };
  return list.memberIds.includes(uid) ? list : null;
}

// Loads a task only if `uid` is allowed to touch it:
//   - personal task (listId === null): the user must be its owner
//   - collaborative task: the user must be a member of the task's list
// Returns { ref, task, list } or null (same 404 for "missing" and "not yours").
async function getTaskForUser(taskId, uid) {
  if (!validId(taskId)) return null;
  const ref = db.collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const task = { id: snap.id, ...snap.data() };

  if (task.listId === null) {
    return task.ownerId === uid ? { ref, task, list: null } : null;
  }
  const list = await getListForMember(task.listId, uid);
  return list ? { ref, task, list } : null;
}

module.exports = { validId, getListForMember, getTaskForUser };


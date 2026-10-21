const express = require('express');
const { admin, db, auth } = require('../config/firebaseadmin');
const { validId, getListForMember } = require('../lib/access');

const router = express.Router();

const MAX_MEMBERS = 20;
const MAX_NAME = 60;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const lists = () => db.collection('lists');

router.param('id', (req, res, next, id) =>
  validId(id) ? next() : res.status(404).json({ error: 'List not found' })
);

// A collaborative list stores only member UIDs. Names and emails are looked up
// from Firebase Auth when sending the response, so user data is never duplicated.
async function toResponse(list, uid) {
  const { users } = await auth.getUsers(list.memberIds.map((id) => ({ uid: id })));
  const members = users
    .map((u) => ({ uid: u.uid, email: u.email, displayName: u.displayName || null }))
    .sort((a, b) => (b.uid === list.ownerId) - (a.uid === list.ownerId)); // owner first
  return {
    id: list.id,
    name: list.name,
    ownerId: list.ownerId,
    isOwner: list.ownerId === uid,
    members,
  };
}

// Loads a list the caller belongs to, or sends 404 (same answer for "missing" and "not a member")
async function loadMemberList(req, res) {
  const list = await getListForMember(req.params.id, req.uid);
  if (!list) {
    res.status(404).json({ error: 'List not found' });
    return null;
  }
  return list;
}

// Members can see a list but only the owner can manage it
function ownerOnly(list, req, res) {
  if (list.ownerId !== req.uid) {
    res.status(403).json({ error: 'Only the list owner can do that' });
    return false;
  }
  return true;
}

// GET /api/lists — every collaborative list the caller is a member of (and no others)
router.get('/', async (req, res) => {
  try {
    const snapshot = await lists().where('memberIds', 'array-contains', req.uid).get();
    const result = await Promise.all(
      snapshot.docs.map((doc) => toResponse({ id: doc.id, ...doc.data() }, req.uid))
    );
    result.sort((a, b) => a.name.localeCompare(b.name));
    res.json(result);
  } catch (err) {
    console.error('GET /lists failed:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// POST /api/lists — body: { name }. The caller becomes the owner and first member.
router.post('/', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ error: `List name is required (max ${MAX_NAME} characters)` });
  }

  try {
    const docRef = await lists().add({
      name,
      ownerId: req.uid,
      memberIds: [req.uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    res.status(201).json(await toResponse({ id: doc.id, ...doc.data() }, req.uid));
  } catch (err) {
    console.error('POST /lists failed:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// POST /api/lists/:id/members — body: { email }. Owner only.
router.post('/:id/members', async (req, res) => {
  try {
    const list = await loadMemberList(req, res);
    if (!list || !ownerOnly(list, req, res)) return;

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'No account is registered with that email' });
      }
      throw err;
    }

    if (list.memberIds.includes(user.uid)) {
      return res.status(409).json({ error: 'That user is already a member' });
    }
    if (list.memberIds.length >= MAX_MEMBERS) {
      return res.status(400).json({ error: `A list can have at most ${MAX_MEMBERS} members` });
    }

    const ref = lists().doc(list.id);
    await ref.update({ memberIds: admin.firestore.FieldValue.arrayUnion(user.uid) });
    const updated = await ref.get();
    res.json(await toResponse({ id: updated.id, ...updated.data() }, req.uid));
  } catch (err) {
    console.error('POST /lists/:id/members failed:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /api/lists/:id/members/:memberUid
// The owner can remove anyone; any member can remove themselves (leave). The owner cannot be removed.
router.delete('/:id/members/:memberUid', async (req, res) => {
  try {
    const list = await loadMemberList(req, res);
    if (!list) return;

    const target = req.params.memberUid;
    if (target !== req.uid && list.ownerId !== req.uid) {
      return res.status(403).json({ error: 'Only the list owner can remove other members' });
    }
    if (target === list.ownerId) {
      return res.status(400).json({ error: 'The owner cannot be removed. Delete the list instead.' });
    }
    if (!list.memberIds.includes(target)) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await lists().doc(list.id).update({
      memberIds: admin.firestore.FieldValue.arrayRemove(target),
    });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /lists/:id/members failed:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// DELETE /api/lists/:id — owner only. Deletes the list and every task in it.
router.delete('/:id', async (req, res) => {
  try {
    const list = await loadMemberList(req, res);
    if (!list || !ownerOnly(list, req, res)) return;

    const taskDocs = (await db.collection('tasks').where('listId', '==', list.id).get()).docs;
    for (let i = 0; i < taskDocs.length; i += 450) { // Firestore batches max out at 500 writes
      const batch = db.batch();
      taskDocs.slice(i, i + 450).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await lists().doc(list.id).delete();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /lists/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

module.exports = router;


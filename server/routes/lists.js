const express = require('express');

const { admin, db, auth } = require('../config/firebaseadmin');

const { validId, getListForMember } = require('../lib/access');

const router = express.Router();

const MAX_MEMBERS = 20;

const MAX_NAME = 60;

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const listsCollection = () => db.collection('lists');

router.param('id', (req, res, next, id) => {
  if (!validId(id)) {
    return res.status(404).json({ error: 'List not found' });
  }

  next();
});

// Resolve each distinct member once per request. Firebase Auth accepts up to
// 100 identifiers per lookup. The map stays local so account details remain fresh.
async function loadMembersByUid(lists) {
  const uniqueMemberIds = new Set();

  for (const list of lists) {
    for (const memberUid of list.memberIds) {
      uniqueMemberIds.add(memberUid);
    }
  }

  const memberIds = [...uniqueMemberIds];

  const membersByUid = new Map();

  for (let offset = 0; offset < memberIds.length; offset += 100) {
    const memberBatch = memberIds.slice(offset, offset + 100);

    const identifiers = memberBatch.map((uid) => ({ uid }));

    const { users } = await auth.getUsers(identifiers);

    for (const user of users) {
      membersByUid.set(user.uid, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
      });
    }
  }

  return membersByUid;
}

// Only attach members of this specific list, even when the lookup map contains
// users from other lists in the response. Deleted accounts are omitted.
function buildListResponse(list, uid, membersByUid) {
  const members = list.memberIds
    .map((memberUid) => membersByUid.get(memberUid))
    .filter(Boolean)
    .sort((firstMember, secondMember) => {
      const firstIsOwner = firstMember.uid === list.ownerId;

      const secondIsOwner = secondMember.uid === list.ownerId;

      return secondIsOwner - firstIsOwner;
    });

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
function requireListOwner(list, req, res) {
  if (list.ownerId !== req.uid) {
    res.status(403).json({ error: 'Only the list owner can do that' });

    return false;
  }

  return true;
}

// GET /api/lists — every collaborative list the caller is a member of (and no others)
router.get('/', async (req, res) => {
  try {
    const listsSnapshot = await listsCollection()
      .where('memberIds', 'array-contains', req.uid)
      .get();

    const lists = listsSnapshot.docs.map((listSnapshot) => ({
      id: listSnapshot.id,
      ...listSnapshot.data(),
    }));

    const membersByUid = await loadMembersByUid(lists);

    const listResponses = lists.map((list) => {
      return buildListResponse(list, req.uid, membersByUid);
    });

    listResponses.sort((firstList, secondList) => {
      return firstList.name.localeCompare(secondList.name);
    });

    res.json(listResponses);
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
    const listReference = await listsCollection().add({
      name,
      ownerId: req.uid,
      memberIds: [req.uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const listSnapshot = await listReference.get();

    const responseList = { id: listSnapshot.id, ...listSnapshot.data() };

    const membersByUid = await loadMembersByUid([responseList]);

    res.status(201).json(buildListResponse(responseList, req.uid, membersByUid));
  } catch (err) {
    console.error('POST /lists failed:', err);

    res.status(500).json({ error: 'Failed to create list' });
  }
});

// POST /api/lists/:id/members — body: { email }. Owner only.
router.post('/:id/members', async (req, res) => {
  try {
    const list = await loadMemberList(req, res);

    if (!list || !requireListOwner(list, req, res)) {
      return;
    }

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

    const listReference = listsCollection().doc(list.id);

    await listReference.update({ memberIds: admin.firestore.FieldValue.arrayUnion(user.uid) });

    const updatedListSnapshot = await listReference.get();

    const responseList = { id: updatedListSnapshot.id, ...updatedListSnapshot.data() };

    const membersByUid = await loadMembersByUid([responseList]);

    res.json(buildListResponse(responseList, req.uid, membersByUid));
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

    if (!list) {
      return;
    }

    const memberUid = req.params.memberUid;

    if (memberUid !== req.uid && list.ownerId !== req.uid) {
      return res.status(403).json({ error: 'Only the list owner can remove other members' });
    }

    if (memberUid === list.ownerId) {
      return res.status(400).json({ error: 'The owner cannot be removed. Delete the list instead.' });
    }

    if (!list.memberIds.includes(memberUid)) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await listsCollection().doc(list.id).update({
      memberIds: admin.firestore.FieldValue.arrayRemove(memberUid),
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

    if (!list || !requireListOwner(list, req, res)) {
      return;
    }

    const tasksSnapshot = await db.collection('tasks')
      .where('listId', '==', list.id)
      .get();

    const taskDocuments = tasksSnapshot.docs;

    for (let i = 0; i < taskDocuments.length; i += 450) { // Firestore batches max out at 500 writes
      const batch = db.batch();

      const taskBatch = taskDocuments.slice(i, i + 450);

      for (const taskDocument of taskBatch) {
        batch.delete(taskDocument.ref);
      }

      await batch.commit();
    }

    await listsCollection().doc(list.id).delete();

    res.status(204).send();
  } catch (err) {
    console.error('DELETE /lists/:id failed:', err);

    res.status(500).json({ error: 'Failed to delete list' });
  }
});

module.exports = router;


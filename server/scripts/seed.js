// Seeds demo data for two ALREADY-REGISTERED accounts (register them through the app first).
//
//   node scripts/seed.js <emailA> <emailB>
//
// Result (matches the Nikko/Victor scenario in the lab handout):
//   - A and B each get 4 personal tasks
//   - A owns "<A>'s Group List" and B is a member of it
//   - B owns "<B>'s Group List" and A is NOT a member of it
// Re-running replaces the previously seeded data (everything it creates has seeded: true).

require('dotenv').config();
const { admin, db, auth } = require('../config/firebaseadmin');

const pad = (n) => String(n).padStart(2, '0');
function inDays(days) {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

const PERSONAL = [
  { title: 'Finish CMSC 128 Lab 3', dueDate: inDays(2), priority: 'High', tag: 'School' },
  { title: 'Review authentication notes', dueDate: inDays(1), priority: 'Med', tag: 'School' },
  { title: 'Buy groceries', dueDate: inDays(3), priority: 'Low', tag: 'Personal' },
  { title: 'Reply to emails', dueDate: inDays(4), priority: 'Low', tag: 'Others' },
];
const GROUP = [
  { title: 'Draft the project outline', dueDate: inDays(2), priority: 'High', tag: 'School' },
  { title: 'Split the report sections', dueDate: inDays(5), priority: 'Med', tag: 'School' },
];

const nameOf = (u) => u.displayName || u.email.split('@')[0];

async function commit(operations) {
  for (let i = 0; i < operations.length; i += 450) {
    const batch = db.batch();
    operations.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
}

async function clearPreviousSeed() {
  const oldLists = await db.collection('lists').where('seeded', '==', true).get();
  const ops = [];
  for (const list of oldLists.docs) {
    const tasks = await db.collection('tasks').where('listId', '==', list.id).get();
    tasks.docs.forEach((t) => ops.push((b) => b.delete(t.ref)));
    ops.push((b) => b.delete(list.ref));
  }
  const oldTasks = await db.collection('tasks').where('seeded', '==', true).get();
  oldTasks.docs.forEach((t) => ops.push((b) => b.delete(t.ref)));
  await commit(ops);
}

async function main() {
  const [emailA, emailB] = process.argv.slice(2);
  if (!emailA || !emailB) {
    console.error('Usage: node scripts/seed.js <emailA> <emailB>');
    process.exit(1);
  }

  const [a, b] = await Promise.all([auth.getUserByEmail(emailA), auth.getUserByEmail(emailB)]);
  await clearPreviousSeed();

  const ts = admin.firestore.FieldValue.serverTimestamp();
  const listA = db.collection('lists').doc();
  const listB = db.collection('lists').doc();
  const ops = [];

  ops.push((batch) => batch.set(listA, {
    name: `${nameOf(a)}'s Group List`, ownerId: a.uid, memberIds: [a.uid, b.uid], createdAt: ts, seeded: true,
  }));
  ops.push((batch) => batch.set(listB, {
    name: `${nameOf(b)}'s Group List`, ownerId: b.uid, memberIds: [b.uid], createdAt: ts, seeded: true,
  }));

  const addTask = (task, ownerId, listId) =>
    ops.push((batch) => batch.set(db.collection('tasks').doc(), {
      ...task, completed: false, ownerId, listId, createdAt: ts, seeded: true,
    }));

  PERSONAL.forEach((t) => addTask(t, a.uid, null));
  PERSONAL.forEach((t) => addTask(t, b.uid, null));
  GROUP.forEach((t) => addTask(t, a.uid, listA.id));
  GROUP.forEach((t) => addTask(t, b.uid, listB.id));

  await commit(ops);
  console.log(`Seeded ${nameOf(a)} (${a.email}) and ${nameOf(b)} (${b.email}).`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});


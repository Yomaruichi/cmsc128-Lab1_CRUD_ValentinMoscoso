const admin = require('firebase-admin');

const credentialPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  '../serviceAccountKey.json';

const serviceAccount = require(credentialPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const auth = admin.auth();

module.exports = { admin, db, auth };

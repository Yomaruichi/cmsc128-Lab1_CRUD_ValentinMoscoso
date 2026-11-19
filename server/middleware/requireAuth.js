const { auth } = require('../config/firebaseadmin');

async function requireAuth(req, res, next) {
  const authorizationHeader = req.headers.authorization || '';

  const token = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);

    req.uid = decodedToken.uid;

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;

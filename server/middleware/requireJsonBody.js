// Task and list mutations expect a JSON object with named fields.
function requireJsonBody(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Send the request as application/json.' });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'The request body must be a JSON object.' });
  }

  next();
}

module.exports = requireJsonBody;

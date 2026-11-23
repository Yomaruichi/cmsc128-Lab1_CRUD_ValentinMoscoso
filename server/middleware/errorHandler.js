// Express identifies error middleware by its four arguments.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON. Check the request body.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request body is too large.' });
  }

  if (err.type === 'encoding.unsupported' || err.type === 'charset.unsupported') {
    return res.status(415).json({ error: 'The request encoding is not supported.' });
  }

  if (err.type === 'request.aborted' || err.type === 'request.size.invalid') {
    return res.status(400).json({ error: 'The request body could not be read. Please send it again.' });
  }

  console.error('Unexpected API error:', err);

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;

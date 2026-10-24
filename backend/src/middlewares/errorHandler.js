const { HttpError } = require('../utils/httpError');

function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.status === 429 || err.status === 503) {
    console.error('Upstream busy:', err.message);
    return res.status(503).json({ error: 'The AI service is busy right now. Please try again in a minute.' });
  }

  console.error(err); // full details stay in the server log only
  res.status(500).json({ error: 'Something went wrong' });
}

module.exports = { errorHandler };
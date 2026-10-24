const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const documentRoutes = require('./routes/document.routes');
const queryRoutes = require('./routes/query.routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10, // an upload makes many embedding calls, so it gets a tighter cap
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, try again in a few minutes.' },
});

app.use(generalLimiter);
app.post('/documents', uploadLimiter); // runs first, then falls through to the router

app.use('/documents', documentRoutes);
app.use('/query', queryRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler); // must be last

module.exports = app;
const { ingestDocument } = require('../services/document.service');

async function createDocument(req, res, next) {
  try {
    const { title, text } = req.body;
    const result = await ingestDocument(title, text);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { createDocument };
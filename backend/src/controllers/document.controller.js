const { ingestDocument, listDocuments, deleteDocument } = require('../services/document.service');

async function createDocument(req, res, next) {
  try {
    const { title, text } = req.body;
    const result = await ingestDocument(title, text);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function getDocuments(req, res, next) {
  try {
    res.status(200).json(await listDocuments());
  } catch (err) {
    next(err);
  }
}

async function removeDocument(req, res, next) {
  try {
    const result = await deleteDocument(req.params.id);
    if (!result) return res.status(404).json({ error: 'Document not found' });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { createDocument, getDocuments, removeDocument };
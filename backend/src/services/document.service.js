// src/services/document.service.js
const { chunkText } = require('./chunking.service');
const { embedText } = require('./embedding.service');
const Chunk = require('../models/chunk.model');
const crypto = require('crypto');

async function ingestDocument(title, text) {
  const documentId = crypto.randomUUID();

  const chunks = await chunkText(text);

  const chunkDocs = [];
  for (const chunkContent of chunks) {
    const vector = await embedText(chunkContent);
    chunkDocs.push({
      documentId,
      documentTitle: title,
      text: chunkContent,
      vector,
    });
  }

  const saved = await Chunk.insertMany(chunkDocs);

  return {
    documentId,
    chunksCreated: saved.length,
  };
}

module.exports = { ingestDocument };
const mongoose = require('mongoose');
const { chunkText } = require('./chunking.service');
const { embedText } = require('./embedding.service');
const Chunk = require('../models/chunk.model');
const Document = require('../models/document.model');
const { HttpError } = require('../utils/httpError');

async function ingestDocument(title, text, { chunkSize = 1000, chunkOverlap = 100 } = {}) {
  const pieces = await chunkText(text, chunkSize, chunkOverlap);
  if (pieces.length === 0) throw new HttpError(400, 'Document has no content to index');

  // embed everything BEFORE touching the database: if an API call fails, nothing was written
  const vectors = [];
  for (const piece of pieces) vectors.push(await embedText(piece));

  const doc = await Document.create({
    title,
    text,
    chunkSettings: { strategy: 'recursive', chunkSize, chunkOverlap },
    chunkCount: pieces.length,
  });

  try {
    await Chunk.insertMany(
      pieces.map((piece, i) => ({
        documentId: doc._id,
        documentTitle: title,
        chunkIndex: i,
        text: piece,
        vector: vectors[i],
      }))
    );
  } catch (err) {
    // clean up in the same order as delete: chunks first, then the document
    await Chunk.deleteMany({ documentId: doc._id });
    await Document.deleteOne({ _id: doc._id });
    throw err;
  }

  return { documentId: doc._id, chunksCreated: pieces.length };
}

async function listDocuments() {
  return Document.find({}, { text: 0 }).sort({ createdAt: -1 }).lean(); // skip the full text
}

async function deleteDocument(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Document.findById(id);
  if (!doc) return null;

  const { deletedCount } = await Chunk.deleteMany({ documentId: doc._id }); // chunks first
  await Document.deleteOne({ _id: doc._id });

  return { deleted: doc.title, chunksDeleted: deletedCount };
}

module.exports = { ingestDocument, listDocuments, deleteDocument };
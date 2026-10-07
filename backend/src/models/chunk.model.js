// src/models/chunk.model.js
const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  documentTitle: { type: String },
  text: { type: String, required: true },
  vector: { type: [Number], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Chunk', chunkSchema);
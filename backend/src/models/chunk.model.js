const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  documentTitle: { type: String },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  vector: { type: [Number], required: true },
}, { timestamps: true });

chunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.model('Chunk', chunkSchema);
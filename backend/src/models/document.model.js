const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  chunkSettings: {
    strategy: { type: String, default: 'recursive' },
    chunkSize: Number,
    chunkOverlap: Number,
  },
  chunkCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
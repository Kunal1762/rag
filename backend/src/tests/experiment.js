require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Chunk = require('../models/chunk.model');
const Document = require('../models/document.model');
const { ingestDocument } = require('../services/document.service');
const { embedText } = require('../services/embedding.service');
const { findTopKSimilar } = require('../services/similarity.service');
const evalSet = require('./eval-sel.json');

const TITLE = 'Attention is all you need'; // must match the title used for the old upload
const MIN_SCORE = 0.5; // same cutoff your API uses
const CONFIGS = [
 
  { chunkSize: 1000, chunkOverlap: 100 },
  
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const text = fs.readFileSync(path.join(__dirname, '../../data/attention.txt'), 'utf8');

  // question vectors don't depend on chunk size, so embed them once
  console.log('Embedding questions...');
  const questionVectors = [];
  for (const item of evalSet) questionVectors.push(await embedText(item.question));

  const summary = [];

  for (const { chunkSize, chunkOverlap } of CONFIGS) {
    console.log(`\n=== chunkSize=${chunkSize}, overlap=${chunkOverlap} ===`);

    const old = await Document.find({ title: TITLE }).select('_id').lean();
    const ids = old.map(d => d._id);
    await Chunk.deleteMany({ documentId: { $in: ids } });
    await Document.deleteMany({ _id: { $in: ids } });
    const { chunksCreated } = await ingestDocument(TITLE, text, { chunkSize, chunkOverlap });
    const allChunks = await Chunk.find({}).lean();

    let hits = 0, rrSum = 0, answerable = 0, rejected = 0, unanswerable = 0;

    evalSet.forEach((item, i) => {
      // minScore 0 here so we judge pure ranking; the threshold is checked separately below
      const ranked = findTopKSimilar(questionVectors[i], allChunks, 3, 0);
      const topScore = ranked[0] ? ranked[0].score.toFixed(2) : 'n/a';

      if (item.expectedKeywords.length === 0) {
        unanswerable++;
        const kept = ranked.filter(c => c.score >= MIN_SCORE).length;
        if (kept === 0) rejected++;
        console.log(`${kept === 0 ? 'PASS' : 'FAIL'}  [should reject] ${item.question} (top score ${topScore})`);
        return;
      }

      answerable++;
      const rank = ranked.findIndex(c =>
        item.expectedKeywords.some(k => c.text.toLowerCase().includes(k.toLowerCase()))
      );
      if (rank !== -1) { hits++; rrSum += 1 / (rank + 1); }
      console.log(`${rank !== -1 ? 'PASS' : 'FAIL'}  ${item.question} (top score ${topScore}, hit rank ${rank === -1 ? '-' : rank + 1})`);
    });

    summary.push({
      chunkSize,
      overlap: chunkOverlap,
      chunks: chunksCreated,
      'Hit@3': `${hits}/${answerable}`,
      MRR: (rrSum / answerable).toFixed(2),
      rejections: `${rejected}/${unanswerable}`,
    });
  }

  console.log('\n=== SUMMARY ===');
  console.table(summary);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
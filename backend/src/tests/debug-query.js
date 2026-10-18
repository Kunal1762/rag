require('dotenv').config();
const mongoose = require('mongoose');
const Chunk = require('../models/chunk.model');
const { embedText } = require('../services/embedding.service');
const { findTopKSimilar } = require('../services/similarity.service');

async function main() {
  const question = process.argv[2] || 'What regularization techniques did the authors use?';
  const keyword = (process.argv[3] || 'label smoothing').toLowerCase();

  await mongoose.connect(process.env.MONGO_URI);
  const chunks = await Chunk.find({}).lean();
  const ranked = findTopKSimilar(await embedText(question), chunks, chunks.length, 0); // full ranking, no cutoff

  console.log(`Question: ${question}\n`);
  console.log('--- TOP 3 RETRIEVED ---');
  ranked.slice(0, 3).forEach((c, i) => {
    console.log(`#${i + 1} (score ${c.score.toFixed(2)})\n${c.text.slice(0, 400)}\n`);
  });

  console.log(`--- WHERE DID "${keyword}" RANK? ---`);
  const holderIdx = ranked.findIndex(c => c.text.toLowerCase().includes(keyword));
  if (holderIdx === -1) {
    console.log('No chunk in the database contains that keyword.');
  } else {
    const h = ranked[holderIdx];
    console.log(`First chunk containing it: rank #${holderIdx + 1} of ${ranked.length} (score ${h.score.toFixed(2)})\n${h.text.slice(0, 600)}`);
  }

  await mongoose.disconnect();
}

main();
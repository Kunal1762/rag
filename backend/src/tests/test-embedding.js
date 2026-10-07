// test-embedding.js (backend/ root, throwaway file)
require('dotenv').config();
const { embedText } = require('../services/embedding.service');

async function run() {
  const vector = await embedText('TCP congestion control regulates network traffic.');
  console.log('Vector length:', vector.length);
  console.log('First 5 values:', vector.slice(0, 5));
}

run();
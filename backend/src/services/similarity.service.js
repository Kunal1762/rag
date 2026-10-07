// src/services/similarity.service.js

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  return dot / (magA * magB);
}

function findTopKSimilar(queryVector, candidates, k = 3) {
  // candidates: array of { text, vector, ...otherFields }
  const scored = candidates.map(candidate => ({
    ...candidate,
    score: cosineSimilarity(queryVector, candidate.vector),
  }));

  scored.sort((a, b) => b.score - a.score); // highest similarity first

  return scored.slice(0, k);
}

module.exports = { cosineSimilarity, findTopKSimilar };
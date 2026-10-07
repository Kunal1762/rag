// test-similarity.js
const { cosineSimilarity } = require('../services/similarity.service');

const vecA = [1, 0, 0];
const vecB = [1, 0, 0]; // identical direction
const vecC = [0, 1, 0]; // perpendicular, completely different
const vecD = [-1, 0, 0]; // opposite direction

console.log('A vs B (identical):', cosineSimilarity(vecA, vecB)); // expect 1
console.log('A vs C (perpendicular):', cosineSimilarity(vecA, vecC)); // expect 0
console.log('A vs D (opposite):', cosineSimilarity(vecA, vecD)); // expect -1
// src/services/query.service.js
const { embedText } = require('./embedding.service');
const { findTopKSimilar } = require('./similarity.service');
const { askLLM } = require('./llm.service');
const Chunk = require('../models/chunk.model');

async function answerQuestion(question, documentId) {
  const questionVector = await embedText(question);

  const filter = documentId ? { documentId } : {};
  const allChunks = await Chunk.find(filter).lean();

  const topChunks = findTopKSimilar(questionVector, allChunks, 3);

  if (topChunks.length === 0) {
  return {
    answer: "I couldn't find anything relevant to that question in your documents.",
    sources: [],
  };
}

  const context = topChunks.map(c => c.text).join('\n\n');

  const answer = await askLLM(question, context);

  return {
    answer,
    sources: topChunks.map(c => ({
      documentTitle: c.documentTitle,
      chunkIndex: c.chunkIndex,
      text: c.text,
      score: c.score,
    })),
  };
}

module.exports = { answerQuestion };
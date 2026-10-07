// src/services/query.service.js
const { embedText } = require('./embedding.service');
const { findTopKSimilar } = require('./similarity.service');
const { askLLM } = require('./llm.service');
const Chunk = require('../models/chunk.model');

async function answerQuestion(question) {
  const questionVector = await embedText(question);

  const allChunks = await Chunk.find({}).lean();

  const topChunks = findTopKSimilar(questionVector, allChunks, 3);

  const context = topChunks.map(c => c.text).join('\n\n');

  const answer = await askLLM(question, context);

  return {
    answer,
    sources: topChunks.map(c => ({
      documentTitle: c.documentTitle,
      text: c.text,
      score: c.score,
    })),
  };
}

module.exports = { answerQuestion };
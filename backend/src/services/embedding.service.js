// src/services/embedding.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withRetry } = require('../utils/retry');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

async function embedText(text) {
  return withRetry(async () => {
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    });
    return result.embedding.values;
  });
}
module.exports = { embedText };
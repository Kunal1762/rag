// src/services/embedding.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

async function embedText(text, attempt = 1) {
  try {
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    });
    return result.embedding.values;
  } catch (err) {
    if (attempt < 5 && (err.status === 429 || err.status === 503)) {
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // wait longer each retry
      return embedText(text, attempt + 1);
    }
    throw err;
  }
}

module.exports = { embedText };
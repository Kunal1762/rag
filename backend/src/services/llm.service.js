// src/services/llm.service.js
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

async function askLLM(question, context) {
  const prompt = `
Context:
${context}

Question: ${question}

Answer the question using only the context above. If the context doesn't contain enough information to answer, say so clearly instead of guessing.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });

  return response.text;
}

module.exports = { askLLM };
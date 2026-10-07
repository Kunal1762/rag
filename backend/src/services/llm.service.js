// src/services/llm.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function askLLM(question, context) {
  const prompt = `
Context:
${context}

Question: ${question}

Answer the question using only the context above. If the context doesn't contain enough information to answer, say so clearly instead of guessing.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = { askLLM };
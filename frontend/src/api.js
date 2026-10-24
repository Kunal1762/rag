const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.map(d => `${d.field}: ${d.message}`).join(', ');
    throw new Error(detail || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const listDocuments = () => request('/documents');

export const createDocument = (title, text) =>
  request('/documents', { method: 'POST', body: JSON.stringify({ title, text }) });

export const deleteDocument = id => request(`/documents/${id}`, { method: 'DELETE' });

export const askQuestion = (question, documentId) =>
  request('/query', {
    method: 'POST',
    body: JSON.stringify({ question, ...(documentId && { documentId }) }),
  });
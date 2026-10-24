import { useState } from 'react';
import { askQuestion } from '../api';

export default function AskPanel({ documents }) {
  const [question, setQuestion] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // if the selected document was deleted, fall back to "all documents"
  const selectedId = documents.some(d => d._id === documentId) ? documentId : '';

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await askQuestion(question, selectedId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Search in</label>
      <select value={selectedId} onChange={e => setDocumentId(e.target.value)}>
        <option value="">All documents</option>
        {documents.map(d => (
          <option key={d._id} value={d._id}>{d.title}</option>
        ))}
      </select>

      <label>Question</label>
      <textarea value={question} onChange={e => setQuestion(e.target.value)} />

      <button type="submit" disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>

      {error && <p className="error">{error}</p>}

      {result && (
        <>
          <h2>Answer</h2>
          <p className="answer">{result.answer}</p>

          {result.sources.length > 0 && (
            <>
              <h2>Sources</h2>
              {result.sources.map((s, i) => (
                <details className="source" key={i}>
                  <summary>
                    {s.documentTitle}
                    {s.chunkIndex !== undefined && ` · chunk ${s.chunkIndex}`}
                    {` · score ${s.score.toFixed(2)}`}
                  </summary>
                  <p>{s.text}</p>
                </details>
              ))}
            </>
          )}
        </>
      )}
    </form>
  );
}
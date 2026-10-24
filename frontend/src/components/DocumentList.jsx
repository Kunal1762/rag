import { useState } from 'react';
import { deleteDocument } from '../api';

export default function DocumentList({ documents, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.title}"?`)) return;
    setBusyId(doc._id);
    try {
      await deleteDocument(doc._id);
      setError('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (documents.length === 0) return <p className="muted">No documents yet.</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      <ul className="doc-list">
        {documents.map(doc => (
          <li key={doc._id}>
            <div>
              <strong>{doc.title}</strong>
              <span className="muted"> · {doc.chunkCount} chunks</span>
            </div>
            <button className="danger" disabled={busyId === doc._id} onClick={() => handleDelete(doc)}>
              {busyId === doc._id ? 'Deleting…' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
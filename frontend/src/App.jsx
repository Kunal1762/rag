import { useCallback, useEffect, useState } from 'react';
import { listDocuments } from './api';
import UploadPanel from './components/UploadPanel';
import DocumentList from './components/DocumentList';
import AskPanel from './components/AskPanel';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="app">
      <h1>DocQA</h1>
      <p className="subtitle">Upload text, ask questions, get answers grounded in your documents.</p>
      {loadError && <p className="error">{loadError}</p>}

      <div className="grid">
        <section className="card">
          <h2>1. Add a document</h2>
          <UploadPanel onUploaded={refresh} />
          <h2>Your documents</h2>
          <DocumentList documents={documents} onChanged={refresh} />
        </section>

        <section className="card">
          <h2>2. Ask a question</h2>
          <AskPanel documents={documents} />
        </section>
      </div>
    </main>
  );
}
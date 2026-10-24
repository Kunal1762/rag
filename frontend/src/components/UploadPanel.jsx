import { useState } from 'react';
import { createDocument } from '../api';

const MAX_CHARS = 100000;

export default function UploadPanel({ onUploaded }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [fileKey, setFileKey] = useState(0); // changing the key resets the file input
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setText(await file.text()); // read in the browser, no file upload needed
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await createDocument(title, text);
      setMessage({ type: 'ok', text: `Added. ${result.chunksCreated} chunks created.` });
      setTitle('');
      setText('');
      setFileKey(k => k + 1);
      onUploaded();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Title</label>
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} />

      <label>Paste text, or choose a .txt file</label>
      <input key={fileKey} type="file" accept=".txt,text/plain" onChange={handleFile} />
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <div className="muted">{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters</div>

      <button type="submit" disabled={loading}>{loading ? 'Indexing…' : 'Add document'}</button>
      {loading && <p className="muted">Embedding every chunk, this can take a minute for long text.</p>}
      {message && <p className={message.type}>{message.text}</p>}
    </form>
  );
}
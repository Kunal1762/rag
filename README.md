# DocQA — RAG-based Document Q&A API

A backend API that lets you upload your own text documents and ask questions about them, with answers grounded in your actual data instead of general LLM knowledge. Built as a learning project to understand Retrieval-Augmented Generation (RAG) from first principles — most core logic is hand-built rather than using high-level RAG frameworks, so every design decision is understood and defensible.

## What it does

1. **Ingest**: Submit text → it gets split into chunks → each chunk is embedded into a vector → stored in MongoDB
2. **Query**: Ask a question → it's embedded the same way → compared against all stored chunks using cosine similarity → top matching chunks are retrieved → sent to an LLM along with the question → grounded answer returned, with source chunks cited

## Tech stack

- **Runtime**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Validation**: Zod
- **Chunking**: LangChain's `RecursiveCharacterTextSplitter`
- **Embeddings**: Google Gemini (`gemini-embedding-001`, 768 dimensions)
- **LLM generation**: Google Gemini (`gemini-flash-lite-latest`, via `@google/genai`)
- **Similarity search**: Hand-built cosine similarity (no vector DB yet — see Known Limitations)

## Architecture

Layered architecture — controllers handle HTTP, services hold business logic, routes wire endpoints:

backend/
├── src/
│ ├── config/
│ │ └── db.js # MongoDB connection
│ ├── models/
│ │ └── chunk.model.js # Mongoose schema for stored chunks
│ ├── controllers/
│ │ ├── document.controller.js
│ │ └── query.controller.js
│ ├── services/
│ │ ├── document.service.js # orchestrates: chunk → embed → save
│ │ ├── query.service.js # orchestrates: embed question → search → ask LLM
│ │ ├── chunking.service.js # text splitting (LangChain)
│ │ ├── embedding.service.js # Gemini embeddings API calls
│ │ ├── similarity.service.js # cosine similarity math, top-k search
│ │ └── llm.service.js # Gemini generation API calls
│ ├── routes/
│ │ ├── document.routes.js
│ │ └── query.routes.js
│ ├── validators/ # zod schemas
│ └── app.js
├── .env
└── server.js


**Why this split:** `chunking.service.js` and `similarity.service.js` are pure logic — no DB or API calls — making them independently testable and easy to swap out later (e.g. replacing manual similarity search with a real vector index) without touching the rest of the app.

## API Endpoints

### `POST /documents`
Ingests a document — chunks it, embeds each chunk, stores it.

**Request body:**
```json
{
  "title": "Networking Notes - Lecture 12",
  "text": "Your document text here..."
}
```

**Response:**
```json
{
  "documentId": "uuid-here",
  "chunksCreated": 2
}
```

### `POST /query`
Asks a question against all ingested documents.

**Request body:**
```json
{
  "question": "What is slow start in TCP congestion control?"
}
```

**Response:**
```json
{
  "answer": "...",
  "sources": [
    { "documentTitle": "...", "text": "...", "score": 0.81 }
  ]
}
```

## Setup

1. Clone the repo, `cd backend`
2. `npm install`
3. Create `.env` in `backend/`:

MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
PORT=3000

4. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
5. `npm run dev` (or `node server.js`)

## Design decisions (and why)

- **Fixed-size chunking was tried first, then replaced with LangChain's recursive splitter** — fixed-size cuts mid-sentence; recursive splitting respects paragraph/sentence boundaries first, falling back to cruder splits only when necessary. Chose LangChain's implementation over a hand-rolled one after understanding the algorithm, for production robustness (better edge-case handling, token-aware length functions).
- **Chunk overlap (100 chars default)** — prevents an idea that spans a chunk boundary from being lost entirely in either chunk.
- **768-dimension embeddings, not the model's default 3072** — smaller vectors are faster to compare and cheaper to store, with negligible quality loss for a project at this scale, and 768 is the more standard/comparable dimensionality.
- **Manual cosine similarity over all stored chunks (no vector index yet)** — intentionally naive O(n) approach for the core version, to understand the underlying math before reaching for a vector database. Known bottleneck at scale — see Known Limitations.
- **Prompt explicitly instructs the LLM to say "not enough information" rather than guess** — without this, the LLM may hallucinate an answer using its own general knowledge even when retrieved chunks are irrelevant, which defeats the purpose of RAG. Empirically tested: confirmed the model correctly declines to answer when given irrelevant context.
- **`sources` returned alongside every answer, including similarity scores** — gives transparency into what was actually retrieved and enables future filtering (e.g. a relevance threshold) with real data to base the cutoff on.

## Known limitations / planned improvements

- **No similarity threshold yet** — always returns top-k chunks regardless of how irrelevant they are, even when nothing in the database is actually relevant to the question. Testing showed a meaningful score gap (~0.5+) between relevant and irrelevant matches, which could inform a cutoff.
- **No real vector index** — similarity search is a full O(n) scan over every stored chunk. Fine at small scale, won't hold up with thousands of chunks. Planned: migrate to MongoDB Atlas Vector Search or Postgres + pgvector.
- **No embedding caching** — re-uploading the same text re-embeds it from scratch, wasting API calls.
- **Sequential, not parallelized, embedding during ingestion** — chunks are embedded one at a time in a loop rather than concurrently, to stay safely under free-tier rate limits. Could be parallelized with a concurrency cap.
- **No tests yet.**
- **No authentication** — anyone can hit the API.

## What this project demonstrates

Built to go beyond "called an embeddings API and wired it to a vector DB" — every core piece (chunking strategy, cosine similarity math, prompt design against hallucination) was implemented and tested with real evidence (documented test results comparing relevant vs. irrelevant query scores) rather than assumed to work because a library handled it.
# DocQA (working title)

A Retrieval-Augmented Generation (RAG) backend with a small React frontend. Upload your own text documents, ask questions in plain language, and get answers grounded in those documents, with the exact source passages and similarity scores shown alongside every answer.

Built as a learning project to understand RAG from first principles. The core pieces (chunking strategy, cosine similarity search, prompt design, retrieval evaluation) are implemented and measured by hand instead of hidden behind a framework, so every design decision can be explained and defended.

```
git clone https://github.com/Kunal1762/rag.git
```

---

## Table of contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [How it works](#how-it-works)
5. [Data model](#data-model)
6. [API reference](#api-reference)
7. [Design decisions and trade-offs](#design-decisions-and-trade-offs)
8. [Evaluation](#evaluation)
9. [Configuration](#configuration)
10. [Setup and running](#setup-and-running)
11. [Frontend](#frontend)
12. [Known limitations](#known-limitations)
13. [Roadmap](#roadmap)

---

## What it does

1. **Ingest.** You submit a document (pasted text or a `.txt` file). The backend splits it into chunks, converts each chunk into an embedding vector, and stores everything in MongoDB.
2. **Query.** You ask a question. The backend embeds the question, finds the most similar chunks using cosine similarity, and sends only those chunks plus the question to an LLM, instructing it to answer from that context alone.
3. **Answer with sources.** The response contains the answer and the retrieved chunks with their similarity scores, so you can see what the answer was based on.

If nothing in your documents is similar enough to the question, the LLM is never called and the API says it found nothing relevant.

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime / framework | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Rate limiting | express-rate-limit |
| Chunking | LangChain `RecursiveCharacterTextSplitter` (`@langchain/textsplitters`) |
| Embeddings | Google Gemini `gemini-embedding-001`, 768 dimensions (`@google/generative-ai`) |
| Answer generation | Google Gemini `gemini-flash-lite-latest` (`@google/genai`) |
| Similarity search | Hand-written cosine similarity, in memory (no vector database yet) |
| Frontend | React + Vite, plain CSS |

---

## Architecture

### System overview

```
                         ┌───────────────────────────┐
                         │   React frontend (Vite)   │
                         │ upload · list · ask       │
                         └─────────────┬─────────────┘
                                       │ JSON over HTTP
                         ┌─────────────▼─────────────┐
                         │      Express backend      │
                         │ rate limit · validation   │
                         │ routes → controllers      │
                         │        → services         │
                         └───┬───────────────────┬───┘
                             │                   │
                  ┌──────────▼─────────┐   ┌─────▼──────────────┐
                  │      MongoDB       │   │     Gemini API     │
                  │ documents + chunks │   │ embeddings + LLM   │
                  └────────────────────┘   └────────────────────┘
```

### Layered backend

Each request passes through the same layers, and each layer has one job:

| Layer | Responsibility | Knows about |
|---|---|---|
| **Routes** | Map URL + method to a controller; attach validation middleware | Express |
| **Middlewares** | Rate limiting, request validation (Zod), central error handler | Express, Zod |
| **Controllers** | Read the request, call a service, shape the HTTP response | HTTP only, no business logic |
| **Services** | Business logic and orchestration (ingest, query), plus provider calls | Models, other services |
| **Models** | Mongoose schemas for the two collections | MongoDB |

The services are split deliberately:

- `chunking.service.js` and `similarity.service.js` are **pure logic**: text in, chunks out; vectors in, scores out. No database or network calls, so they can be tested alone.
- `embedding.service.js` and `llm.service.js` wrap the Gemini calls. **Swapping providers touches only these files.**
- `document.service.js` and `query.service.js` are the **orchestrators** that combine the pieces above.

### Project structure

```
rag-project/
├── README.md
├── .gitignore
├── backend/
│   ├── server.js                      # loads env, connects to MongoDB, starts the server
│   ├── data/                          # local test texts (not committed)
│   └── src/
│       ├── app.js                     # middleware stack, routes, error handler
│       ├── config/
│       │   └── db.js                  # MongoDB connection
│       ├── models/
│       │   ├── document.model.js
│       │   └── chunk.model.js
│       ├── routes/
│       │   ├── document.routes.js
│       │   └── query.routes.js
│       ├── controllers/
│       │   ├── document.controller.js
│       │   └── query.controller.js
│       ├── services/
│       │   ├── document.service.js    # ingest, list, delete
│       │   ├── query.service.js       # retrieve + generate
│       │   ├── chunking.service.js    # text -> chunks
│       │   ├── embedding.service.js   # text -> vector (Gemini)
│       │   ├── similarity.service.js  # cosine similarity, top-k
│       │   └── llm.service.js         # context + question -> answer (Gemini)
│       ├── middlewares/
│       │   ├── validate.js            # Zod validation wrapper
│       │   └── errorHandler.js        # maps errors to HTTP responses
│       ├── validators/
│       │   ├── document.validator.js
│       │   └── query.validator.js
│       ├── utils/
│       │   ├── httpError.js           # error carrying an HTTP status
│       │   └── retry.js               # retry with growing delay for transient failures
│       └── tests/                     # manual test and evaluation scripts
│           ├── eval-set.json          # questions + expected keywords
│           ├── experiment.js          # chunk-size comparison harness
│           ├── debug-query.js         # shows what a question retrieves and where the answer ranks
│           ├── test-embedding.js
│           └── test-similarity.js
└── frontend/
    ├── .env                           # VITE_API_URL
    └── src/
        ├── api.js                     # all backend calls and error normalisation
        ├── App.jsx
        ├── App.css
        └── components/
            ├── UploadPanel.jsx
            ├── DocumentList.jsx
            └── AskPanel.jsx
```

---

## How it works

### RAG in one minute

- **Embedding.** A model turns text into a list of numbers (here 768 of them) that captures its meaning. Texts with similar meaning get vectors pointing in similar directions.
- **Cosine similarity.** A score between -1 and 1 for how closely two vectors point the same way: `(A · B) / (|A| × |B|)`. Higher means more similar in meaning.
- **Chunking.** Documents are split into passages before embedding. One vector for a whole document would blur many topics together, so retrieval would be vague.
- **Retrieval-augmented generation.** Instead of asking the LLM to answer from memory, the system first retrieves the relevant passages and gives only those to the LLM as context. Answers come from your data and can be traced back to it.

### Ingest flow (`POST /documents`)

```
request {title, text}
   │
   ▼  rate limit (10 uploads / 10 min / IP) → validate (Zod)
   │
   ▼  1. chunk the text            recursive splitter, 1000 chars, 100 overlap
   ▼  2. embed EVERY chunk         one Gemini call per chunk, with retry
   ▼  3. create Document record    full text + chunk settings + chunk count
   ▼  4. insertMany Chunk records  documentId, chunkIndex, text, vector
   │        └─ if this fails: delete chunks, then the document, then rethrow
   ▼
response 201 {documentId, chunksCreated}
```

Embedding happens **before** anything is written. If the Gemini API fails halfway through a long document, nothing has been saved, so there are no half-indexed documents.

### Query flow (`POST /query`)

```
request {question, documentId?}
   │
   ▼  rate limit (30 requests / min / IP) → validate (Zod)
   │
   ▼  1. embed the question                       same model as the chunks
   ▼  2. load chunks                              all chunks, or only one document's if documentId is given
   ▼  3. cosine similarity vs every chunk         O(n) scan, in memory
   ▼  4. keep score >= 0.5, sort, take top 3
   │        └─ if none remain: return "couldn't find anything relevant", sources [], NO LLM call
   ▼  5. build context from the top chunks
   ▼  6. ask the LLM: answer using only this context; say so if it isn't enough; report conflicts
   ▼
response 200 {answer, sources[{documentTitle, chunkIndex, text, score}]}
```

The prompt sent to the LLM is:

```
Context:
<top chunks, separated by blank lines>

Question: <question>

Answer the question using only the context above. If the context doesn't contain
enough information to answer, say so clearly instead of guessing. If different parts
of the context give conflicting values, report each value and point out the conflict.
```

There are two independent defenses against answers that aren't grounded in your data: the **similarity threshold** (in code, rejects before the LLM) and the **prompt instruction** (in the LLM, refuses when context is insufficient). The [evaluation](#evaluation) shows why both are needed.

---

## Data model

Two collections. A **Document** is one upload. A **Chunk** is one searchable passage of a document.

```
Document 1 ────────< N Chunk
   _id  <──────────── documentId
```

### `documents`

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | Identity of the document |
| `title` | String | Display name |
| `text` | String | The **full original text** |
| `chunkSettings.strategy` | String | How it was chunked (`recursive`) |
| `chunkSettings.chunkSize` | Number | Chunk size used (default 1000) |
| `chunkSettings.chunkOverlap` | Number | Overlap used (default 100) |
| `chunkCount` | Number | Number of chunks created |
| `createdAt`, `updatedAt` | Date | Timestamps |

### `chunks`

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | Identity of the chunk |
| `documentId` | ObjectId → Document | Which document this chunk belongs to |
| `documentTitle` | String | Copy of the title, so query responses need no extra lookup |
| `chunkIndex` | Number | Position within the document (0, 1, 2, ...) |
| `text` | String | The passage text |
| `vector` | [Number] | 768-dimension embedding of `text` |
| `createdAt`, `updatedAt` | Date | Timestamps |

**Index:** unique compound index on `{ documentId: 1, chunkIndex: 1 }`. It guarantees one chunk per position per document and makes "all chunks of document X" and "chunk i of document X" lookups fast.

### Example records

```json
// documents
{
  "_id": "6718a1f0c2d4e5a7b8c9d001",
  "title": "Networking Notes - Lecture 12",
  "text": "TCP congestion control is a mechanism used to ...",
  "chunkSettings": { "strategy": "recursive", "chunkSize": 1000, "chunkOverlap": 100 },
  "chunkCount": 2,
  "createdAt": "2026-10-24T11:40:00.000Z"
}

// chunks
{
  "_id": "6718a1f0c2d4e5a7b8c9d002",
  "documentId": "6718a1f0c2d4e5a7b8c9d001",
  "documentTitle": "Networking Notes - Lecture 12",
  "chunkIndex": 0,
  "text": "TCP congestion control is a mechanism used to ...",
  "vector": [0.0128, 0.0120, 0.0061, -0.0728, "... 768 numbers"]
}
```

---

## API reference

**Conventions**

- All request and response bodies are JSON. Maximum request body: 1 MB.
- IDs are 24-character hexadecimal strings.
- Successful responses return the data directly. Errors return `{ "error": "message" }`; validation errors add a `details` array.
- Rate limits are per IP: 30 requests per minute overall, and 10 uploads per 10 minutes on `POST /documents`. Standard `RateLimit-*` headers are sent.

### `POST /documents`: add a document

Request:

```json
{
  "title": "Networking Notes - Lecture 12",
  "text": "TCP congestion control is a mechanism used to ..."
}
```

| Field | Rules |
|---|---|
| `title` | string, trimmed, 1 to 200 characters |
| `text` | string, trimmed, 1 to 100,000 characters |

Response `201`:

```json
{ "documentId": "6718a1f0c2d4e5a7b8c9d001", "chunksCreated": 2 }
```

This request is slow for long texts, because it makes one embedding API call per chunk.

### `GET /documents`: list documents

Response `200`, newest first, without the full `text`:

```json
[
  {
    "_id": "6718a1f0c2d4e5a7b8c9d001",
    "title": "Networking Notes - Lecture 12",
    "chunkSettings": { "strategy": "recursive", "chunkSize": 1000, "chunkOverlap": 100 },
    "chunkCount": 2,
    "createdAt": "2026-10-24T11:40:00.000Z"
  }
]
```

### `DELETE /documents/:id`: delete a document

Deletes the document and all of its chunks.

Response `200`:

```json
{ "deleted": "Networking Notes - Lecture 12", "chunksDeleted": 2 }
```

Response `404` if the id is invalid or doesn't exist.

### `POST /query`: ask a question

Request:

```json
{
  "question": "What is slow start in TCP congestion control?",
  "documentId": "6718a1f0c2d4e5a7b8c9d001"
}
```

| Field | Rules |
|---|---|
| `question` | string, trimmed, 3 to 1000 characters |
| `documentId` | optional; 24-character hex id. If present, only that document is searched |

Response `200`:

```json
{
  "answer": "Slow start begins with a small congestion window and doubles it every round trip time until a threshold is reached...",
  "sources": [
    {
      "documentTitle": "Networking Notes - Lecture 12",
      "chunkIndex": 0,
      "text": "TCP congestion control is a mechanism used to ...",
      "score": 0.81
    }
  ]
}
```

`score` is the cosine similarity between the question and that chunk. Sources are sorted best first, with at most 3 and a minimum score of 0.5.

When nothing is similar enough:

```json
{ "answer": "I couldn't find anything relevant to that question in your documents.", "sources": [] }
```

### Errors

| Status | When | Example body |
|---|---|---|
| `400` | Validation failed | `{ "error": "Invalid request", "details": [{ "field": "title", "message": "title is required" }] }` |
| `400` | Body isn't valid JSON | `{ "error": "Request body is not valid JSON" }` |
| `404` | Unknown route or document | `{ "error": "Document not found" }` |
| `413` | Body over 1 MB | `{ "error": "Request body is too large" }` |
| `429` | Rate limit hit | `{ "error": "Too many requests, please slow down." }` |
| `500` | Unexpected error | `{ "error": "Something went wrong" }` (details only in the server log) |
| `503` | Gemini unreachable or rate-limited after retries | `{ "error": "The AI service is unreachable or busy right now. Please try again in a minute." }` |

Errors never include raw provider messages. The full details are written to the server log only.

---

## Design decisions and trade-offs

### Why a separate `Document` collection and a `documentId`?

Originally everything lived in one `chunks` collection and a "document" was just the set of chunks sharing a string ID. That caused real problems:

- **No document record to list or count.** Showing "your documents" meant grouping every chunk in the database.
- **Deleting a document** had no single thing to delete, and it left room for orphans.
- **Searching one document** needs a stable ID to filter by.
- **Provenance.** Where a chunk came from, and how it was built, had nowhere to live.

The `documentId` is a real ObjectId reference to a Document. It is the join key between the two collections: it powers the document list, per-document search (`/query` with `documentId`), cascade delete, and the unique `(documentId, chunkIndex)` index.

### Why store the whole document, not just its chunks?

Because chunking is the part of this system most likely to change. If only chunks are stored, any new strategy (different chunk size, semantic chunking, contextual chunks) forces every user to re-upload every document. With the original text stored, a strategy change becomes a **re-index job** over existing documents.

The cost is storage: chunk texts already duplicate the document, plus about 10% overlap, so the text is stored roughly twice. This is small next to the vectors. Each chunk's 768 numbers take about 6 KB, while its text is about 1 KB. Documents are excluded from `GET /documents` responses via projection, so the list stays fast. If storage ever matters, the full text can move to file storage or GridFS.

### Why `chunkIndex`?

It gives chunks an order within their document. That makes "the chunk before/after this one" a simple lookup, which is what **neighbor expansion** needs (return the matched chunk plus its neighbors for more context). It is stored now so the feature can be added later without re-ingesting anything. It also makes retrieval results easier to debug.

### Why `chunkSettings` on the document?

Recording how a document was chunked tells you which documents are stale after a strategy change, and lets you compare strategies side by side.

### Why is `documentTitle` copied onto every chunk?

A deliberate denormalization. Query responses show the title with every source, and copying it avoids an extra lookup per query. There is no rename feature, so the copy can't go stale. If renaming is added, it must update that document's chunks too.

### Why embed everything before writing to the database?

Ingestion makes one external API call per chunk, and any of them can fail. Embedding first and writing second means a failure leaves nothing behind. If the final write fails, the cleanup deletes chunks first, then the document.

### Why delete chunks before the document?

If the document were deleted first and the process then failed, the orphaned chunks would still be searchable and could be cited for a document the user believes is gone. Chunks-first means a failure leaves, at worst, an empty Document, which is harmless and easy to retry.

### Why recursive chunking at 1000 characters with 100 overlap?

The recursive splitter tries natural boundaries first (paragraphs, then lines, then sentences, then words), so cuts avoid landing mid-sentence where possible. Overlap keeps an idea that straddles a boundary from being lost. 1000/100 was chosen from the [chunk-size experiment](#evaluation): 300 characters clearly lost context, while 600, 1000 and 1500 performed equally on Hit@3. Overlap only has an effect where the splitter works with pieces smaller than the overlap size. With very short sentences relative to the overlap, chunks may share no text.

### Why 768-dimension embeddings?

The model defaults to 3072 dimensions. 768 is 4x smaller to store and faster to compare, with little quality loss at this scale. Every stored vector must have the same dimension, since cosine similarity between different lengths is meaningless.

### Why hand-written cosine similarity and no vector database?

For v1 it keeps the mechanism visible: the whole search is about 20 lines and was verified against vectors with known answers (identical = 1, perpendicular = 0, opposite = -1). The cost is that every query loads all candidate chunks and compares them one by one, which is O(n). It is fine for hundreds to low thousands of chunks and will not scale far. Replacing it with a real vector index (MongoDB Atlas Vector Search or Postgres with pgvector) only means rewriting `similarity.service.js` and one query, because that logic is isolated.

### Why both a similarity threshold and a prompt instruction?

They defend against different failures. The threshold stops obviously irrelevant queries before spending an LLM call. The prompt instruction handles cases where retrieval returns something related but not sufficient. Evaluation showed the threshold alone is not reliable on a corpus where every chunk is on a similar topic (see below).

### Why central validation, error handling, rate limits and retries?

- **Zod validation** rejects bad input at the edge with field-level messages, before any API calls are spent.
- **One error handler** keeps error formats consistent and prevents provider error text (which can contain URLs and internals) from leaking to clients.
- **Rate limits** protect the free-tier API quota. Uploads get a tighter limit because one upload triggers many embedding calls.
- **Retry with growing delay** (up to 4 retries, waiting 2s, 4s, 6s, 8s) for rate-limit (429), overloaded (503) and network (`fetch failed`) errors, which are usually temporary.

---

## Evaluation

Retrieval quality is measured with a small repeatable harness instead of eyeballing answers.

**Setup.** Test corpus: the paper *Attention Is All You Need* (the paper text is not included in the repo), with the networking notes sitting in the database as distractor content. `src/tests/eval-set.json` holds 13 questions: 11 answerable ones, each with a keyword that must appear in a retrieved chunk, and 2 out-of-scope questions that should be rejected (one trivial, "capital of France", and one hard: a BERT question, a topic related to the paper but absent from it).

**Metrics.**
- **Hit@3**: for how many answerable questions did a chunk containing the expected keyword appear in the top 3?
- **MRR**: how high did that chunk rank (1.0 means always first)?
- **Rejections**: how many out-of-scope questions were correctly turned away by the 0.5 threshold?

The harness tests retrieval only, with no LLM call, so it is cheap to re-run.

**Chunk size comparison** (overlap = 10% of size):

| Chunk size | Chunks | Hit@3 | MRR | Rejections |
|---|---|---|---|---|
| 300 | 160 | 8/11 | 0.64 | 0/2 |
| 600 | 78 | 10/11 | 0.71 | 1/2 |
| 1000 | 49 | 10/11 | 0.71 | 1/2 |
| 1500 | 37 | 10/11 | 0.77 | 1/2 |

**Findings.**

1. **300 characters is clearly worse.** It lost three questions the larger sizes answered, consistent with small chunks losing the surrounding context that makes them matchable.
2. **600, 1000 and 1500 tie on Hit@3.** The MRR difference is one or two rank changes on 11 questions, which is too little to call.
3. **One question failed at every chunk size** ("What regularization techniques did the authors use?"). Inspection showed the chunk containing the answer ("label smoothing") ranked 9th of 51. The section heading had been separated from its content by a character-count cut, and the answer chunk was dominated by neighboring content about translation results. Changing chunk size can't fix this. It points to structure-aware or context-aware chunking and to hybrid search.
4. **Similarity scores are not confidence.** In the 300-character run, one failed question had the highest top score of the whole run (0.85) while retrieving the wrong chunks.
5. **The fixed 0.5 threshold is unreliable.** The BERT question scored 0.64 to 0.67 at every chunk size, well above the cutoff, so it was never rejected; the LLM's prompt instruction caught it instead. When every chunk is about the same topic, scores for relevant and irrelevant questions sit close together. A cutoff near 0.67 would separate everything measured so far, but with a margin of only a couple of hundredths, tuned on a handful of questions, so it would be fragile.

**Caveats.** The eval set is small (one question is about 9 percentage points) and uses one paper. Keyword matching is a proxy, since a chunk containing the keyword is likely but not guaranteed to be the useful one. Larger chunks have a built-in advantage in Hit@3 because they contain more words, and top-3 of 1500-character chunks gives the LLM much more text than top-3 of 300-character chunks; a fairer comparison would hold the total context size constant.

**Reproducing.** Put a text file at `backend/data/attention.txt`, then from `backend/`:

```bash
node src/tests/experiment.js                  # runs the configured chunk sizes and prints a summary table
node src/tests/debug-query.js "<question>" "<keyword>"   # shows the top chunks and where the keyword's chunk ranked
```

`experiment.js` replaces the stored copy of the test document on every run. Set `TITLE` in the script to the title you use for it.

---

## Configuration

### Environment variables

`backend/.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
GEMINI_API_KEY=your_key_here
PORT=3000
```

`frontend/.env`:

```
VITE_API_URL=http://localhost:3000
```

Get a free Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey). `.env` files are git-ignored.

### Tunable values

| Setting | Value | Where |
|---|---|---|
| Chunk size / overlap | 1000 / 100 characters | `document.service.js`, `chunking.service.js` |
| Chunks sent to the LLM (top-k) | 3 | `query.service.js` |
| Minimum similarity score | 0.5 | `similarity.service.js` |
| Embedding model / dimensions | `gemini-embedding-001` / 768 | `embedding.service.js` |
| Generation model | `gemini-flash-lite-latest` | `llm.service.js` |
| Retry policy | 4 retries, 2s × attempt | `utils/retry.js` |
| Rate limits | 30 req/min; 10 uploads/10 min (per IP) | `app.js` |
| Max body / text / question | 1 MB / 100,000 / 1,000 characters | `app.js`, validators |

---

## Setup and running

**Prerequisites:** Node.js 20+, a MongoDB database (a free Atlas cluster works), and a Gemini API key.

```bash
# backend
cd backend
npm install
# create backend/.env as shown above
npm run dev          # API on http://localhost:3000

# frontend (second terminal)
cd frontend
npm install
# create frontend/.env as shown above
npm run dev          # UI on http://localhost:5173
```

Quick check with curl:

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","text":"Slow start begins with a small congestion window and doubles it every round trip time."}'

curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What is slow start?"}'
```

---

## Frontend

A single page with no router or state library:

- **Upload panel.** Title plus pasted text or a `.txt` file. The file is read in the browser and sent as text, so the backend needs no file-upload handling. Shows how many chunks were created and the server's validation messages.
- **Document list.** All documents with chunk counts and a delete button.
- **Ask panel.** A question box and a "Search in" selector (all documents or one). Shows the answer and the source chunks with their scores in expandable sections.

All backend calls go through `src/api.js`, which turns failures (including "server unreachable" and validation details) into readable messages.

---

## Known limitations

- **No authentication or per-user data.** All documents are shared. A public deployment would let any visitor see, query and delete every document.
- **Open CORS and per-IP rate limits.** If deployed behind a proxy, configure Express's `trust proxy` setting so the per-IP limits see real client IPs.
- **Text only.** No PDF or Word parsing. PDF-extracted text can contain glued words and garbled tables, which hurts retrieval.
- **Fixed similarity threshold** that does not reliably reject out-of-scope questions on topically homogeneous documents (see Evaluation).
- **Characters, not structure, decide chunk boundaries.** Headings can be separated from their content.
- **O(n) similarity search.** Every query loads and scans all candidate chunks.
- **Pure vector search.** Weak at exact tokens such as numbers, identifiers and rare terms.
- **Embedding calls aren't batched or cached.** Large uploads are slow, and re-uploading the same text re-embeds it.
- **Two Gemini SDKs.** Embeddings use `@google/generative-ai`; generation uses `@google/genai`. The older SDK failed for generation with a misleading error, so the two should be consolidated.
- **The LLM sometimes answers in markdown**, which the UI shows as plain text.
- **No automated test suite yet.** Current checks are the manual scripts in `src/tests/`.

---

## Roadmap

**Retrieval quality** (each change should be measured with the evaluation harness)
- Gemini `taskType` (`RETRIEVAL_DOCUMENT` for chunks, `RETRIEVAL_QUERY` for questions)
- Neighbor expansion (the data model already supports it)
- Hybrid search: keyword (BM25) plus vector, merged with reciprocal rank fusion
- Reranking the top candidates before generation
- Contextual chunks (LLM-written context prepended before embedding), parent-child retrieval, semantic chunking
- A better rejection rule than a fixed threshold
- A second evaluation document of a different type, so improvements must generalize

**Product and engineering**
- Authentication and per-user data isolation
- PDF and Word ingestion
- A real vector index (Atlas Vector Search or pgvector)
- Embedding cache and batched embedding
- Unit and API tests, Docker, CI
- Markdown rendering for answers, UI polish, a proper name

# MemoryVerse AI — Architecture & AI Workflow

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   MEMORYVERSE AI                        │
│           AI-Powered Digital Identity System            │
└─────────────────────────────────────────────────────────┘

                         USER
                           │
              ┌────────────▼────────────┐
              │     Next.js 14 App      │
              │   Mobile-first UI       │
              │   http://localhost:3000 │
              └────────────┬────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
  POST /upload         GET /search         POST /chat
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                  PROCESSING LAYER                    │
│                                                     │
│  extract.ts        vector.ts          rag.ts        │
│  PDF → text        embedQuery()       retrieveTop() │
│  DOCX → text       cosine()           generate()    │
│  TXT → text        topK sort          citeSources() │
│                                                     │
│              analyze.ts                             │
│         ┌──────────────────────┐                   │
│         │  command-r-08-2024 │                   │
│         │  → title             │                   │
│         │  → category (8 types)│                   │
│         │  → 2-sentence summary│                   │
│         │  → skills[]          │                   │
│         │  → organizations[]   │                   │
│         │  → dates[]           │                   │
│         │  → confidence 0-100  │                   │
│         └──────────────────────┘                   │
│                    +                               │
│         ┌──────────────────────┐                   │
│         │  embed-english-v3.0  │                   │
│         │  → float[1024]        │ ← Real vectors    │
│         └──────────────────────┘                   │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │      store.ts          │
              │   data/store.json      │
              │                        │
              │  {                     │
              │    docs: [{            │
              │      id, title, cat,   │
              │      summary,          │
              │      entities,         │
              │      embedding: [1024]  │ ← Stored vectors
              │      rawText,          │
              │      year, confidence  │
              │    }],                 │
              │    chat: [...],        │
              │    profile: {...},     │
              │    tokens: {...}       │ ← OAuth tokens
              │  }                     │
              └────────────────────────┘
```

## RAG Pipeline (Per Chat Message)

```
User: "What are my strongest AI skills?"
                    │
                    ▼
         ┌──────────────────────┐
         │   embed(question)    │
         │  embed-english-v3.0  │
         │  → queryVec[1024]     │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   cosine(q, each doc)│
         │                      │
         │  score = dot(a,b) /  │
         │    (|a| × |b|)       │
         │                      │
         │  Sort ↓, take top 6  │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Build RAG Context   │
         │                      │
         │ [Certificate] Google │
         │ TF Dev (2024)        │
         │ Skills: TF, Python   │
         │ --- (x6 docs) ---    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ command-r-08-2024  │
         │                      │
         │  "Answer using ONLY  │
         │  retrieved docs.     │
         │  Cite titles."       │
         │                      │
         │  → Grounded answer   │
         │  → Source list + %   │
         └──────────────────────┘
```

## Embedding Dimension Comparison

```
Local fallback (no API key):  128-dim  (VOCAB hash, fast, offline)
embed-english-v3.0 (Cohere):  1024-dim  (real semantic vectors)
text-embedding-ada-002:       1536-dim (OpenAI, paid)
```

## OAuth Integration Architecture

```
User clicks "Connect GitHub"
           │
           ▼
   /api/auth/github
   → Redirect to GitHub OAuth
           │
           ▼ (user approves)
   GitHub redirects to:
   /api/auth/github/callback?code=xxx
           │
           ▼
   exchangeCode() → access_token
   db.setToken("github", token)
           │
           ▼
   User clicks "Import" in Settings
           │
           ▼
   /api/connect/github (POST)
   githubFetch("/user/repos") → repos[]
   analyzeDoc() per repo → embedding
   db.addDoc() each repo
           │
           ▼
   Repos appear in Journey + Graph + Search
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 App Router | Full-stack React |
| Styling | Tailwind CSS + custom CSS | Mobile-first design system |
| LLM | `command-r-08-2024` | Analysis, RAG, resume, portfolio |
| Embeddings | `embed-english-v3.0` | 1024-dim semantic vectors |
| Vector Math | TypeScript (`lib/vector.ts`) | Cosine similarity |
| PDF Parsing | `pdf-parse` | Text extraction |
| DOCX Parsing | `mammoth` | Word doc extraction |
| Storage | Node.js fs + JSON | File-based vector store |
| OAuth | Custom (`lib/oauth.ts`) | GitHub, Google, LinkedIn, Microsoft |
| API | Next.js Route Handlers | REST endpoints |

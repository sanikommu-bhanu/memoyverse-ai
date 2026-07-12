# MemoryVerse AI v2.0

> **"I never have to search through folders again."**

An AI-powered Digital Identity System that transforms scattered documents into a structured, searchable, intelligent knowledge repository — with real Firebase Auth, Firestore, Cloud Storage, and Gemini AI.

---

## ⚡ Quick Start

```bash
git clone <your-repo>
cd memoryverse-ai
npm install
cp .env.example .env
# Add your GEMINI_API_KEY (free) — see Setup Guide below
npm run dev
# → http://localhost:3000
```

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MEMORYVERSE AI v2.0                          │
│                    AI-Powered Digital Identity                       │
└─────────────────────────────────────────────────────────────────────┘

                              USER
                               │
                    ┌──────────▼──────────┐
                    │   Next.js 14 App    │
                    │   Mobile-first UI   │
                    │   430px phone shell │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼──────────────────────┐
         │                     │                      │
    POST /upload           GET /search           POST /chat
         │                     │                      │
         ▼                     ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│                    AI PROCESSING LAYER                      │
│                                                            │
│  lib/extract.ts      lib/vector.ts       lib/rag.ts        │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐    │
│  │ PDF→text    │    │ embedQuery() │   │ retrieveTop │    │
│  │ DOCX→text   │    │ cosine()     │   │ inject ctx  │    │
│  │ TXT→text    │    │ topK sort    │   │ Gemini ans  │    │
│  └──────┬──────┘    └──────┬───────┘   └──────┬──────┘    │
│         │                  │                  │            │
│         └──────────────────▼──────────────────┘            │
│                    lib/analyze.ts                          │
│              ┌──────────────────────────┐                  │
│              │  Gemini 1.5 Flash (LLM)  │                  │
│              │  → title, category (8)   │                  │
│              │  → 2-sentence summary    │                  │
│              │  → skills, orgs, dates   │                  │
│              │  → confidence 0-100      │                  │
│              └────────────┬─────────────┘                  │
│                           │ (parallel)                     │
│              ┌────────────▼─────────────┐                  │
│              │  text-embedding-004      │                  │
│              │  → float[768] vectors    │ ← REAL AI       │
│              └────────────┬─────────────┘                  │
└───────────────────────────┼────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    HYBRID STORAGE LAYER                            │
│                   lib/hybridStore.ts                              │
│                                                                   │
│   Firebase Configured?                                            │
│   ┌────────YES────────┐            ┌────────NO──────────┐        │
│   │                   │            │                    │        │
│   │  Firestore DB     │            │  data/store.json   │        │
│   │  ├─ users/        │            │  Local file store  │        │
│   │  │  └─ {uid}/     │            │  (single user)     │        │
│   │  │     ├─ docs/   │            │                    │        │
│   │  │     └─ chat/   │            │  Same interface,   │        │
│   │  │                │            │  zero config       │        │
│   │  Firebase Storage │            │                    │        │
│   │  users/{uid}/     │            └────────────────────┘        │
│   │  documents/       │                                          │
│   └───────────────────┘                                          │
│                                                                   │
│   OAuth Tokens → always localStorage (never in Firestore)        │
└───────────────────────────────────────────────────────────────────┘

> [!WARNING]
> **Vercel / Serverless Deployments**: Local dev mode uses `os.tmpdir` and local file storage (`data/store.json`). These files are ephemeral and **will not persist** between invocations in a serverless environment like Vercel. 
> 
> For production, you **MUST** configure the `FIREBASE_ADMIN_*` environment variables. Once configured, `hybridStore.ts` will automatically switch to using Firestore and Firebase Storage, which are fully persistent and scalable.
```

---

## 🧠 RAG Pipeline

```
User question: "What are my strongest AI skills?"
          │
          ▼
  embed(question)          ← text-embedding-004 API
  → queryVec[768]
          │
          ▼
  for each stored doc:
    score = dot(q, doc.embedding)
           ─────────────────────
           |q| × |doc.embedding|
          │
          ▼
  Sort by score ↓
  Take top 6 docs
          │
          ▼
  Build context string:
  "[Certificate] Google TF Dev (2024)
   Skills: TensorFlow, Python, Keras
   Summary: ..."
          │
          ▼
  Gemini 1.5 Flash:
  "Answer using ONLY retrieved docs.
   Cite document titles."
          │
          ▼
  Answer + Sources with match %    ← shown in chat UI
```

---

## 🔐 Firebase Auth Flow

```
User taps "Continue with Google"
          │
          ▼
  Firebase Client SDK
  signInWithPopup(googleProvider)
          │
          ▼
  Google OAuth popup
          │
          ▼
  Firebase returns: { uid, displayName, email, idToken }
          │
          ▼
  API call with Authorization: Bearer <idToken>
          │
          ▼
  Server: firebaseAdmin.verifyToken(idToken) → uid
          │
          ▼
  Data scoped to uid in Firestore:
  users/{uid}/docs, users/{uid}/chat
          │
          ▼
  localStorage.setItem("mv_auth", { uid, name, email })
  → redirect /home
```

---

## ☁️ Third-Party OAuth (GitHub / Drive / LinkedIn / OneDrive)

```
User clicks "Connect GitHub" in Settings
          │
GET /api/auth/github
          │
          ▼
Redirect → github.com/login/oauth/authorize
          │   (user approves)
          ▼
GET /api/auth/github/callback?code=xxx
          │
exchangeCode("github", code) → access_token
db.setToken("github", token)   ← stored locally
          │
          ▼
User clicks "Import" next to GitHub
          │
POST /api/connect/github
  githubFetch("/user/repos") → repos[]
  analyzeDoc() per repo     → embedding
  addDoc() each repo        → Firestore or local
          │
          ▼
Repos appear in Journey + Graph + Search
```

---

## 📁 Complete File Structure

```
memoryverse-ai/
├── app/
│   ├── layout.tsx                Root layout + floating nav + Firebase auth listener
│   ├── globals.css               Complete design system (phone shell, nav, cards, anim)
│   ├── page.tsx                  Animated splash screen
│   ├── onboarding/               3 full-screen Unsplash onboarding slides
│   ├── auth/                     Real Firebase Auth (Google, Apple, Email)
│   ├── home/                     Dashboard with stats, AI insight, timeline, notifications
│   ├── upload/                   Camera + gallery + file + GitHub/Drive/LinkedIn/OneDrive
│   ├── journey/                  Vertical animated timeline
│   ├── graph/                    Interactive SVG knowledge graph
│   ├── search/                   Real semantic search (match % shown)
│   ├── chat/                     RAG AI assistant with cited sources
│   ├── resume/                   AI resume builder (4 templates, download)
│   ├── portfolio/                AI portfolio generator (deployable HTML)
│   ├── insights/                 Career readiness rings + skill bars + suggestions
│   ├── profile/                  Editable profile + skills + quick links
│   ├── notifications/            Real notifications (FCM + localStorage)
│   ├── settings/                 Firebase status + OAuth connections + sign out
│   ├── document/[id]/            Full document entity view + linked docs
│   └── api/
│       ├── upload/               File upload → Firebase Storage → AI analysis
│       ├── search/               Semantic vector search (user-scoped)
│       ├── chat/                 RAG chat (user-scoped)
│       ├── documents/            CRUD (Firestore or local)
│       ├── insights/             Career insights (user-scoped)
│       ├── resume/               AI resume generation
│       ├── portfolio/            Portfolio HTML generation
│       ├── profile/              Profile CRUD
│       ├── auth/
│       │   ├── github/           GitHub OAuth + callback
│       │   ├── google/           Google OAuth + callback
│       │   ├── linkedin/         LinkedIn OAuth + callback
│       │   ├── microsoft/        OneDrive OAuth + callback
│       │   └── fcm/              FCM token save + push notification send
│       └── connect/
│           ├── github/           Import GitHub repos as documents
│           ├── drive/            Import Google Drive files
│           ├── linkedin/         Import LinkedIn profile
│           └── onedrive/         Import OneDrive files
├── lib/
│   ├── firebase.ts               Client Firebase SDK (auth, db, storage, messaging)
│   ├── firebaseAdmin.ts          Server Admin SDK (Firestore, Storage, FCM, token verify)
│   ├── hybridStore.ts            Smart store: Firestore primary, local file fallback
│   ├── store.ts                  Local file-based store (data/store.json)
│   ├── gemini.ts                 Real Gemini API (text-embedding-004 + 1.5-flash)
│   ├── vector.ts                 Cosine similarity vector search
│   ├── extract.ts                PDF (pdf-parse) + DOCX (mammoth) + TXT extraction
│   ├── analyze.ts                AI document analysis pipeline
│   ├── rag.ts                    RAG pipeline + resume + portfolio + insights
│   ├── oauth.ts                  OAuth helpers for all 4 providers
│   └── types.ts                  Shared TypeScript types
├── public/
│   ├── firebase-messaging-sw.js  FCM background notification handler
│   ├── manifest.json             PWA manifest
│   ├── icon-192.png              PWA icon
│   └── icon-512.png              PWA icon
├── data/
│   └── store.json                Auto-created when Firebase not configured
├── docs/
│   ├── ARCHITECTURE.md           Detailed system diagrams
│   └── THOUGHT_PROCESS.md        Design decisions and reasoning
├── firebase.json                 Firebase CLI config
├── firestore.rules               Firestore security rules
├── firestore.indexes.json        Firestore composite indexes
├── storage.rules                 Firebase Storage security rules
├── .env.example                  All environment variables documented
└── README.md                     This file
```

---

## 🔑 API Keys Setup Guide

### 1. Gemini API — REQUIRED (Free)

```
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Add to .env:
   GEMINI_API_KEY=AIza...
```

Powers: document analysis, 768-dim embeddings, RAG answers, resume/portfolio generation.

---

### 2. Firebase — Recommended

```
STEP A — Firebase Project
1. Go to: https://console.firebase.google.com
2. Click "Add project" → name it "memoryverse-ai"
3. Enable Google Analytics (optional)

STEP B — Client Config (for Auth + Realtime)
1. Project Settings → General → Your apps → Add app → Web (</>)
2. Copy the config object values to .env:
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=

STEP C — Admin SDK (for server-side Firestore + Storage)
1. Project Settings → Service accounts → Generate new private key
2. Download JSON file, copy values to .env:
   FIREBASE_ADMIN_PROJECT_ID=
   FIREBASE_ADMIN_CLIENT_EMAIL=
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

STEP D — Enable Services
1. Authentication → Sign-in method → Enable Google + Apple + Email/Password
2. Firestore → Create database → Start in production mode → apply firestore.rules
3. Storage → Get started → apply storage.rules
4. Cloud Messaging → Enabled by default
```

---

### 3. GitHub OAuth

```
1. github.com/settings/developers → OAuth Apps → New OAuth App
2. Homepage URL: http://localhost:3000
3. Callback URL: http://localhost:3000/api/auth/github/callback
4. Copy to .env:
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
```

---

### 4. Google Drive OAuth

```
1. console.cloud.google.com → APIs & Services
2. Enable "Google Drive API" + "Google People API"
3. OAuth consent screen → External
4. Credentials → Create OAuth 2.0 Client ID (Web)
5. Redirect URI: http://localhost:3000/api/auth/google/callback
6. Copy to .env:
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
```

---

### 5. LinkedIn OAuth

```
1. linkedin.com/developers/apps → Create App
2. Auth tab → Authorized redirect URLs:
   http://localhost:3000/api/auth/linkedin/callback
3. Products → Request "Sign In with LinkedIn using OpenID Connect"
4. Copy to .env:
   LINKEDIN_CLIENT_ID=
   LINKEDIN_CLIENT_SECRET=
```

---

### 6. OneDrive / Microsoft

```
1. portal.azure.com → App registrations → New registration
2. Redirect URI: http://localhost:3000/api/auth/microsoft/callback
3. API permissions → Add: Files.Read, User.Read
4. Certificates & secrets → New client secret
5. Copy to .env:
   MICROSOFT_CLIENT_ID=
   MICROSOFT_CLIENT_SECRET=
   MICROSOFT_TENANT_ID=common
```

---

## 🎯 Hackathon Judging Criteria

| Criteria | Weight | Implementation |
|----------|--------|----------------|
| AI organization / categorization / retrieval | **40%** | Gemini categorizes into 8 types, extracts skills/orgs/dates/tech, semantic retrieval with score % |
| NLP / RAG / Embeddings / Vector DB / Semantic Search | **25%** | Real 768-dim text-embedding-004, cosine similarity, RAG pipeline, cited sources |
| Innovation / UX | **20%** | Mobile phone UI, knowledge graph, timeline, resume/portfolio AI builder, Firebase real-time |
| Architecture clarity | **15%** | README + ARCHITECTURE.md + THOUGHT_PROCESS.md + inline code comments |

---

## 🚀 Deploy to Production

```bash
# 1. Push to GitHub
git push origin main

# 2. Deploy to Vercel
vercel deploy

# 3. Set all environment variables in Vercel dashboard

# 4. Update OAuth callback URLs to production domain
#    e.g. https://memoryverse-ai.vercel.app/api/auth/github/callback

# 5. Update Firebase Authorized domains
#    console.firebase.google.com → Authentication → Settings → Authorized domains
#    Add: your-app.vercel.app
```

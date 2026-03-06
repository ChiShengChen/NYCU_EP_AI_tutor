> **Language**: **English** | [繁體中文](README.zh-TW.md)

# Laser Physics AI Teaching Assistant

AI-powered teaching assistant for the "Introduction to Lasers" course at NYCU Department of Electrophysics.

## Live Demo

https://web-eight-hazel-22.vercel.app

## Architecture

The system consists of an offline data pipeline and a runtime chat flow.

### Offline Data Pipeline

```mermaid
graph TD
    A[14 Lecture PDFs] --> B[parse_pdfs.py]
    B --> C{Gemini Vision API}
    C --> D[JSON + Markdown per lecture]
    D --> E[chunk_and_embed.py]
    E --> F[Contextual chunks with metadata prefixes]
    F --> G[gemini-embedding-001 generates 768-dim vectors]
    G --> H[L2 normalization]
    H --> I[(Supabase pgvector)]
```

### Runtime Chat Flow

```mermaid
graph TD
    A[Student opens chat UI] --> B[POST /api/chat]
    B --> C[Route Handler]
    C --> D[Lazy-create student profile in Supabase]
    D --> E[Extract query from UIMessage parts]
    E --> F[rag.ts: embed query via gemini-embedding-001]
    F --> G[Supabase RPC match_chunks — cosine similarity]
    G --> H[Top 6 relevant chunks returned]
    H --> I[Inject chunks into system prompt as context]
    I --> J[Gemini 2.5 Flash — streamText]
    J --> K{Tool Calling}
    K --> L[updateStudentModel: write mastery to DB]
    K --> M[webSearch: Brave Search API fallback]
    J --> N[Stream UIMessageStreamResponse]
    N --> O[Frontend renders Markdown + KaTeX LaTeX]
    O --> P[Save chat messages + chunk references to DB]
```

## Tech Stack

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| Frontend | Next.js | 16.1.6 | Application framework |
| Frontend | React | 19.2.3 | UI library |
| AI SDK | Vercel AI SDK | 6.0.116 | Streaming, tool calling, message protocol |
| AI SDK | @ai-sdk/react | 3.0.118 | React hooks (useChat) |
| AI SDK | @ai-sdk/google | 3.0.43 | Google model adapter |
| LLM | Google Gemini 2.5 Flash | - | Chat generation + vision PDF parsing |
| Embedding | gemini-embedding-001 | 768-dim | Vector embeddings |
| Vector DB | Supabase (pgvector) | IVFFlat | Vector similarity search + data storage |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Math | KaTeX | 0.16.35 | LaTeX formula rendering |
| Markdown | react-markdown | 10.1.0 | Markdown parsing with remark-math + rehype-katex |
| Web Search | Brave Search API | - | Fallback for out-of-scope questions |
| PDF Parsing | google-generativeai (Python) | - | Vision-based PDF page extraction |
| Validation | Zod | v4 | Schema validation for tool inputs |
| Deployment | Vercel | Free Tier | Hosting + serverless functions |

## Database Schema

```mermaid
erDiagram
    student_profiles ||--o{ student_state : has
    student_profiles ||--o{ chat_messages : sends
    lecture_chunks }o--o{ chat_messages : referenced_in

    lecture_chunks {
        bigint id PK
        int week_number
        int page_number
        text section_title
        text content
        text content_type "text | formula | figure_description | table | counterexample"
        boolean is_counterexample
        jsonb metadata
        vector_768 embedding
        timestamptz created_at
    }

    student_profiles {
        uuid id PK
        text display_name
        timestamptz created_at
    }

    student_state {
        bigint id PK
        uuid student_id FK
        text concept
        real mastery_score "0.0 to 1.0"
        int attempt_count
        text last_misconception
        timestamptz updated_at
    }

    chat_messages {
        bigint id PK
        uuid student_id FK
        text role "user | assistant"
        text content
        bigint_array chunks_used
        timestamptz created_at
    }
```

**RPC Function**: `match_chunks(query_embedding, match_threshold, match_count, filter_week)` — cosine similarity search with optional week filter.

## Project Structure

```
AI_tutor_NYCU_EP/
├── README.md                          # English (default)
├── README.zh-TW.md                    # 繁體中文
├── .gitignore
├── scripts/
│   ├── parse_pdfs.py                  # Gemini Vision PDF parsing (retry + rate limiting)
│   ├── chunk_and_embed.py             # Contextual chunking + embedding pipeline
│   └── requirements.txt
├── supabase/
│   └── migrations/
│       └── 001_initial.sql            # Full DB schema + RPC function
├── web/                               # Next.js app (deployed to Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/chat/route.ts      # Chat API: RAG + Gemini streaming + tool calling
│   │   │   ├── layout.tsx             # Root layout (KaTeX CSS, zh-Hant locale)
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── chat.tsx               # Chat UI (AI SDK v6 useChat + DefaultChatTransport)
│   │   │   └── markdown-renderer.tsx  # Markdown + LaTeX + counterexample rendering
│   │   └── lib/
│   │       ├── rag.ts                 # Vector search via Supabase RPC
│   │       └── supabase/
│   │           ├── client.ts          # Browser Supabase client
│   │           └── server.ts          # Server Supabase client (service role)
│   ├── .env.example
│   ├── .env.local                     # Actual secrets (gitignored)
│   └── package.json
└── 雷射導論課程講義/                    # 14 source lecture PDFs (gitignored)
```

## Key Features

- **Vision-based PDF parsing** — Uses Gemini Vision to read PDF pages as images, accurately capturing physics formulas, diagrams, and bilingual content. No traditional OCR.
- **Contextual chunking** — Each chunk is prefixed with course metadata (week, page, section) to improve retrieval relevance.
- **RAG with pgvector** — 768-dimensional Gemini embeddings with cosine similarity search via Supabase RPC.
- **Gemini 2.5 Flash streaming** — Real-time streaming responses with Vercel AI SDK v6 UIMessage protocol.
- **Student knowledge tracking** — Automatically assesses mastery per concept and detects misconceptions via tool calling.
- **Brave Search fallback** — When lecture content is insufficient, the system searches the web for supplementary information.
- **LaTeX rendering** — KaTeX renders inline and display math formulas in real time during streaming.
- **Counterexample detection** — Flags common physics misconceptions from lecture materials with warnings.
- **Anonymous student profiles** — UUID-based identification via localStorage, no registration required.

## Environment Variables

| Variable | Description | Required | Source |
| :--- | :--- | :--- | :--- |
| GOOGLE_GENERATIVE_AI_API_KEY | Google AI Studio API key | Yes | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| BRAVE_SEARCH_API_KEY | Brave Search API key | Yes | [brave.com/search/api](https://brave.com/search/api/) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes | Supabase Dashboard > Settings > API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key | Yes | Same as above |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | Yes | Same as above |
| CHAT_MODEL | LLM model override | No | Default: `gemini-2.5-flash` |
| EMBEDDING_MODEL | Embedding model override | No | Default: `gemini-embedding-001` |

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+
- Accounts: [Google AI Studio](https://aistudio.google.com), [Supabase](https://supabase.com), [Brave Search](https://brave.com/search/api/)

### Setup

1. Clone the repository.

2. Create a Supabase project (Tokyo region recommended for Asia).

3. Run the migration in Supabase SQL Editor:
   ```sql
   -- Paste contents of supabase/migrations/001_initial.sql
   ```

4. Copy `web/.env.example` to `web/.env.local` and fill in your keys.

5. Install frontend dependencies:
   ```bash
   cd web && npm install
   ```

6. Set up Python environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r scripts/requirements.txt
   ```

7. Parse lecture PDFs (14 files, ~15 minutes):
   ```bash
   python scripts/parse_pdfs.py
   ```

8. Generate embeddings (371 chunks):
   ```bash
   python scripts/chunk_and_embed.py
   ```

9. Start the dev server:
   ```bash
   cd web && npm run dev
   ```
   Open http://localhost:3000

## Deployment

```bash
npm install -g vercel
cd web
vercel --prod
```

Set environment variables via the Vercel Dashboard or CLI (`vercel env add`). The framework is auto-detected as Next.js and builds with Turbopack.

## AI Tools

The chat API exposes two tools to Gemini via Vercel AI SDK tool calling:

| Tool | Trigger | Action |
| :--- | :--- | :--- |
| `updateStudentModel` | After every substantive answer | Assesses student mastery (0-1 score) per concept, records misconceptions to `student_state` table |
| `webSearch` | When lecture content is insufficient | Queries Brave Search API, returns top 3 results as supplementary context |

## Roadmap

- [ ] Auto-generate quizzes based on weak concepts
- [ ] Knowledge tracing dashboard for instructors
- [ ] Multi-course support for other EP department courses
- [ ] GitHub integration for CI/CD auto-deploy

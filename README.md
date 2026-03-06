> **Language**: **English** | [繁體中文](README.zh-TW.md)

# Laser Physics AI Teaching Assistant

RAG-based AI teaching assistant for the "Introduction to Lasers" course at NYCU Department of Electrophysics. Built with Gemini 2.5 Flash, Supabase pgvector, and Vercel AI SDK v6.

## Live Demo

https://web-eight-hazel-22.vercel.app

## Screenshot

![Homepage — Mode Selector](docs/homepage.png)

Eight learning modes: **Teaching Mode** (lecture-by-lecture walkthrough), **Free Q&A** (RAG-powered chat), **Auto Quiz** (AI-generated quizzes based on weak concepts), **Exam Simulation** (timed midterm/final exams with batch grading), **Concept Knowledge Graph** (interactive prerequisite visualization), **AI Study Plan** (spaced repetition + personalized weekly plan), **Learning Dashboard** (mastery radar chart, trends, activity stats), and **Chat History** (session-based conversation replay).

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

### Auto Quiz Flow

```mermaid
graph TD
    A[Student enters Quiz Mode] --> B[POST /api/quiz action=generate]
    B --> C[Fetch weak concepts from student_state]
    C --> D{mastery < 0.6?}
    D -->|Yes| E[RAG retrieval for weak concepts]
    D -->|No concepts| F[Generate intro quiz with default topics]
    E --> G[Gemini generateObject with Zod schema]
    F --> G
    G --> H[Return structured quiz: 3 MC + 2 short answer]
    H --> I[Student answers questions]
    I --> J[POST /api/quiz action=grade]
    J --> K[Gemini grades answers]
    K --> L[Update student_state mastery scores]
    L --> M[Return per-question feedback + overall advice]
```

## Tech Stack

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| Frontend | Next.js | 16.1.6 | Application framework |
| Frontend | React | 19.2.3 | UI library |
| AI SDK | Vercel AI SDK | 6.0.116 | Streaming, tool calling, structured output |
| AI SDK | @ai-sdk/react | 3.0.118 | React hooks (useChat) |
| AI SDK | @ai-sdk/google | 3.0.43 | Google model adapter |
| LLM | Google Gemini 2.5 Flash | - | Chat generation + vision PDF parsing + quiz generation |
| Embedding | gemini-embedding-001 | 768-dim | Vector embeddings |
| Vector DB | Supabase (pgvector) | IVFFlat | Vector similarity search + data storage |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Math | KaTeX | 0.16.35 | LaTeX formula rendering |
| Markdown | react-markdown | 10.1.0 | Markdown parsing with remark-math + remark-gfm + rehype-katex |
| Charts | Recharts | 2.x | Radar chart, trend lines, activity bar charts |
| Web Search | Brave Search API | - | Fallback for out-of-scope questions |
| PDF Parsing | google-generativeai (Python) | - | Vision-based PDF page extraction |
| Validation | Zod | v4 | Schema validation for tool inputs + structured output |
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
├── docs/
│   └── homepage.png                   # Homepage screenshot
├── .gitignore
├── scripts/
│   ├── parse_pdfs.py                  # Gemini Vision PDF parsing (retry + rate limiting)
│   ├── chunk_and_embed.py             # Contextual chunking + embedding pipeline
│   ├── extract_slides.py             # PDF → JPEG → Supabase Storage upload
│   └── requirements.txt
├── supabase/
│   └── migrations/
│       └── 001_initial.sql            # Full DB schema + RPC function
├── web/                               # Next.js app (deployed to Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── chat/route.ts      # Chat API: RAG + Gemini streaming + tool calling
│   │   │   │   ├── lectures/route.ts  # Lectures API: week/page data for teaching mode
│   │   │   │   ├── quiz/route.ts      # Quiz API: generate + grade with structured output
│   │   │   │   ├── exam/route.ts      # Exam API: timed midterm/final simulation
│   │   │   │   ├── dashboard/route.ts # Dashboard API: mastery stats + activity data
│   │   │   │   ├── history/route.ts   # History API: session-grouped chat replay
│   │   │   │   └── study-plan/route.ts# Study Plan API: forgetting curve + AI plan
│   │   │   ├── layout.tsx             # Root layout (KaTeX CSS, zh-Hant locale)
│   │   │   ├── page.tsx               # Mode router (8 modes)
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── chat.tsx               # Free Q&A chat (AI SDK v6 useChat)
│   │   │   ├── teaching-mode.tsx      # Teaching mode: week grid → slide + AI explanation
│   │   │   ├── quiz-mode.tsx          # Auto quiz: generate → answer → grade → results
│   │   │   ├── exam-mode.tsx          # Exam simulation: timed, batch grading, letter grades
│   │   │   ├── knowledge-graph.tsx    # Concept graph: SVG desktop + card list mobile
│   │   │   ├── study-plan.tsx         # Spaced repetition + AI personalized study plan
│   │   │   ├── dashboard.tsx          # Learning dashboard: radar, trends, activity charts
│   │   │   ├── chat-history.tsx       # Chat history: session list + conversation replay
│   │   │   ├── mode-selector.tsx      # Landing page with 8 mode cards (3+3+2 layout)
│   │   │   └── markdown-renderer.tsx  # Markdown + LaTeX + GFM table rendering
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

- **Eight Learning Modes** — Teaching, Free Q&A, Auto Quiz, Exam Simulation, Concept Graph, AI Study Plan, Dashboard, and Chat History.
- **Exam Simulation** — Timed midterm/final mock exams (50/60 min). 7 multiple-choice + 3 short-answer questions. No answers shown during exam. Batch grading with letter grades (A+ to F) and per-question feedback.
- **Concept Knowledge Graph** — Interactive SVG visualization of 16 laser physics concepts across 4 categories (Optics, Resonator, Quantum, Laser). Shows prerequisite relationships. Click to explore or jump to teaching mode. Mobile-responsive card layout.
- **AI Study Plan** — Spaced repetition based on forgetting curve (retention = mastery × e^(-days/7)). Gemini generates personalized weekly plan with review priorities and specific exercise suggestions.
- **Learning Dashboard** — Mastery radar chart, score trend line, activity heatmap, and detailed concept mastery table. 6 summary stat cards. Powered by Recharts.
- **Chat History** — Session-based conversation replay grouped by 30-minute gaps. Browse past Q&A interactions with timestamps.
- **Auto Quiz Generation** — AI analyzes student weak concepts (mastery < 60%) and generates targeted quizzes. Grades answers and updates mastery scores.
- **Teaching Mode** — Browse lectures week-by-week with original slide images. AI automatically explains each page with follow-up Q&A.
- **Vision-based PDF parsing** — Uses Gemini Vision to read PDF pages as images, accurately capturing physics formulas, diagrams, and bilingual content.
- **RAG with pgvector** — 768-dimensional Gemini embeddings with cosine similarity search via Supabase RPC.
- **Student knowledge tracking** — Automatically assesses mastery per concept and detects misconceptions via tool calling.
- **Brave Search fallback** — When lecture content is insufficient, the system searches the web for supplementary information.
- **LaTeX rendering** — KaTeX renders inline and display math formulas in real time during streaming.
- **Mobile responsive** — All 8 modes support mobile screens with adaptive layouts (card lists, select dropdowns, stacked buttons).
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

## AI Tools & APIs

| Endpoint / Tool | Trigger | Action |
| :--- | :--- | :--- |
| `POST /api/chat` | User sends message | RAG retrieval → Gemini streaming response with tool calls |
| `POST /api/lectures` | Teaching mode navigation | Returns lecture structure (weeks, pages, chunks) |
| `POST /api/quiz` | Quiz mode | Generates quizzes from weak concepts / grades answers |
| `POST /api/exam` | Exam simulation | Generates timed midterm/final exams / batch grades |
| `GET /api/dashboard` | Dashboard view | Returns mastery stats, activity heatmap, trend data |
| `GET /api/history` | Chat history view | Returns session-grouped chat messages |
| `GET /api/study-plan` | Study plan view | Forgetting curve analysis + AI-generated study plan |
| `updateStudentModel` | After every substantive answer | Assesses student mastery (0-1 score) per concept, records misconceptions |
| `webSearch` | When lecture content is insufficient | Queries Brave Search API, returns top 3 results |

## Roadmap

- [x] Auto-generate quizzes based on weak concepts
- [x] Teaching mode with original slide images
- [x] Exam simulation (timed midterm/final mock exams)
- [x] Concept knowledge graph (interactive prerequisite visualization)
- [x] Spaced repetition + AI personalized study plan
- [x] Learning dashboard (radar chart, trends, activity stats)
- [x] Chat history with session replay
- [x] Mobile responsive design (RWD)
- [x] GitHub CI/CD auto-deploy via Vercel
- [ ] Knowledge tracing dashboard for instructors
- [ ] Multi-course support for other EP department courses

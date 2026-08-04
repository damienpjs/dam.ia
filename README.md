# dam.ia

Personal site of Damien Pasulj, built around an AI chat interface: an LLM-backed
assistant answering questions about his background and projects, grounded in a
RAG pipeline over his own content.

## Tech stack

- **Next.js 16** — React framework (App Router)
- **React 19** — UI
- **TypeScript 5** — static typing
- **Tailwind CSS 4** — styling
- **shadcn/ui** on **Base UI** (`@base-ui/react`) primitives — UI components
- **three.js** + **@react-three/fiber** / **drei** / **postprocessing** — WebGL hero scene
- **react-markdown + remark-gfm** — markdown rendering of bot answers
- **Google Gemini** (`@google/generative-ai`) + **Groq** — LLM providers
- **Drizzle ORM** + **Neon PostgreSQL** (`@neondatabase/serverless`) — chat persistence
- **Qdrant** (`@qdrant/js-client-rest`) + **pdf-parse** — vector store and RAG indexing
- **@upstash/ratelimit + @upstash/redis** — per-IP rate limiting (anti-spam)
- **Lucide React** — icons
- **Vitest** — unit tests (coverage threshold: 95%)
- **Istanbul** (`@vitest/coverage-istanbul`) — coverage reporting
- **@testing-library/react** — React testing utilities

### Typography

Three Google Fonts are loaded via `next/font` in
[`src/app/layout.tsx`](src/app/layout.tsx) and mapped to CSS variables in
[`src/app/globals.css`](src/app/globals.css):

| Font | CSS variable | Role |
| --- | --- | --- |
| **Geist** | `--font-sans` | Body text (default sans) |
| **Geist Mono** | `--font-mono` | Monospace |
| **Plus Jakarta Sans** | `--font-heading`, `--font-chat` | Headings and chat interface |

## Installation

```bash
npm install
```

Then copy `.env.example` to `.env` and fill in the keys (all optional — see
[Environment variables](#environment-variables)).

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Check the code with ESLint |
| `npm run test` | Run tests once with coverage in the console, then exit |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ci` | Run tests with coverage (CI mode) |
| `npm run coverage` | Generate the coverage report in `./coverage/` |
| `npm run db:generate` | Generate Drizzle migrations from the schema |
| `npm run db:migrate` | Apply pending Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run rag:index` | Index content into Qdrant (`scripts/index-content.ts`) |

## Architecture

```
src/
  app/                # Next.js pages (App Router)
    about/            # "À propos" page
    api/
      chat/           # Chat endpoint + session read (/api/chat/session/[sessionId])
      feedback/       # Message feedback endpoint
      llm/status/     # Provider availability status
    robots.ts         # robots.txt
    sitemap.ts        # sitemap.xml
  components/
    features/         # Domain components (HeroScene, ChatInterface, MessageBubble,
                      # ProviderStatus, TechBadges, ThinkingPhrase, Timeline)
    ui/               # Generic components (Button, Tooltip, ConfirmDialog)
  constants/          # Shared configuration (chat, cors, landing, llm, rag,
                      # rate-limit, scene, validation)
  lib/
    db/               # Drizzle schema and chat service (Neon PostgreSQL)
    llm/              # Providers (Gemini, Groq, Mock), fallback chain, system
                      # prompt, conversation history, repeated-question detection
    rag/              # RAG pipeline (chunker, embeddings, Qdrant, PDF loader,
                      # web scraper)
                      # plus shared helpers: cors, rate-limit, sanitize-message,
                      # stream-chat, validation, content-loader, utils
  proxy.ts            # Next 16 proxy (CORS + rate limiting) — replaces middleware.ts
  tests/              # Unit tests (mirrors src/)
scripts/
  index-content.ts    # RAG indexing script (npm run rag:index)
```

## Environment variables

Copy `.env.example` to `.env`, then fill in the keys.

| Variable | Required | Description |
| --- | --- | --- |
| `LLM_PROVIDER` | no | Force a provider: `gemini`, `groq` or `mock`. Empty = auto-detection. |
| `GEMINI_API_KEY` | no\* | Google Gemini key (primary provider) — [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | no\* | Groq key (fallback provider) — [console.groq.com](https://console.groq.com/keys) |
| `DATABASE_URL` | no | Neon PostgreSQL connection string (chat persistence) |
| `QDRANT_URL` | no | Qdrant instance URL (RAG vector store) |
| `QDRANT_API_KEY` | no | Qdrant key (required for Qdrant Cloud) |
| `UPSTASH_REDIS_REST_URL` | no | Upstash Redis REST URL — enables rate limiting ([console.upstash.com](https://console.upstash.com)) |
| `UPSTASH_REDIS_REST_TOKEN` | no | Upstash Redis REST token |
| `ALLOWED_ORIGINS` | no | Additional allowed cross-origin origins (CSV) on top of same-origin. Default: production domain. |

\* If no LLM key is provided, the application falls back to the `MockProvider`
(pre-recorded answers).

### Multi-provider fallback

When both the Gemini **and** Groq keys are present, requests use a **Gemini →
Groq** fallback chain: if Gemini returns a transient error — quota exceeded
(HTTP 429) **or** model overloaded / temporarily unavailable (HTTP 503) — before
a single token has been streamed, the system switches over to Groq in real time,
which has an independent free quota. Every new request restarts the chain at
Gemini, so returning to the primary provider is automatic as soon as it becomes
available again. If both providers are down, a fallback answer (`MockProvider`)
is served with a wait message.

The chat header shows a **status dot per active provider** (green = available,
red = unavailable), depending on the configuration: a single dot if a provider is
forced, both if the fallback chain is active, none in mock mode. The status is
exposed by `GET /api/llm/status` and refreshed after each answer.

### Conversation memory

The bot keeps track of the conversation: on every message, the history of
previous turns is **rebuilt server-side from the database** (using the
`sessionId`), then passed to the LLM provider. The history is therefore not sent
back by the client on every request, which keeps the network payload small.

To keep the token cost under control, a bounded **"head + tail"** strategy is
applied ([`src/lib/llm/conversation-history.ts`](src/lib/llm/conversation-history.ts)):

- at most `MAX_HISTORY_MESSAGES` messages (10 ≈ 5 turns);
- a **start anchor** of `HISTORY_ANCHOR_MESSAGES` messages (2 = the first turn) is
  **always kept**, on top of the recent window: a purely sliding window would
  forget the beginning of the conversation and break meta questions such as
  "what was my first question?" (especially after a reload, where more messages
  accumulate);
- at most `MAX_HISTORY_CHARS` characters (~1000 tokens) on the tail, the oldest
  ones being truncated beyond that;
- fallback answers (status `error`) are excluded, and the RAG context is **not**
  re-injected into the history so those tokens aren't paid for again every turn.

The caps and the anchor are configurable in
[`src/constants/llm.ts`](src/constants/llm.ts). Without a `sessionId` (first
message), the exchange stays "one-shot".

#### Repeated-question detection

Before each generation, the current message is compared against **all** previous
user questions ([`src/lib/llm/repeated-question.ts`](src/lib/llm/repeated-question.ts)),
not just the recent window. Detection is **deterministic** and deliberately
conservative (exact / near-exact after case, accent and punctuation
normalization, with a one-typo tolerance via Levenshtein distance) in order to
guarantee zero false positives. If an already-asked question is spotted, a
**non-persisted internal note** is injected into the prompt so the assistant
makes a subtle (and slightly sarcastic) reference to it reliably, while still
answering. The thresholds are configurable in
[`src/constants/llm.ts`](src/constants/llm.ts)
(`REPEATED_QUESTION_MAX_DISTANCE_RATIO`, `REPEATED_QUESTION_MIN_LENGTH`).

## Security & anti-spam

Since the public API routes are exposed without authentication, several
safeguards protect the backing services (Neon PostgreSQL, LLM quota) against
automated spam:

- **Origin control (CORS)** — the proxy ([`src/proxy.ts`](src/proxy.ts)) rejects
  cross-site `POST` requests to `/api/chat` and `/api/feedback` with a `403` and
  handles the `OPTIONS` preflight ([`src/lib/cors.ts`](src/lib/cors.ts)).
  **Same-origin** is allowed automatically (dev/preview/prod, no config needed);
  extra origins are declared via `ALLOWED_ORIGINS`. This protects against
  cross-site browser abuse (scripted requests without an `Origin` header are
  still covered by rate limiting).
- **Per-IP rate limiting** — the Next.js proxy ([`src/proxy.ts`](src/proxy.ts),
  the Next 16 convention that replaces `middleware.ts`) limits `POST` requests to
  `/api/chat` and `/api/feedback` through an Upstash Redis sliding window. The
  thresholds are configurable in
  [`src/constants/rate-limit.ts`](src/constants/rate-limit.ts) (15 req/min for
  chat, 30 req/min for feedback). Without the `UPSTASH_*` variables, rate
  limiting **degrades gracefully** and turns itself off (local dev, mock mode, CI).
- **Identifier validation** — `messageId` (feedback) and `sessionId` (session
  read) must be valid **UUIDs**, rejected with a `400` before any DB query
  ([`src/lib/validation.ts`](src/lib/validation.ts)).
- **Input capping** — chat message limited to `MAX_MESSAGE_LENGTH` (500)
  characters, feedback comment to `MAX_FEEDBACK_COMMENT_LENGTH` (2000), and the
  buffered body size capped via `experimental.proxyClientMaxBodySize` (64 kB) in
  `next.config.ts`.
- **Prompt injection detection** — messages are analyzed
  ([`src/lib/sanitize-message.ts`](src/lib/sanitize-message.ts)) and tagged
  `[INJECTION DETECTED]` before being sent to the LLM.

> All SQL queries go through Drizzle ORM (parameterized): no SQL injection. Keys
> and `DATABASE_URL` live in `.env` (gitignored).

## Tests and coverage

Tests are written with **Vitest** + **@testing-library/react**.
Coverage is measured by **Istanbul** (`@vitest/coverage-istanbul`) and printed
straight to the console after each `npm run test`. The threshold is set to **95%**
across all metrics (lines, functions, branches, statements).

The HTML coverage report is also generated in `./coverage/index.html` after
`npm run test` or `npm run coverage`.

> **Note:** some files are excluded from coverage in
> [`vitest.config.ts`](vitest.config.ts) — `hero-scene.tsx` (WebGL Canvas /
> three.js, not available in jsdom), `app/layout.tsx`, the types-only modules
> (`lib/llm/types.ts`, `lib/rag/types.ts`) and the re-export barrel
> `lib/rag/index.ts`.

### Continuous integration & deployment

Continuous integration and Vercel deployments are split by event across three
GitHub Actions workflows (one workflow per trigger, to avoid "skipped" checks on
PRs), plus one scheduled maintenance workflow:

| Workflow | Trigger | Role |
| --- | --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | **pull request** to `main` or `develop` | Lint + tests, then Vercel **preview** deployment |
| [`deploy-develop.yml`](.github/workflows/deploy-develop.yml) | **push** to `develop` | Lint + tests, then **preview** deployment aliased to the branch domain `damienpasulj-dev.vercel.app` |
| [`deploy-production.yml`](.github/workflows/deploy-production.yml) | **push** to `main` | Lint + tests, then **production** deployment (`vercel deploy --prod`) |
| [`qdrant-keepalive.yml`](.github/workflows/qdrant-keepalive.yml) | **schedule** (every 3 days) + manual | Pings the Qdrant free-tier cluster to prevent idle suspension, and checks that the RAG collection responds and isn't empty |

In every deployment workflow, the deploy job (`needs: test`) runs **only if lint
and tests pass**; the job fails if coverage drops below the **95%** threshold. The
build is performed on Vercel's side. To block merges on `main`, enable branch
protection (_Settings → Branches_) with the **"Lint & tests"** check required.

Required secrets (_Settings → Secrets and variables → Actions_): `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` for deployments, plus `QDRANT_URL` and
`QDRANT_API_KEY` for the keep-alive workflow.

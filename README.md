# dam.ia

Personal site of Damien Pasulj, built around an AI chat interface: an LLM-backed
assistant answering questions about his background and projects, grounded in a
RAG pipeline over his own content. The whole interface is available in **French
and English**, switchable from a `FR / EN` toggle.

## Tech stack

- **Next.js 16**: React framework (App Router)
- **React 19**: UI
- **TypeScript 5**: static typing
- **Tailwind CSS 4**: styling
- **shadcn/ui** on **Base UI** (`@base-ui/react`) primitives: UI components
- **three.js** + **@react-three/fiber** / **drei** / **postprocessing**: WebGL hero scene
- **react-markdown + remark-gfm**: markdown rendering of bot answers
- **Google Gemini** (`@google/generative-ai`) + **Groq**: LLM providers
- **Drizzle ORM** + **Neon PostgreSQL** (`@neondatabase/serverless`): chat persistence
- **Qdrant** (`@qdrant/js-client-rest`) + **pdf-parse**: vector store and RAG indexing
- **@upstash/ratelimit + @upstash/redis**: per-IP rate limiting (anti-spam)
- **Vitest**: unit tests (coverage threshold: 95%)
- **Istanbul** (`@vitest/coverage-istanbul`): coverage reporting
- **@testing-library/react**: React testing utilities

### Visual identity

The site follows the art direction of Damien's 2026 CV: a recycled-paper
background, two inks and a "folder of files" metaphor (every block is a file
with its size in bytes, every section a folder with its item count).

| Token | Value | Role |
| --- | --- | --- |
| `paper` | `#eef0ec` | Background everywhere |
| `ink` | `#0b1110` | Name, headings, visitor messages (16.6:1) |
| `body` | `#4a4f4d` | Running text (7.3:1) |
| `teal-ink` / `teal` | `#1a5f58` / `#84c7c1` | File names and links / solid fills only |
| `coral-ink` / `coral` | `#a84b25` / `#efa07a` | Sizes, dates, times / solid fills only |
| `rule` / `control` | `#c3ccc8` / `#6f7975` | Decorative rules / form control borders (3.9:1) |

Tokens live in [`src/app/globals.css`](src/app/globals.css) (`@theme inline`
plus the shadcn variables). Radius is 0 everywhere, no shadows, no blur.

**Typography.** One family, **IBM Plex Mono** (400, 500, 700), self-hosted with
`next/font/local` from [`src/app/fonts/`](src/app/fonts/) (SIL OFL, see
`OFL.txt`). The files are subset to Latin, Latin Extended, arrows, check mark
and block elements: Google's `latin` subset lacks `→`, used across the UI.

**Paper grain.** [`public/paper-grain.jpg`](public/paper-grain.jpg) is the CV's
paper scan, normalised to white and contrast-boosted, laid over the whole page
with `mix-blend-mode: multiply` (fixed `.paper-grain` layer in the root layout).

**3D scene.** The canvas is transparent (`alpha`, non-premultiplied) so the
paper shows through. The camera framing follows the layout through
`setViewOffset`: the character stands right of the UI on desktop, lower on
mobile, and moves in to a waist shot when the chat panel opens, so the face
reads (`VIEW_OFFSET_*` in [`src/constants/scene.ts`](src/constants/scene.ts)).

## Character

The 3D character (`public/models/founder.glb`) behaves like a virtual
assistant while the chat is open: it walks to the centre, faces the visitor,
and its face and arms follow the conversation.

- **Activity.** The chat drives four states through a small cue store
  ([`src/lib/character/character-cues.ts`](src/lib/character/character-cues.ts)):
  `idle` (chat closed, it wanders), `listening`, `thinking` (question sent, no
  answer yet), `talking` (answer streaming).
- **Mood.** The LLM opens every answer with a tag such as `[[mood:joy]]`
  (instruction in the system prompt). The API strips it from the streamed and
  saved text and sends it as a separate `mood` field of the NDJSON stream
  ([`src/lib/llm/mood-tag.ts`](src/lib/llm/mood-tag.ts)). Moods: `neutral`,
  `joy`, `amused`, `curious`, `surprised`, `sorry`, `proud`; a fallback answer
  is `sorry`. The mood is held 6 s after the answer ends.
- **Face.** [`FaceController`](src/lib/character/face-controller.ts) turns
  activity and mood into a frame: morph targets for brows, smile, frown, smirk
  and jaw; eyelids with blinks (every 2.5 to 6 s, sometimes doubled); gaze
  alternating between the visitor and short glances away, with the timings of
  Lee, Badler & Badler, *Eyes Alive* (2002); a syllable-rate mouth while text
  arrives; small head nods. The eyes and the open mouth are drawn by the head
  material's shader ([`face-shader.ts`](src/lib/character/face-shader.ts))
  from a second UV set, so they stay sharp at any distance.
- **Gestures.** Arm poses (`talk`, `open`, `shrug`, `think`, `akimbo`,
  [`gestures.ts`](src/lib/character/gestures.ts)) are wrist targets solved by
  two-bone IK on top of the clip, each with a hand shape (`HAND_*` clips in the
  model). Every channel (wrist target, elbow, IK weight, forearm twist, finger
  shape, wrist bend, head turn) follows its goal through a second-order spring
  with its own tempo ([`dynamics.ts`](src/lib/character/dynamics.ts)): a small
  overshoot, fingers settling after the wrist, the hand trailing a fast wrist.
  Between two poses the hand travels on an arc in front of the body, and the
  springs ride their anchor (head, chest, hips), so a hand at rest follows the
  idle breathing without lag. On the way the hand is pushed out of per-bone
  capsules; arriving on the body (chin, hips) it follows a target measured on
  the real meshes, and the chin pose lays the index on a point of the head
  frame, so the contact holds whatever the arm does
  ([`character-rig.ts`](src/components/features/character-rig.ts)). While
  thinking the head keeps its own pose instead of turning to the camera.
- **Model.** The portfolio head (Hunyuan export: texture rebaked from clean
  views, eyes removed from the texture, shape keys) and a generated pair of
  hands on the stylised male body, outfit, rig and clips of Ship or Die, with
  finger and forearm twist bones. Arms and hands share the head's skin tone.
  Built by the scripts in [`scripts/character/`](scripts/character/README.md).

## Installation

```bash
npm install
```

Then copy `.env.example` to `.env` and fill in the keys (all optional, see
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
    fonts/            # IBM Plex Mono subsets (next/font/local) + licence
    api/
      chat/           # Chat endpoint + session read (/api/chat/session/[sessionId])
      feedback/       # Message feedback endpoint
      llm/status/     # Provider availability status
    robots.ts         # robots.txt
    sitemap.ts        # sitemap.xml
  components/
    features/         # Domain components (HeroScene, ChatInterface, MessageBubble,
                      # ReadmeCard, ThinkingPhrase, AboutContent) and the
                      # character rig (face shader patch, head look, arm IK)
    ui/               # Generic components (Button, ConfirmDialog, DirLabel,
                      # FileBox, LanguageSwitcher, NameBlock, SiteNav, Tooltip)
  constants/          # Shared configuration (chat, cors, dictionary, i18n,
                      # llm, profile, rag, rate-limit, scene, validation)
  lib/
    character/        # Character behaviour without three.js: moods, face
                      # controller, face shader source, gestures and hand
                      # shapes, spring dynamics, chat cues
    db/               # Drizzle schema and chat service (Neon PostgreSQL)
    llm/              # Providers (Gemini, Groq, Mock), fallback chain, system
                      # prompt, conversation history, repeated-question detection,
                      # mood tag filter
    rag/              # RAG pipeline (chunker, embeddings, Qdrant, PDF loader,
                      # web scraper, GitHub loader, follow-up query condensing)
                      # plus shared helpers: cors, rate-limit, sanitize-message,
                      # stream-chat, validation, content-loader, locale-context,
                      # utils
  proxy.ts            # Next 16 proxy (CORS + rate limiting), replaces middleware.ts
  tests/              # Unit tests (mirrors src/)
scripts/
  index-content.ts    # RAG indexing script (npm run rag:index)
  character/          # Blender / Python pipeline that rebuilds founder.glb
content/
  *.md                # Career documents (frontmatter + markdown)
  *.pdf               # PDF documents (LinkedIn export)
  pdf-meta.json       # Per-PDF source label / URL overrides
  sources.json        # Web pages to scrape
  github.json         # GitHub profiles to index
```

### RAG content sources

`npm run rag:index` builds the vector index from four kinds of source, each one
optional: a missing file is simply skipped:

| Source | Configuration | Indexed content |
| --- | --- | --- |
| Markdown | `content/*.md` | Career documents, chunked with a frontmatter context header |
| PDF | `content/*.pdf` | Text extracted via `pdf-parse` |
| Web | `content/sources.json` | Scraped pages (`jsRendering: true` for SPAs) |
| GitHub | `content/github.json` | Profile, repositories, topics, languages, READMEs and a French projects summary |

GitHub is read through the REST API rather than the profile page: the HTML only
yields navigation and repository names, while the API exposes descriptions,
topics and READMEs. Each repository becomes an independently citable source, so
chat bubbles link straight to the relevant project instead of the profile.

READMEs are truncated to `GITHUB_MAX_README_CHARS` (`src/constants/rag.ts`) so a
heavily documented project cannot crowd out the rest of the index.

Repository chunks are dominated by English README content, which made generic
French questions ("sur quels projets perso tu bosses ?") retrieve nothing from
GitHub. An extra short, French-only summary chunk lists every project so those
questions match; it deliberately avoids employment vocabulary, which would
otherwise outrank career chunks on "pour quelle entreprise tu travailles ?".

Indexing rebuilds the collection from scratch (`resetCollection`), so a source
removed from the configuration leaves no orphan points behind.

### Retrieval on follow-up questions

A follow-up such as "c'est quoi le backend ?" carries no trace of the topic being
discussed. Embedded as-is, its vector points at generic content rather than at the
project the visitor is actually asking about, and since retrieved chunks are
presented to the model as authoritative, the assistant would build its answer on
unrelated material and drift off topic mid-conversation.

Two safeguards address this:

- **Query condensing** ([`src/lib/rag/condense-query.ts`](src/lib/rag/condense-query.ts)):
  before the vector search, a follow-up is rewritten into a **standalone**
  question ("quel est le backend du projet hodl-on-a-minute ?"). A cheap heuristic
  gates the work (short message, or an anaphora marker), then a small Groq model
  (`llama-3.1-8b-instant`, temperature 0) does the rewrite. Degradation is
  layered: no history or an already-standalone question costs nothing, and a
  missing key, an error, a timeout or a suspicious output falls back to plain
  concatenation with the previous question. The rewrite feeds the **search only**;
  the LLM still receives the visitor's original message.
- **Relevance threshold**: the vector search passes `MIN_RELEVANCE_SCORE`
  (`src/constants/rag.ts`) to Qdrant as `score_threshold`. Without it, `limit`
  alone guaranteed that even an off-topic question got its `DEFAULT_TOP_K` "best"
  chunks, however bad. Returning **no** context is a nominal outcome: the persona
  is instructed to ignore excerpts that do not match the question at hand rather
  than force them in.

## Languages (FR / EN)

The whole interface is bilingual. A `FR / EN` toggle sits in the top-right corner
of the landing page, in the chat header and in the "À propos" navigation; the
selected language is stored in `localStorage` (`dam_ia_locale`) and restored on
the next visit.

There is deliberately **no i18n routing** (`/fr`, `/en`): the language is client
state only, so each page keeps a single URL to index, which suits a personal
site whose SEO metadata stays in French.

- [`src/constants/i18n.ts`](src/constants/i18n.ts): supported locales, default
  locale, storage key, `isLocale` guard.
- [`src/constants/dictionary.ts`](src/constants/dictionary.ts): every visible
  string, in both languages. Adding a language means adding one entry to
  `DICTIONARIES`; a test asserts both dictionaries expose exactly the same keys.
- [`src/lib/locale-context.tsx`](src/lib/locale-context.tsx): `LocaleProvider`
  (mounted in the root layout) and the `useLocale()` hook returning
  `{ locale, setLocale, t }`. The first render always uses French to match the
  server HTML, then the stored language is applied before the first paint, and
  `<html lang>` is kept in sync.
- [`src/components/ui/language-switcher.tsx`](src/components/ui/language-switcher.tsx):
  the toggle itself.
- [`src/components/ui/site-nav.tsx`](src/components/ui/site-nav.tsx): the
  navigation bar shared by the chat header and the about page. It carries the
  language toggle, any context-specific slot (LLM status) and the link to
  `/about`, hidden when that page is already the current one.

Proper nouns (technologies, companies, schools) are never translated. Suggested
questions are persisted by **identifier** rather than by label, so switching
language does not bring back a suggestion that was already used.

The selected language is also sent to `POST /api/chat` and turned into a
non-persisted internal instruction prepended to the prompt, so the assistant
answers in the visitor's language even when the question itself is short or
ambiguous. Fallback messages (technical error, exhausted quota) are translated
too.

## Environment variables

Copy `.env.example` to `.env`, then fill in the keys.

| Variable | Required | Description |
| --- | --- | --- |
| `LLM_PROVIDER` | no | Force a provider: `gemini`, `groq` or `mock`. Empty = auto-detection. |
| `GEMINI_API_KEY` | no\* | Google Gemini key (primary provider): [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | no\* | Groq key: [console.groq.com](https://console.groq.com/keys). Used both as the fallback provider and to condense follow-up questions before retrieval. |
| `DATABASE_URL` | no | Neon PostgreSQL connection string (chat persistence) |
| `QDRANT_URL` | no | Qdrant instance URL (RAG vector store) |
| `QDRANT_API_KEY` | no | Qdrant key (required for Qdrant Cloud) |
| `GITHUB_TOKEN` | no | GitHub personal access token used by `npm run rag:index`. Only lifts the anonymous rate limit (60 → 5000 req/h); public data is readable without it. |
| `UPSTASH_REDIS_REST_URL` | no | Upstash Redis REST URL, enables rate limiting ([console.upstash.com](https://console.upstash.com)) |
| `UPSTASH_REDIS_REST_TOKEN` | no | Upstash Redis REST token |
| `ALLOWED_ORIGINS` | no | Additional allowed cross-origin origins (CSV) on top of same-origin. Default: production domain. |

\* If no LLM key is provided, the application falls back to the `MockProvider`
(pre-recorded answers).

### Multi-provider fallback

When both the Gemini **and** Groq keys are present, requests use a **Gemini →
Groq** fallback chain: if Gemini returns a transient error, quota exceeded
(HTTP 429) **or** model overloaded / temporarily unavailable (HTTP 503), before
a single token has been streamed, the system switches over to Groq in real time,
which has an independent free quota. Every new request restarts the chain at
Gemini, so returning to the primary provider is automatic as soon as it becomes
available again. If both providers are down, a fallback answer (`MockProvider`)
is served with a wait message.

Provider availability is exposed by `GET /api/llm/status` (one entry per active
provider). The interface no longer displays it: visitors do not need to know
which model answers.

### Generation parameters

Both providers share the same settings (`src/constants/llm.ts`), so an answer
reads the same whichever one served it:

- `LLM_TEMPERATURE` (0.6): left unset, Gemini 2.5 Flash generates at 1.0, which
  produces long, digressive answers and quietly overrides the persona's "2–4
  sentences" rule.
- `LLM_MAX_OUTPUT_TOKENS` (800): far above the target length, so it never cuts a
  normal answer, but it bounds runaway ones.
- `GEMINI_THINKING_BUDGET` (0): reasoning tokens count against
  `maxOutputTokens`. A portfolio conversation gains nothing from extended
  reasoning, so it is disabled: the output cap becomes safe and the first token
  arrives sooner.

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
- at most `MAX_HISTORY_CHARS` characters (~3000 tokens) on the tail, the oldest
  ones being truncated beyond that. This budget is a guard-rail against unusually
  long messages, not the effective cap: at 4000 characters, real-world answers of
  600–900 characters let only 4–5 messages through (two turns instead of the five
  `MAX_HISTORY_MESSAGES` aims for), and the thread was lost before the message
  count ever mattered;
- fallback answers (status `error`) are excluded, and the RAG context is **not**
  re-injected into the history so those tokens aren't paid for again every turn.

The caps and the anchor are configurable in
[`src/constants/llm.ts`](src/constants/llm.ts). Without a `sessionId` (first
message), the exchange stays "one-shot".

Memory alone does not keep a conversation on track, so the persona carries
explicit **continuity rules**: a follow-up is about the topic of the previous
turn, a technical term is never answered with a generic definition when a project
is being discussed, and a one-sentence clarifying question beats guessing. The
assistant only switches topic when the visitor introduces one.

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

- **Origin control (CORS)**: the proxy ([`src/proxy.ts`](src/proxy.ts)) rejects
  cross-site `POST` requests to `/api/chat` and `/api/feedback` with a `403` and
  handles the `OPTIONS` preflight ([`src/lib/cors.ts`](src/lib/cors.ts)).
  **Same-origin** is allowed automatically (dev/preview/prod, no config needed);
  extra origins are declared via `ALLOWED_ORIGINS`. This protects against
  cross-site browser abuse (scripted requests without an `Origin` header are
  still covered by rate limiting).
- **Per-IP rate limiting**: the Next.js proxy ([`src/proxy.ts`](src/proxy.ts),
  the Next 16 convention that replaces `middleware.ts`) limits `POST` requests to
  `/api/chat` and `/api/feedback` through an Upstash Redis sliding window. The
  thresholds are configurable in
  [`src/constants/rate-limit.ts`](src/constants/rate-limit.ts) (15 req/min for
  chat, 30 req/min for feedback). Without the `UPSTASH_*` variables, rate
  limiting **degrades gracefully** and turns itself off (local dev, mock mode, CI).
- **Identifier validation**: `messageId` (feedback) and `sessionId` (session
  read) must be valid **UUIDs**, rejected with a `400` before any DB query
  ([`src/lib/validation.ts`](src/lib/validation.ts)).
- **Input capping**: chat message limited to `MAX_MESSAGE_LENGTH` (500)
  characters, feedback comment to `MAX_FEEDBACK_COMMENT_LENGTH` (2000), and the
  buffered body size capped via `experimental.proxyClientMaxBodySize` (64 kB) in
  `next.config.ts`.
- **Prompt injection detection**: messages are analyzed
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
> [`vitest.config.ts`](vitest.config.ts): `hero-scene.tsx` (WebGL Canvas /
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

The required check is matched on the **job** name, not the workflow name: the
`CI /` prefix shown on a pull request is display only. Renaming a job therefore
leaves the branch protection rule waiting forever on a check nobody reports, until
the rule is updated to match.

There is deliberately no workflow running on plain branch pushes: it would
duplicate `ci.yml` on every push once a pull request is open, since GitHub fires
`push` and `pull_request` for the same commit. To get lint and tests on a work
branch, **open the pull request as a draft** from the first commit: `pull_request`
re-fires on every push, so `ci.yml` covers the whole life of the branch.

Required secrets (_Settings → Secrets and variables → Actions_): `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` for deployments, plus `QDRANT_URL` and
`QDRANT_API_KEY` for the keep-alive workflow.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Stack technique

- **Next.js 16** — framework React (App Router)
- **React 19** — UI
- **TypeScript 5** — typage statique
- **Tailwind CSS 4** — styles
- **shadcn/ui** — composants UI
- **react-markdown + remark-gfm** — rendu markdown des réponses du bot
- **@upstash/ratelimit + @upstash/redis** — rate limiting par IP (anti-spam)
- **Plus Jakarta Sans** — typographie principale (Google Fonts)
- **Lucide React** — icônes
- **Vitest** — tests unitaires (seuil de couverture : 95%)
- **Istanbul** (`@vitest/coverage-istanbul`) — rapport de couverture
- **@testing-library/react** — utilitaires de test React

## Installation

```bash
npm install
```

## Scripts disponibles

| Commande             | Description                                                     |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Lance le serveur de développement                              |
| `npm run build`      | Build de production                                            |
| `npm run start`      | Lance le serveur de production                                 |
| `npm run lint`       | Vérifie le code avec ESLint                                  |
| `npm run test`       | Lance les tests une fois avec coverage en console, puis quitte |
| `npm run test:watch` | Lance les tests en mode watch (surveillance des fichiers)   |
| `npm run test:ci`    | Lance les tests avec coverage (mode CI)                     |
| `npm run coverage`   | Génère le rapport de couverture dans `./coverage/`          |

## Architecture

```
src/
  app/              # Pages Next.js (App Router)
  components/
    features/       # Composants métier (AnimatedBackground, ChatInterface, MessageBubble)
    ui/             # Composants génériques (Button, Tooltip, ConfirmDialog)
  lib/              # Utilitaires partagés (utils, mock-responses)
  tests/            # Tests unitaires (miroir de src/)
```

## Variables d'environnement

Copier `.env.example` vers `.env` puis renseigner les clés.

| Variable         | Requis | Description                                                                                       |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `LLM_PROVIDER`   | non    | Force un provider : `gemini`, `groq` ou `mock`. Vide = auto-détection.                            |
| `GEMINI_API_KEY` | non\*  | Clé Google Gemini (provider primaire) — [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY`   | non\*  | Clé Groq (provider de secours) — [console.groq.com](https://console.groq.com/keys)                |
| `DATABASE_URL`   | non    | Connection string Neon PostgreSQL (persistance du chat)                                           |
| `QDRANT_URL`     | non    | URL de l'instance Qdrant (base vectorielle RAG)                                                   |
| `QDRANT_API_KEY` | non    | Clé Qdrant (requise pour Qdrant Cloud)                                                            |
| `UPSTASH_REDIS_REST_URL`   | non | URL REST Upstash Redis — active le rate limiting ([console.upstash.com](https://console.upstash.com)) |
| `UPSTASH_REDIS_REST_TOKEN` | non | Token REST Upstash Redis                                                                          |
| `ALLOWED_ORIGINS`          | non | Origines cross-origin autorisées (CSV) en plus du same-origin. Défaut : domaine de prod.          |

\* Si aucune clé LLM n'est fournie, l'application bascule sur le `MockProvider` (réponses pré-enregistrées).

### Fallback multi-provider

Quand les clés Gemini **et** Groq sont présentes, les requêtes utilisent une chaîne de fallback **Gemini → Groq** : si Gemini renvoie une erreur transitoire — quota atteint (HTTP 429) **ou** modèle surchargé / temporairement indisponible (HTTP 503) — avant d'avoir streamé le moindre token, le système bascule automatiquement et en temps réel sur Groq, qui dispose d'un quota gratuit indépendant. À chaque nouvelle requête, la chaîne repart de Gemini : le retour sur le provider primaire est donc automatique dès qu'il redevient disponible. Si les deux providers sont indisponibles, une réponse de repli (`MockProvider`) est servie avec un message d'attente.

Le header du chat affiche une **pastille de statut par provider actif** (point vert = disponible, point rouge = indisponible), selon la configuration : une seule pastille si un provider est forcé, les deux si la chaîne de fallback est active, aucune en mode mock. Le statut est exposé par `GET /api/llm/status` et rafraîchi après chaque réponse.

### Mémoire conversationnelle

Le bot garde le fil de la conversation : à chaque message, l'historique des tours précédents est **reconstruit côté serveur depuis la base** (à partir du `sessionId`), puis transmis au provider LLM. L'historique n'est donc pas renvoyé par le client à chaque requête, ce qui évite d'alourdir le payload réseau.

Pour maîtriser le coût en tokens, une stratégie **« tête + queue » bornée** est appliquée (`src/lib/llm/conversation-history.ts`) :

- au plus `MAX_HISTORY_MESSAGES` messages (10 ≈ 5 tours) ;
- une **ancre de début** de `HISTORY_ANCHOR_MESSAGES` messages (2 = le premier tour) est **toujours conservée**, en plus de la fenêtre récente : une fenêtre purement glissante oublierait le début de la conversation et casserait les questions méta du type « quelle était ma première question ? » (notamment après un reload où l'on accumule plus de messages) ;
- au plus `MAX_HISTORY_CHARS` caractères (~1000 tokens) sur la queue, les plus anciens étant tronqués au-delà ;
- les réponses de repli (statut `error`) sont exclues, et le contexte RAG n'est **pas** réinjecté dans l'historique pour ne pas re-payer ces tokens à chaque tour.

Les plafonds et l'ancre sont configurables dans `src/constants/llm.ts`. Sans `sessionId` (premier message), l'échange reste « one-shot ».

#### Détection de répétition

Avant chaque génération, le message courant est comparé à **toutes** les questions utilisateur précédentes (`src/lib/llm/repeated-question.ts`), et pas seulement à la fenêtre récente. La détection est **déterministe** et volontairement conservatrice (exacte / quasi-exacte après normalisation casse/accents/ponctuation, tolérance d'une faute de frappe via distance de Levenshtein) afin de garantir zéro faux positif. Si une question déjà posée est repérée, une **note interne non persistée** est injectée dans le prompt pour que l'assistant y fasse une référence subtile (et légèrement sarcastique) de façon fiable, tout en répondant. Les seuils sont configurables dans `src/constants/llm.ts` (`REPEATED_QUESTION_MAX_DISTANCE_RATIO`, `REPEATED_QUESTION_MIN_LENGTH`).

## Sécurité & anti-spam

Les routes API publiques étant exposées sans authentification, plusieurs garde-fous protègent les bases (Neon PostgreSQL, quota LLM) contre le spam automatisé :

- **Contrôle d'origine (CORS)** — le proxy ([`src/proxy.ts`](src/proxy.ts)) rejette en `403` les `POST` cross-site sur `/api/chat` et `/api/feedback` et gère le preflight `OPTIONS` ([`src/lib/cors.ts`](src/lib/cors.ts)). Le **same-origin** est autorisé automatiquement (dev/preview/prod, sans config) ; des origines supplémentaires se déclarent via `ALLOWED_ORIGINS`. Protège contre l'abus navigateur cross-site (les requêtes scriptées sans `Origin` restent couvertes par le rate limiting).
- **Rate limiting par IP** — le proxy Next.js ([`src/proxy.ts`](src/proxy.ts), convention Next 16 qui remplace `middleware.ts`) limite les requêtes `POST` sur `/api/chat` et `/api/feedback` via une fenêtre glissante Upstash Redis. Les seuils sont configurables dans [`src/constants/rate-limit.ts`](src/constants/rate-limit.ts) (15 req/min pour le chat, 30 req/min pour le feedback). En l'absence des variables `UPSTASH_*`, le rate limiting se **désactive proprement** (dev local, mode mock, CI).
- **Validation des identifiants** — `messageId` (feedback) et `sessionId` (lecture de session) doivent être des **UUID** valides, rejetés en `400` avant toute requête DB ([`src/lib/validation.ts`](src/lib/validation.ts)).
- **Plafonnement des entrées** — message du chat limité à `MAX_MESSAGE_LENGTH` (500) caractères, commentaire de feedback à `MAX_FEEDBACK_COMMENT_LENGTH` (2000), et taille du body bufferisé plafonnée via `experimental.proxyClientMaxBodySize` (64 ko) dans `next.config.ts`.
- **Détection de prompt injection** — les messages sont analysés ([`src/lib/sanitize-message.ts`](src/lib/sanitize-message.ts)) et taggés `[INJECTION DETECTED]` avant transmission au LLM.

> Les requêtes SQL passent toutes par Drizzle ORM (paramétrées) : pas d'injection SQL. Les clés/`DATABASE_URL` sont dans `.env` (gitignoré).

## Tests et couverture

Les tests sont écrits avec **Vitest** + **@testing-library/react**.  
La couverture est mesurée par **Istanbul** (`@vitest/coverage-istanbul`) et affichée directement en console après chaque `npm run test`. Le seuil est fixé à **95%** sur l'ensemble des métriques (lignes, fonctions, branches, instructions).

Le rapport HTML de couverture est aussi généré dans `./coverage/index.html` après `npm run test` ou `npm run coverage`.

> **Note :** `animated-background.tsx` est exclu de la couverture car il utilise l'API Canvas, non disponible dans jsdom.

### Intégration continue & déploiement

L'intégration continue et les déploiements Vercel sont répartis par événement sur trois workflows GitHub Actions (un workflow par déclencheur, afin d'éviter les checks « skipped » sur les PR) :

| Workflow | Déclencheur | Rôle |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | **pull request** vers `main` ou `develop` | Lint + tests, puis déploiement **preview** Vercel |
| [`deploy-develop.yml`](.github/workflows/deploy-develop.yml) | **push** sur `develop` | Lint + tests, puis déploiement sur l'environnement **`develop`** (`vercel deploy --target=develop`) |
| [`deploy-production.yml`](.github/workflows/deploy-production.yml) | **push** sur `main` | Lint + tests, puis déploiement **production** (`vercel deploy --prod`) |

Dans chaque workflow, le déploiement (`needs: test`) n'est exécuté **que si le lint et les tests passent** ; le job échoue si la couverture descend sous le seuil de **95%**. Le build est réalisé côté Vercel. Pour bloquer le merge sur `main`, activer la protection de branche (_Settings → Branches_) avec le check **« Lint & tests »** requis.

Secrets requis (_Settings → Secrets and variables → Actions_) : `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. L'environnement Vercel **`develop`** doit exister côté Vercel (_Project Settings → Environments_) pour que `--target=develop` cible le bon environnement.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

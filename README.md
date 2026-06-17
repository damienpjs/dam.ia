This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Stack technique

- **Next.js 16** — framework React (App Router)
- **React 19** — UI
- **TypeScript 5** — typage statique
- **Tailwind CSS 4** — styles
- **shadcn/ui** — composants UI
- **Plus Jakarta Sans** — typographie principale (Google Fonts)
- **Lucide React** — icônes
- **Vitest** — tests unitaires (seuil de couverture : 95%)
- **@testing-library/react** — utilitaires de test React

## Installation

```bash
npm install
```

## Scripts disponibles

| Commande           | Description                                        |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Lance le serveur de développement                  |
| `npm run build`    | Build de production                                |
| `npm run start`    | Lance le serveur de production                     |
| `npm run lint`     | Vérifie le code avec ESLint                        |
| `npm run test`     | Lance les tests en mode watch                      |
| `npm run test:ci`  | Lance les tests avec coverage (mode CI)            |
| `npm run coverage` | Génère le rapport de couverture dans `./coverage/` |

## Architecture

```
src/
  app/              # Pages Next.js (App Router)
  components/
    features/       # Composants métier (AnimatedBackground, ChatInterface, MessageBubble)
    ui/             # Composants génériques (Button)
  lib/              # Utilitaires partagés (utils, mock-responses)
  tests/            # Tests unitaires (miroir de src/)
```

## Variables d'environnement

Copier `.env.example` vers `.env` puis renseigner les clés.

| Variable         | Requis | Description                                                                 |
| ---------------- | ------ | --------------------------------------------------------------------------- |
| `LLM_PROVIDER`   | non    | Force un provider : `gemini`, `groq` ou `mock`. Vide = auto-détection.      |
| `GEMINI_API_KEY` | non\*  | Clé Google Gemini (provider primaire) — [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY`   | non\*  | Clé Groq (provider de secours) — [console.groq.com](https://console.groq.com/keys) |
| `DATABASE_URL`   | non    | Connection string Neon PostgreSQL (persistance du chat)                     |
| `QDRANT_URL`     | non    | URL de l'instance Qdrant (base vectorielle RAG)                             |
| `QDRANT_API_KEY` | non    | Clé Qdrant (requise pour Qdrant Cloud)                                       |

\* Si aucune clé LLM n'est fournie, l'application bascule sur le `MockProvider` (réponses pré-enregistrées).

### Fallback multi-provider

Quand les clés Gemini **et** Groq sont présentes, les requêtes utilisent une chaîne de fallback **Gemini → Groq** : si le quota de Gemini est atteint (HTTP 429), le système bascule automatiquement et en temps réel sur Groq, qui dispose d'un quota gratuit indépendant. Si les deux quotas sont épuisés, une réponse de repli (`MockProvider`) est servie avec un message d'attente.

Le header du chat affiche une **pastille de statut par provider actif** (point vert = opérationnel, point ambre = quota atteint), selon la configuration : une seule pastille si un provider est forcé, les deux si la chaîne de fallback est active, aucune en mode mock. Le statut est exposé par `GET /api/llm/status` et rafraîchi après chaque réponse.

## Tests et couverture

Les tests sont écrits avec **Vitest** + **@testing-library/react**.  
Le seuil de couverture est fixé à **95%** sur l'ensemble des métriques (lignes, fonctions, branches, instructions).

Le rapport HTML de couverture est généré dans `./coverage/index.html` après `npm run coverage`.

> **Note :** `animated-background.tsx` est exclu de la couverture car il utilise l'API Canvas, non disponible dans jsdom.

### Intégration continue

Un workflow GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) exécute le lint et les tests unitaires :

- à **chaque push** sur n'importe quelle branche de travail ;
- sur chaque **pull request** vers `main` ou `develop`.

Le job échoue si le lint ou les tests échouent, ou si la couverture descend sous le seuil de **95%**. Pour bloquer le merge sur `main`, activer la protection de branche (*Settings → Branches*) avec le check **« Lint & tests »** requis.

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

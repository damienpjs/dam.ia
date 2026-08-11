import path from "path"

export const EMBEDDING_MODEL = "gemini-embedding-001"

// Dimension des vecteurs produits par gemini-embedding-001
export const EMBEDDING_DIMENSION = 3072

export const COLLECTION_NAME = "damia_content"

export const DEFAULT_TOP_K = 7

// Score de similarité cosinus minimal pour qu'un chunk soit injecté dans le prompt.
// Sans seuil, la recherche remontait TOUJOURS ses 7 meilleurs résultats, même à 20 %
// de pertinence : sur une question hors-sujet, le LLM recevait du bruit présenté
// comme des faits avérés et construisait sa réponse dessus — d'où les changements
// de sujet en cours de conversation. Valeur à recalibrer sur les scores loggués par
// la route de chat si le contexte devient trop rare (trop haut) ou trop bruité (trop bas).
export const MIN_RELEVANCE_SCORE = 0.55

// --- Condensation de la question (RAG conversationnel) ---

// Nombre de mots en-dessous duquel un message est considéré comme potentiellement
// dépendant du contexte. Une question courte s'appuie presque toujours sur ce qui
// précède (« et le backend ? ») et son embedding, pris isolément, ne contient aucune
// trace du sujet en cours.
export const FOLLOW_UP_MAX_WORDS = 8

// Nombre de messages d'historique transmis au condenseur. 4 = les deux derniers
// tours : assez pour résoudre un pronom, assez court pour rester rapide et cadré.
export const CONDENSE_HISTORY_MESSAGES = 4

// Modèle utilisé pour la réécriture. Le plus petit et le plus rapide de Groq :
// la tâche est mécanique (résoudre une référence), pas besoin de plus gros.
export const CONDENSE_MODEL = "llama-3.1-8b-instant"

// La réécriture s'intercale avant la recherche vectorielle, donc avant le premier
// token affiché : un timeout serré vaut mieux qu'une attente visible. En cas de
// dépassement on retombe sur la concaténation heuristique.
export const CONDENSE_TIMEOUT_MS = 3_000

// Une question autonome tient largement dans 80 tokens.
export const CONDENSE_MAX_TOKENS = 80

// Garde-fou sur la sortie du condenseur : au-delà, le modèle a manifestement
// répondu à la question au lieu de la réécrire → on ignore sa sortie.
export const CONDENSE_MAX_OUTPUT_CHARS = 300

// Taille cible d'un chunk en caractères : assez grand pour le contexte, assez petit pour les embeddings
export const CHUNK_SIZE = 500

// Chevauchement entre chunks pour ne pas perdre de contexte aux frontières
export const CHUNK_OVERLAP = 50

export const CONTENT_DIR = path.join(process.cwd(), "content")

// --- Indexation GitHub ---

export const GITHUB_API_URL = "https://api.github.com"

export const GITHUB_API_VERSION = "2022-11-28"

export const GITHUB_TIMEOUT_MS = 15_000

// Nombre de dépôts récupérés en une page. L'API plafonne à 100, ce qui couvre
// largement un profil personnel : pas de pagination à gérer.
export const GITHUB_REPOS_PER_PAGE = 100

// Plafond de caractères conservés par README. Empêche qu'un projet très documenté
// écrase tous les autres contenus indexés lors de la recherche vectorielle : à
// 8000 caractères, les seuls dépôts pesaient deux tiers de l'index. 3000 conserve
// l'en-tête utile (pitch, fonctionnalités, stack) et coupe avant les sections
// installation/contribution, qui n'apprennent rien sur le parcours.
export const GITHUB_MAX_README_CHARS = 3000

// Nombre de langages listés par dépôt (les plus représentés en volume de code)
export const GITHUB_MAX_LANGUAGES = 5

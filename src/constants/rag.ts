import path from "path"

export const EMBEDDING_MODEL = "gemini-embedding-001"

// Dimension des vecteurs produits par gemini-embedding-001
export const EMBEDDING_DIMENSION = 3072

export const COLLECTION_NAME = "damia_content"

export const DEFAULT_TOP_K = 7

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

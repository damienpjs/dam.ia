import path from "path"

export const EMBEDDING_MODEL = "gemini-embedding-001"

// Dimension des vecteurs produits par gemini-embedding-001
export const EMBEDDING_DIMENSION = 3072

export const COLLECTION_NAME = "damia_content"

export const DEFAULT_TOP_K = 5

// Taille cible d'un chunk en caractères : assez grand pour le contexte, assez petit pour les embeddings
export const CHUNK_SIZE = 500

// Chevauchement entre chunks pour ne pas perdre de contexte aux frontières
export const CHUNK_OVERLAP = 50

export const CONTENT_DIR = path.join(process.cwd(), "content")

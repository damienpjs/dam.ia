import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * Modèle d'embedding Gemini utilisé
 */
export const EMBEDDING_MODEL = "gemini-embedding-001"

/**
 * Dimension des vecteurs produits par gemini-embedding-001
 */
export const EMBEDDING_DIMENSION = 3072

/**
 * Crée un client d'embeddings Gemini.
 */
function getEmbeddingModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
}

/**
 * Génère l'embedding d'un texte unique via l'API Gemini.
 *
 * @param text - Texte à encoder
 * @param apiKey - Clé API Gemini
 * @returns Vecteur d'embedding (768 dimensions)
 */
export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const model = getEmbeddingModel(apiKey)
  const result = await model.embedContent(text)
  return result.embedding.values
}

/**
 * Génère les embeddings pour un batch de textes.
 * Traite séquentiellement pour respecter les rate limits.
 *
 * @param texts - Liste de textes à encoder
 * @param apiKey - Clé API Gemini
 * @returns Liste de vecteurs d'embeddings
 */
export async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const model = getEmbeddingModel(apiKey)
  const embeddings: number[][] = []

  for (const text of texts) {
    const result = await model.embedContent(text)
    embeddings.push(result.embedding.values)
  }

  return embeddings
}

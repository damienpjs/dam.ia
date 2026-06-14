import type { ISearchResult } from "./types"
import { embedText } from "./embeddings"
import { createQdrantClient, searchSimilarChunks, DEFAULT_TOP_K } from "./qdrant"

/**
 * Recherche les chunks les plus pertinents pour une question utilisateur.
 *
 * Pipeline :
 * 1. Embedding de la question via Gemini
 * 2. Recherche vectorielle dans Qdrant
 * 3. Retour des top K résultats
 *
 * @param query - Question de l'utilisateur
 * @param topK - Nombre de chunks à retourner (défaut: 5)
 * @returns Liste des chunks les plus pertinents avec scores
 */
export async function retrieveRelevantChunks(query: string, topK: number = DEFAULT_TOP_K): Promise<ISearchResult[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for RAG embeddings")
  }

  const queryVector = await embedText(query, apiKey)
  const client = createQdrantClient()
  return searchSimilarChunks(client, queryVector, topK)
}

/**
 * Formate les résultats RAG en contexte injectable dans le prompt Gemini.
 *
 * @param results - Résultats de la recherche vectorielle
 * @returns Chaîne de contexte formatée pour le LLM
 */
export function formatRAGContext(results: ISearchResult[]): string {
  if (results.length === 0) {
    return ""
  }

  const formattedChunks = results.map((r, i) => `[Source: ${r.source} | Pertinence: ${(r.score * 100).toFixed(0)}%]\n${r.text}`).join("\n\n---\n\n")

  return `

=== CONTEXTE RAG (extraits les plus pertinents) ===
${formattedChunks}
=== FIN CONTEXTE RAG ===
`
}

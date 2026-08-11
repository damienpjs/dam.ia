import type { ISearchResult } from "./types"
import { embedText } from "./embeddings"
import { createQdrantClient, searchSimilarChunks, DEFAULT_TOP_K, MIN_RELEVANCE_SCORE } from "./qdrant"

/**
 * Recherche les chunks les plus pertinents pour une question utilisateur.
 *
 * Pipeline :
 * 1. Embedding de la question via Gemini
 * 2. Recherche vectorielle dans Qdrant, sous seuil de pertinence
 * 3. Retour des top K résultats (liste vide si aucun ne franchit le seuil)
 *
 * La question passée ici doit être AUTONOME : sur une question de suivi, embedder
 * le message brut du visiteur produit un vecteur qui ne porte pas le sujet en cours.
 * Voir `condenseQuery` dans `./condense-query`.
 *
 * @param query - Question de l'utilisateur, condensée au préalable si nécessaire
 * @param topK - Nombre maximum de chunks à retourner
 * @param minScore - Score de similarité minimal
 * @returns Liste des chunks les plus pertinents avec scores, éventuellement vide
 */
export async function retrieveRelevantChunks(query: string, topK: number = DEFAULT_TOP_K, minScore: number = MIN_RELEVANCE_SCORE): Promise<ISearchResult[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for RAG embeddings")
  }

  const queryVector = await embedText(query, apiKey)
  const client = createQdrantClient()
  return searchSimilarChunks(client, queryVector, topK, minScore)
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

  const formattedChunks = results.map((r) => `[Source: ${r.source} | Pertinence: ${(r.score * 100).toFixed(0)}%]\n${r.text}`).join("\n\n---\n\n")

  return `

=== CONTEXTE RAG (extraits les plus pertinents) ===
${formattedChunks}
=== FIN CONTEXTE RAG ===
`
}

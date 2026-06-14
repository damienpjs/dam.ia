import { QdrantClient } from "@qdrant/js-client-rest"
import type { IContentChunk, ISearchResult } from "./types"
import { EMBEDDING_DIMENSION } from "./embeddings"

/**
 * Nom de la collection Qdrant pour les chunks de contenu
 */
export const COLLECTION_NAME = "damia_content"

/**
 * Nombre de résultats par défaut pour la recherche
 */
export const DEFAULT_TOP_K = 5

/**
 * Crée un client Qdrant configuré via les variables d'environnement.
 */
export function createQdrantClient(): QdrantClient {
  const url = process.env.QDRANT_URL
  const apiKey = process.env.QDRANT_API_KEY

  if (!url) {
    throw new Error("QDRANT_URL is not defined. Please set it in your .env.local file.")
  }

  return new QdrantClient({ url, apiKey })
}

/**
 * Crée la collection Qdrant si elle n'existe pas.
 */
export async function ensureCollection(client: QdrantClient): Promise<void> {
  const collections = await client.getCollections()
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)

  if (!exists) {
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: "Cosine",
      },
    })
  }
}

/**
 * Indexe des chunks avec leurs embeddings dans Qdrant.
 * Remplace la collection existante (upsert).
 *
 * @param client - Client Qdrant
 * @param chunks - Chunks de contenu à indexer
 * @param embeddings - Vecteurs d'embeddings correspondants
 */
export async function indexChunks(client: QdrantClient, chunks: IContentChunk[], embeddings: number[][]): Promise<void> {
  await ensureCollection(client)

  const points = chunks.map((chunk, i) => ({
    id: i,
    vector: embeddings[i],
    payload: {
      text: chunk.text,
      source: chunk.source,
      chunkId: chunk.id,
      metadata: chunk.metadata,
    },
  }))

  // Upsert par batches de 100
  const batchSize = 100
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize)
    await client.upsert(COLLECTION_NAME, { points: batch })
  }
}

/**
 * Recherche les chunks les plus similaires à un vecteur de requête.
 *
 * @param client - Client Qdrant
 * @param queryVector - Vecteur d'embedding de la requête
 * @param topK - Nombre de résultats (défaut: 5)
 * @returns Liste des résultats triés par score de similarité
 */
export async function searchSimilarChunks(client: QdrantClient, queryVector: number[], topK: number = DEFAULT_TOP_K): Promise<ISearchResult[]> {
  const results = await client.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  })

  return results.map((result) => ({
    text: (result.payload?.text as string) ?? "",
    source: (result.payload?.source as string) ?? "",
    score: result.score,
  }))
}

import { QdrantClient } from "@qdrant/js-client-rest"
import { createHash } from "crypto"
import type { IContentChunk, ISearchResult } from "./types"
import { EMBEDDING_DIMENSION, COLLECTION_NAME, DEFAULT_TOP_K, MIN_RELEVANCE_SCORE } from "@/constants/rag"

export { COLLECTION_NAME, DEFAULT_TOP_K, MIN_RELEVANCE_SCORE }

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
 * Supprime puis recrée la collection, pour repartir d'un index vide.
 *
 * Le script d'indexation reconstruit la totalité du contenu à chaque exécution :
 * sans purge, les points d'une source retirée entre deux runs resteraient dans la
 * collection et continueraient de remonter dans les recherches, invisibles.
 */
export async function resetCollection(client: QdrantClient): Promise<void> {
  const collections = await client.getCollections()
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)

  if (exists) {
    await client.deleteCollection(COLLECTION_NAME)
  }

  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_DIMENSION,
      distance: "Cosine",
    },
  })
}

/**
 * Convertit l'identifiant textuel d'un chunk en UUID déterministe.
 *
 * Qdrant n'accepte que des entiers non signés ou des UUID comme identifiants de
 * point. On dérive donc l'UUID du hash de `chunk.id`, lui-même déjà déterministe :
 * un même contenu retombe ainsi toujours sur le même point d'une indexation à
 * l'autre, là où un index positionnel réattribuait les identifiants dès que
 * l'ordre ou le nombre de chunks changeait.
 */
export function chunkIdToPointId(chunkId: string): string {
  const bytes = createHash("sha1").update(chunkId).digest().subarray(0, 16)

  // Marqueurs de version 5 et de variante RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * Indexe des chunks avec leurs embeddings dans Qdrant.
 *
 * @param client - Client Qdrant
 * @param chunks - Chunks de contenu à indexer
 * @param embeddings - Vecteurs d'embeddings correspondants
 */
export async function indexChunks(client: QdrantClient, chunks: IContentChunk[], embeddings: number[][]): Promise<void> {
  await ensureCollection(client)

  const points = chunks.map((chunk, i) => ({
    id: chunkIdToPointId(chunk.id),
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
 * Le seuil de score est essentiel : sans lui, `limit` seul garantit qu'une question
 * hors-sujet remonte quand même ses `topK` « meilleurs » chunks, aussi mauvais
 * soient-ils. Ce contexte de remplissage est ensuite présenté au LLM comme faisant
 * autorité, et le pousse à répondre à côté. Mieux vaut zéro chunk que du bruit.
 *
 * @param client - Client Qdrant
 * @param queryVector - Vecteur d'embedding de la requête
 * @param topK - Nombre maximum de résultats
 * @param minScore - Score de similarité minimal ; en-dessous, le chunk est écarté
 * @returns Liste des résultats triés par score de similarité, éventuellement vide
 */
export async function searchSimilarChunks(client: QdrantClient, queryVector: number[], topK: number = DEFAULT_TOP_K, minScore: number = MIN_RELEVANCE_SCORE): Promise<ISearchResult[]> {
  const results = await client.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    score_threshold: minScore,
    with_payload: true,
  })

  return results.map((result) => ({
    text: (result.payload?.text as string) ?? "",
    source: (result.payload?.source as string) ?? "",
    score: result.score,
    metadata: (result.payload?.metadata as Record<string, unknown>) ?? undefined,
  }))
}

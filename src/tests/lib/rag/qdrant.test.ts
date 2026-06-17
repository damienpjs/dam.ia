import { describe, it, expect, vi, beforeEach } from "vitest"
import { COLLECTION_NAME, DEFAULT_TOP_K } from "@/lib/rag/qdrant"

describe("Qdrant constants", () => {
  it("doit avoir le bon nom de collection", () => {
    expect(COLLECTION_NAME).toBe("damia_content")
  })

  it("doit retourner 5 résultats par défaut", () => {
    expect(DEFAULT_TOP_K).toBe(5)
  })
})

describe("createQdrantClient", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("doit throw si QDRANT_URL n'est pas définie", async () => {
    vi.stubEnv("QDRANT_URL", "")

    const { createQdrantClient } = await import("@/lib/rag/qdrant")

    expect(() => createQdrantClient()).toThrow("QDRANT_URL is not defined")
  })

  it("doit créer un client quand QDRANT_URL est définie", async () => {
    vi.stubEnv("QDRANT_URL", "http://localhost:6333")

    const { createQdrantClient } = await import("@/lib/rag/qdrant")
    const client = createQdrantClient()

    expect(client).toBeDefined()
  })
})

describe("ensureCollection", () => {
  it("doit créer la collection si elle n'existe pas", async () => {
    const mockClient = {
      getCollections: vi.fn().mockResolvedValue({ collections: [] }),
      createCollection: vi.fn().mockResolvedValue(undefined),
    }

    const { ensureCollection } = await import("@/lib/rag/qdrant")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ensureCollection(mockClient as any)

    expect(mockClient.createCollection).toHaveBeenCalledWith(COLLECTION_NAME, {
      vectors: { size: 3072, distance: "Cosine" },
    })
  })

  it("ne doit pas recréer la collection si elle existe déjà", async () => {
    const mockClient = {
      getCollections: vi.fn().mockResolvedValue({
        collections: [{ name: COLLECTION_NAME }],
      }),
      createCollection: vi.fn(),
    }

    const { ensureCollection } = await import("@/lib/rag/qdrant")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ensureCollection(mockClient as any)

    expect(mockClient.createCollection).not.toHaveBeenCalled()
  })
})

describe("indexChunks", () => {
  it("doit upserter les chunks avec leurs embeddings", async () => {
    const mockClient = {
      getCollections: vi.fn().mockResolvedValue({
        collections: [{ name: COLLECTION_NAME }],
      }),
      createCollection: vi.fn(),
      upsert: vi.fn().mockResolvedValue(undefined),
    }
    const chunks = [
      { id: "chunk-1", source: "cv", text: "Mon parcours", metadata: {} },
      { id: "chunk-2", source: "profil", text: "Mon profil", metadata: {} },
    ]
    const embeddings = [
      [0.1, 0.2],
      [0.3, 0.4],
    ]

    const { indexChunks } = await import("@/lib/rag/qdrant")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await indexChunks(mockClient as any, chunks, embeddings)

    expect(mockClient.upsert).toHaveBeenCalledWith(COLLECTION_NAME, {
      points: expect.arrayContaining([
        expect.objectContaining({ id: 0, vector: [0.1, 0.2], payload: expect.objectContaining({ text: "Mon parcours" }) }),
        expect.objectContaining({ id: 1, vector: [0.3, 0.4], payload: expect.objectContaining({ text: "Mon profil" }) }),
      ]),
    })
  })

  it("doit upserter par batches de 100", async () => {
    const mockClient = {
      getCollections: vi.fn().mockResolvedValue({
        collections: [{ name: COLLECTION_NAME }],
      }),
      createCollection: vi.fn(),
      upsert: vi.fn().mockResolvedValue(undefined),
    }
    // 150 chunks → 2 batches (100 + 50)
    const chunks = Array.from({ length: 150 }, (_, i) => ({
      id: `chunk-${i}`,
      source: "cv",
      text: `Chunk ${i}`,
      metadata: {},
    }))
    const embeddings = Array.from({ length: 150 }, () => [0.1])

    const { indexChunks } = await import("@/lib/rag/qdrant")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await indexChunks(mockClient as any, chunks, embeddings)

    expect(mockClient.upsert).toHaveBeenCalledTimes(2)
  })
})

describe("searchSimilarChunks", () => {
  it("doit retourner les résultats formatés", async () => {
    const mockClient = {
      search: vi.fn().mockResolvedValue([
        { payload: { text: "Chunk 1", source: "cv", metadata: { sourceUrl: "/cv.pdf" } }, score: 0.95 },
        { payload: { text: "Chunk 2", source: "profil", metadata: { sourceLabel: "CV (PDF)" } }, score: 0.8 },
      ]),
    }

    const { searchSimilarChunks } = await import("@/lib/rag/qdrant")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await searchSimilarChunks(mockClient as any, [0.1], 5)

    expect(results).toEqual([
      { text: "Chunk 1", source: "cv", score: 0.95, metadata: { sourceUrl: "/cv.pdf" } },
      { text: "Chunk 2", source: "profil", score: 0.8, metadata: { sourceLabel: "CV (PDF)" } },
    ])
    expect(mockClient.search).toHaveBeenCalledWith(COLLECTION_NAME, {
      vector: [0.1],
      limit: 5,
      with_payload: true,
    })
  })

  it("doit gérer les payloads manquants", async () => {
    const mockClient = {
      search: vi.fn().mockResolvedValue([{ payload: null, score: 0.5 }]),
    }

    const { searchSimilarChunks } = await import("@/lib/rag/qdrant")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await searchSimilarChunks(mockClient as any, [0.1], 3)

    expect(results).toEqual([{ text: "", source: "", score: 0.5, metadata: undefined }])
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { formatRAGContext } from "@/lib/rag/pipeline"
import type { ISearchResult } from "@/lib/rag/types"

vi.mock("@/lib/rag/embeddings", () => ({
  embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}))

vi.mock("@/lib/rag/qdrant", () => ({
  createQdrantClient: vi.fn(() => ({})),
  searchSimilarChunks: vi.fn().mockResolvedValue([{ text: "chunk1", source: "cv", score: 0.9 }]),
  DEFAULT_TOP_K: 5,
  MIN_RELEVANCE_SCORE: 0.55,
}))

describe("retrieveRelevantChunks", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("doit throw si GEMINI_API_KEY n'est pas définie", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")

    const { retrieveRelevantChunks } = await import("@/lib/rag/pipeline")

    await expect(retrieveRelevantChunks("test")).rejects.toThrow("GEMINI_API_KEY is required")
  })

  it("doit retourner les chunks pertinents quand la clé est définie", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key")

    const { retrieveRelevantChunks } = await import("@/lib/rag/pipeline")
    const results = await retrieveRelevantChunks("question")

    expect(results).toHaveLength(1)
    expect(results[0].source).toBe("cv")
  })

  it("doit transmettre le seuil de pertinence à la recherche vectorielle", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key")

    const { retrieveRelevantChunks } = await import("@/lib/rag/pipeline")
    const { searchSimilarChunks } = await import("@/lib/rag/qdrant")

    await retrieveRelevantChunks("question", 3, 0.8)

    expect(searchSimilarChunks).toHaveBeenCalledWith(expect.anything(), expect.any(Array), 3, 0.8)
  })

  it("doit retourner une liste vide si aucun chunk ne franchit le seuil", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key")

    const { retrieveRelevantChunks } = await import("@/lib/rag/pipeline")
    const { searchSimilarChunks } = await import("@/lib/rag/qdrant")
    vi.mocked(searchSimilarChunks).mockResolvedValueOnce([])

    expect(await retrieveRelevantChunks("question hors sujet")).toEqual([])
  })
})

describe("formatRAGContext", () => {
  it("doit retourner une chaîne vide si pas de résultats", () => {
    expect(formatRAGContext([])).toBe("")
  })

  it("doit formater les résultats avec source et score", () => {
    const results: ISearchResult[] = [
      { text: "Chunk 1 contenu", source: "experience-apizee", score: 0.95 },
      { text: "Chunk 2 contenu", source: "competences-techniques", score: 0.87 },
    ]

    const formatted = formatRAGContext(results)

    expect(formatted).toContain("CONTEXTE RAG")
    expect(formatted).toContain("experience-apizee")
    expect(formatted).toContain("competences-techniques")
    expect(formatted).toContain("Chunk 1 contenu")
    expect(formatted).toContain("Chunk 2 contenu")
    expect(formatted).toContain("95%")
    expect(formatted).toContain("87%")
  })

  it("doit contenir des délimiteurs clairs", () => {
    const results: ISearchResult[] = [{ text: "Du texte", source: "cv", score: 0.9 }]

    const formatted = formatRAGContext(results)

    expect(formatted).toContain("=== CONTEXTE RAG")
    expect(formatted).toContain("=== FIN CONTEXTE RAG ===")
  })
})

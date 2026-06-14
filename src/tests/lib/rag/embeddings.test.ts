import { describe, it, expect, vi, beforeEach } from "vitest"
import { EMBEDDING_MODEL, EMBEDDING_DIMENSION } from "@/lib/rag/embeddings"

const mockEmbedContent = vi.fn()

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { embedContent: mockEmbedContent }
      }
    },
  }
})

describe("Embeddings constants", () => {
  it("doit utiliser gemini-embedding-001", () => {
    expect(EMBEDDING_MODEL).toBe("gemini-embedding-001")
  })

  it("doit avoir une dimension de 3072", () => {
    expect(EMBEDDING_DIMENSION).toBe(3072)
  })
})

describe("embedText", () => {
  beforeEach(() => {
    mockEmbedContent.mockClear()
  })

  it("doit retourner le vecteur d'embedding pour un texte", async () => {
    const fakeVector = [0.1, 0.2, 0.3]
    mockEmbedContent.mockResolvedValueOnce({ embedding: { values: fakeVector } })

    const { embedText } = await import("@/lib/rag/embeddings")
    const result = await embedText("hello", "fake-api-key")

    expect(result).toEqual(fakeVector)
    expect(mockEmbedContent).toHaveBeenCalledWith("hello")
  })
})

describe("embedTexts", () => {
  beforeEach(() => {
    mockEmbedContent.mockClear()
  })

  it("doit retourner les vecteurs pour un batch de textes", async () => {
    const vectors = [
      [0.1, 0.2],
      [0.3, 0.4],
    ]
    mockEmbedContent.mockResolvedValueOnce({ embedding: { values: vectors[0] } })
    mockEmbedContent.mockResolvedValueOnce({ embedding: { values: vectors[1] } })

    const { embedTexts } = await import("@/lib/rag/embeddings")
    const result = await embedTexts(["text1", "text2"], "fake-api-key")

    expect(result).toEqual(vectors)
    expect(mockEmbedContent).toHaveBeenCalledTimes(2)
  })
})

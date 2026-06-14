import { describe, it, expect } from "vitest"
import { EMBEDDING_MODEL, EMBEDDING_DIMENSION } from "@/lib/rag/embeddings"

describe("Embeddings constants", () => {
  it("doit utiliser gemini-embedding-001", () => {
    expect(EMBEDDING_MODEL).toBe("gemini-embedding-001")
  })

  it("doit avoir une dimension de 3072", () => {
    expect(EMBEDDING_DIMENSION).toBe(3072)
  })
})

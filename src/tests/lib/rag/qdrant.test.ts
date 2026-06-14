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
  })

  it("doit throw si QDRANT_URL n'est pas définie", async () => {
    vi.stubEnv("QDRANT_URL", "")

    const { createQdrantClient } = await import("@/lib/rag/qdrant")

    expect(() => createQdrantClient()).toThrow("QDRANT_URL is not defined")

    vi.unstubAllEnvs()
  })
})

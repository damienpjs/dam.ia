import { describe, it, expect } from "vitest"
import { formatRAGContext } from "@/lib/rag/pipeline"
import type { ISearchResult } from "@/lib/rag/types"

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

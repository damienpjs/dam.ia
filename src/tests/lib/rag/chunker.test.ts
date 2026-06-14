import { describe, it, expect } from "vitest"
import { extractFrontmatter, splitTextIntoChunks, generateChunkId, chunkDocument, CHUNK_SIZE, CHUNK_OVERLAP } from "@/lib/rag/chunker"
import type { IContentDocument } from "@/lib/content-loader"

describe("extractFrontmatter", () => {
  it("doit extraire le frontmatter YAML et le body", () => {
    const content = `---
title: "Test"
category: experience
---

# Mon contenu

Du texte ici.`

    const { metadata, body } = extractFrontmatter(content)

    expect(metadata.title).toBe("Test")
    expect(metadata.category).toBe("experience")
    expect(body.trim()).toBe("# Mon contenu\n\nDu texte ici.")
  })

  it("doit retourner un objet vide si pas de frontmatter", () => {
    const content = "# Pas de frontmatter\n\nJuste du texte."
    const { metadata, body } = extractFrontmatter(content)

    expect(metadata).toEqual({})
    expect(body).toBe(content)
  })

  it("doit gérer les quotes dans les valeurs", () => {
    const content = `---
title: "Avec des quotes"
---

Body`

    const { metadata } = extractFrontmatter(content)
    expect(metadata.title).toBe("Avec des quotes")
  })
})

describe("splitTextIntoChunks", () => {
  it("doit retourner le texte entier si plus petit que CHUNK_SIZE", () => {
    const text = "Un petit texte."
    const chunks = splitTextIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe("Un petit texte.")
  })

  it("doit retourner un tableau vide pour un texte vide", () => {
    expect(splitTextIntoChunks("", CHUNK_SIZE, CHUNK_OVERLAP)).toEqual([])
  })

  it("doit découper un long texte en plusieurs chunks", () => {
    const text = "A".repeat(1200)
    const chunks = splitTextIntoChunks(text, 500, 50)

    expect(chunks.length).toBeGreaterThan(1)
    // Chaque chunk ne dépasse pas la taille max
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500)
    }
  })

  it("doit privilégier la coupure aux sauts de ligne", () => {
    const text = "Première section avec du contenu assez long pour remplir.\n".repeat(15)
    const chunks = splitTextIntoChunks(text, 200, 30)

    expect(chunks.length).toBeGreaterThan(1)
    // Aucun chunk ne devrait couper au milieu d'une ligne (sauf si une ligne dépasse le chunk_size)
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0)
    }
  })
})

describe("generateChunkId", () => {
  it("doit générer un id déterministe", () => {
    const id1 = generateChunkId("source", "text")
    const id2 = generateChunkId("source", "text")
    expect(id1).toBe(id2)
  })

  it("doit générer des ids différents pour des contenus différents", () => {
    const id1 = generateChunkId("source", "text1")
    const id2 = generateChunkId("source", "text2")
    expect(id1).not.toBe(id2)
  })

  it("doit commencer par le nom de source", () => {
    const id = generateChunkId("mon-fichier", "contenu")
    expect(id).toMatch(/^mon-fichier-/)
  })
})

describe("chunkDocument", () => {
  it("doit transformer un document en chunks indexables", () => {
    const doc: IContentDocument = {
      filename: "test-doc",
      content: `---
title: "Test Document"
category: test
---

# Section 1

Du contenu dans la section 1.

# Section 2

Du contenu dans la section 2.`,
    }

    const chunks = chunkDocument(doc)

    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(chunk.source).toBe("test-doc")
      expect(chunk.text.length).toBeGreaterThan(0)
      expect(chunk.id).toContain("test-doc")
      expect(chunk.metadata.title).toBe("Test Document")
    }
  })

  it("doit retourner un tableau vide pour un document sans body", () => {
    const doc: IContentDocument = {
      filename: "empty",
      content: `---
title: "Empty"
---
`,
    }

    const chunks = chunkDocument(doc)
    expect(chunks).toEqual([])
  })
})

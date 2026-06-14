import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs"
import { loadContentDocuments, formatContentForPrompt, loadFormattedContent, type IContentDocument } from "@/lib/content-loader"

describe("content-loader", () => {
  const mockContentDir = "/mock/content"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("loadContentDocuments", () => {
    it("devrait retourner un tableau vide si le dossier n'existe pas", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false)

      const result = loadContentDocuments(mockContentDir)

      expect(result).toEqual([])
      expect(fs.existsSync).toHaveBeenCalledWith(mockContentDir)
    })

    it("devrait charger uniquement les fichiers .md", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true)
      vi.spyOn(fs, "readdirSync").mockReturnValue(["doc1.md", "doc2.md", "image.png", "config.json"] as unknown as fs.Dirent[])
      vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
        if (String(filePath).includes("doc1")) return "Contenu doc1"
        if (String(filePath).includes("doc2")) return "Contenu doc2"
        return ""
      })

      const result = loadContentDocuments(mockContentDir)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ filename: "doc1", content: "Contenu doc1" })
      expect(result[1]).toEqual({ filename: "doc2", content: "Contenu doc2" })
    })

    it("devrait retourner un tableau vide si aucun fichier .md n'est présent", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true)
      vi.spyOn(fs, "readdirSync").mockReturnValue(["image.png", "config.json"] as unknown as fs.Dirent[])

      const result = loadContentDocuments(mockContentDir)

      expect(result).toEqual([])
    })

    it("devrait utiliser le chemin par défaut CONTENT_DIR si non spécifié", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false)

      loadContentDocuments()

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining("content"))
    })
  })

  describe("formatContentForPrompt", () => {
    it("devrait retourner une chaîne vide si aucun document", () => {
      const result = formatContentForPrompt([])

      expect(result).toBe("")
    })

    it("devrait formater un seul document correctement", () => {
      const documents: IContentDocument[] = [{ filename: "cv", content: "Mon CV" }]

      const result = formatContentForPrompt(documents)

      expect(result).toContain("=== CONTEXTE DOCUMENTAIRE ===")
      expect(result).toContain("--- SOURCE: cv ---")
      expect(result).toContain("Mon CV")
      expect(result).toContain("--- FIN SOURCE ---")
      expect(result).toContain("=== FIN CONTEXTE DOCUMENTAIRE ===")
    })

    it("devrait formater plusieurs documents avec des délimiteurs clairs", () => {
      const documents: IContentDocument[] = [
        { filename: "experience", content: "Mon expérience" },
        { filename: "competences", content: "Mes compétences" },
      ]

      const result = formatContentForPrompt(documents)

      expect(result).toContain("--- SOURCE: experience ---")
      expect(result).toContain("Mon expérience")
      expect(result).toContain("--- SOURCE: competences ---")
      expect(result).toContain("Mes compétences")
      // Vérifie que chaque document a son délimiteur de fin
      expect((result.match(/--- FIN SOURCE ---/g) ?? []).length).toBe(2)
    })

    it("devrait inclure les instructions pour le LLM", () => {
      const documents: IContentDocument[] = [{ filename: "test", content: "Test" }]

      const result = formatContentForPrompt(documents)

      expect(result).toContain("sources fiables")
      expect(result).toContain("Utilise-les pour répondre")
    })
  })

  describe("loadFormattedContent", () => {
    it("devrait retourner une chaîne vide si le dossier n'existe pas", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false)

      const result = loadFormattedContent(mockContentDir)

      expect(result).toBe("")
    })

    it("devrait charger et formater le contenu", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true)
      vi.spyOn(fs, "readdirSync").mockReturnValue(["test.md"] as unknown as fs.Dirent[])
      vi.spyOn(fs, "readFileSync").mockReturnValue("Contenu test")

      const result = loadFormattedContent(mockContentDir)

      expect(result).toContain("=== CONTEXTE DOCUMENTAIRE ===")
      expect(result).toContain("--- SOURCE: test ---")
      expect(result).toContain("Contenu test")
    })
  })
})

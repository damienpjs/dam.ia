import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs"
import { loadContentDocuments } from "@/lib/content-loader"

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
})

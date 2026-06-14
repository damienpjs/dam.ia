import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs"

let mockTextResult = { text: "" }

// pdf-parse v2 exporte une classe PDFParse avec getText() et destroy()
vi.mock("pdf-parse", () => ({
  PDFParse: class {
    async getText() {
      return mockTextResult
    }
    async destroy() {}
  },
}))

import { formatPdfLabel, extractTextFromPdf, chunkPdfFile, chunkAllPdfs, loadPdfMeta } from "@/lib/rag/pdf-loader"

describe("formatPdfLabel", () => {
  it("transforme un nom avec tirets en label lisible", () => {
    expect(formatPdfLabel("cv-damien-pasulj")).toBe("CV Damien Pasulj")
  })

  it("transforme un nom avec underscores en label lisible", () => {
    expect(formatPdfLabel("lettre_de_motivation")).toBe("Lettre De Motivation")
  })

  it("met CV en majuscules", () => {
    expect(formatPdfLabel("cv")).toBe("CV")
  })

  it("capitalise chaque mot", () => {
    expect(formatPdfLabel("mon-document-important")).toBe("Mon Document Important")
  })

  it("gère un nom simple sans séparateurs", () => {
    expect(formatPdfLabel("portfolio")).toBe("Portfolio")
  })
})

describe("extractTextFromPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne le texte extrait du PDF", async () => {
    mockTextResult = { text: "Contenu du PDF\n\n\n\nAvec des sauts de ligne" }

    vi.spyOn(fs, "readFileSync").mockReturnValueOnce(Buffer.from("fake-pdf"))

    const text = await extractTextFromPdf("/fake/path.pdf")

    expect(text).toBe("Contenu du PDF\n\nAvec des sauts de ligne")
  })
})

describe("chunkPdfFile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne des chunks avec les bonnes métadonnées", async () => {
    mockTextResult = { text: "Contenu de test du PDF." }

    vi.spyOn(fs, "readFileSync").mockReturnValueOnce(Buffer.from("fake-pdf"))

    const chunks = await chunkPdfFile("/content/cv-damien-pasulj.pdf")

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].source).toBe("cv-damien-pasulj")
    expect(chunks[0].metadata).toEqual({
      sourceUrl: "/cv-damien-pasulj.pdf",
      sourceLabel: "CV Damien Pasulj",
    })
  })

  it("utilise les métadonnées custom quand un meta override est fourni", async () => {
    mockTextResult = { text: "Contenu LinkedIn." }

    vi.spyOn(fs, "readFileSync").mockReturnValueOnce(Buffer.from("fake-pdf"))

    const chunks = await chunkPdfFile("/content/linkedin-profile.pdf", {
      sourceUrl: "https://www.linkedin.com/in/damien/",
      sourceLabel: "LinkedIn",
    })

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].metadata).toEqual({
      sourceUrl: "https://www.linkedin.com/in/damien/",
      sourceLabel: "LinkedIn",
    })
  })

  it("retourne un tableau vide si le PDF ne contient pas de texte", async () => {
    mockTextResult = { text: "   " }

    vi.spyOn(fs, "readFileSync").mockReturnValueOnce(Buffer.from("fake-pdf"))

    const chunks = await chunkPdfFile("/content/vide.pdf")

    expect(chunks).toEqual([])
  })
})

describe("chunkAllPdfs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne un tableau vide si le dossier n'existe pas", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false)

    const chunks = await chunkAllPdfs("/inexistant")

    expect(chunks).toEqual([])
  })

  it("retourne un tableau vide si aucun PDF dans le dossier", async () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => !String(p).includes("pdf-meta.json"))
    vi.spyOn(fs, "readdirSync").mockReturnValue(["doc.md", "notes.txt"] as unknown as fs.Dirent[])

    const chunks = await chunkAllPdfs("/content")

    expect(chunks).toEqual([])
  })

  it("charge et chunke tous les PDFs du dossier", async () => {
    mockTextResult = { text: "Contenu PDF de test." }

    vi.spyOn(fs, "existsSync").mockImplementation((p) => !String(p).includes("pdf-meta.json"))
    vi.spyOn(fs, "readdirSync").mockReturnValue(["cv.pdf", "lettre.pdf"] as unknown as fs.Dirent[])
    vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("fake-pdf"))

    const chunks = await chunkAllPdfs("/content")

    expect(chunks.length).toBeGreaterThanOrEqual(2)
    const sources = [...new Set(chunks.map((c) => c.source))]
    expect(sources).toContain("cv")
    expect(sources).toContain("lettre")
  })

  it("applique les overrides de pdf-meta.json aux chunks", async () => {
    mockTextResult = { text: "Profil LinkedIn exporté." }

    vi.spyOn(fs, "existsSync").mockReturnValue(true)
    vi.spyOn(fs, "readdirSync").mockReturnValue(["linkedin-profile.pdf"] as unknown as fs.Dirent[])
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      if (String(filePath).includes("pdf-meta.json")) {
        return JSON.stringify({
          "linkedin-profile": {
            sourceUrl: "https://www.linkedin.com/in/damien/",
            sourceLabel: "LinkedIn",
          },
        })
      }
      return Buffer.from("fake-pdf")
    })

    const chunks = await chunkAllPdfs("/content")

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].metadata).toEqual({
      sourceUrl: "https://www.linkedin.com/in/damien/",
      sourceLabel: "LinkedIn",
    })
  })
})

describe("loadPdfMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne un objet vide si pdf-meta.json n'existe pas", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false)
    expect(loadPdfMeta("/content")).toEqual({})
  })

  it("charge les overrides depuis pdf-meta.json", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true)
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        "linkedin-profile": { sourceUrl: "https://linkedin.com", sourceLabel: "LinkedIn" },
      }),
    )

    const meta = loadPdfMeta("/content")
    expect(meta["linkedin-profile"]).toEqual({
      sourceUrl: "https://linkedin.com",
      sourceLabel: "LinkedIn",
    })
  })
})

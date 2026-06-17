import fs from "fs"
import path from "path"
import type { IContentChunk } from "./types"
import { splitTextIntoChunks, generateChunkId } from "./chunker"
import { CONTENT_DIR } from "../content-loader"

/**
 * Charge et parse un fichier PDF, retourne le texte extrait.
 * Utilise pdf-parse v2 (classe PDFParse) avec chargement lazy
 * pour éviter les effets de bord au top-level et permettre le mocking en test.
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const buffer = fs.readFileSync(filePath)
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  await parser.destroy()
  return result.text.replace(/\n{3,}/g, "\n\n").trim()
}

/**
 * Surcharge de métadonnées pour un PDF (sourceUrl, sourceLabel).
 */
export interface IPdfMeta {
  sourceUrl?: string
  sourceLabel?: string
}

/**
 * Charge les surcharges de métadonnées depuis content/pdf-meta.json.
 */
export function loadPdfMeta(contentDir: string = CONTENT_DIR): Record<string, IPdfMeta> {
  const metaPath = path.join(contentDir, "pdf-meta.json")
  if (!fs.existsSync(metaPath)) {
    return {}
  }
  return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as Record<string, IPdfMeta>
}

/**
 * Transforme un fichier PDF en chunks indexables.
 * Utilise pdf-meta.json pour surcharger sourceUrl/sourceLabel si une entrée existe.
 * Sinon, le sourceUrl pointe vers /<filename>.pdf et le sourceLabel est dérivé du nom.
 */
export async function chunkPdfFile(filePath: string, meta?: IPdfMeta): Promise<IContentChunk[]> {
  const filename = path.basename(filePath, ".pdf")
  const text = await extractTextFromPdf(filePath)

  if (text.length === 0) {
    return []
  }

  const textChunks = splitTextIntoChunks(text)
  const metadata: Record<string, unknown> = {
    sourceUrl: meta?.sourceUrl ?? `/${path.basename(filePath)}`,
    sourceLabel: meta?.sourceLabel ?? formatPdfLabel(filename),
  }

  return textChunks.map((chunk) => ({
    id: generateChunkId(filename, chunk),
    source: filename,
    text: chunk,
    metadata,
  }))
}

/**
 * Transforme un nom de fichier PDF en label lisible.
 * Ex: "cv-damien-pasulj" → "CV Damien Pasulj"
 */
export function formatPdfLabel(filename: string): string {
  return filename
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bCv\b/gi, "CV")
}

/**
 * Charge et chunke tous les fichiers PDF du dossier content.
 */
export async function chunkAllPdfs(contentDir: string = CONTENT_DIR): Promise<IContentChunk[]> {
  if (!fs.existsSync(contentDir)) {
    return []
  }

  const pdfFiles = fs.readdirSync(contentDir).filter((file) => file.endsWith(".pdf"))
  const meta = loadPdfMeta(contentDir)
  const allChunks: IContentChunk[] = []

  for (const file of pdfFiles) {
    const filename = path.basename(file, ".pdf")
    const chunks = await chunkPdfFile(path.join(contentDir, file), meta[filename])
    allChunks.push(...chunks)
  }

  return allChunks
}

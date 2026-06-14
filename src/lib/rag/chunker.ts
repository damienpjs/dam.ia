import type { IContentChunk } from "./types"
import { loadContentDocuments, type IContentDocument } from "../content-loader"
import { createHash } from "crypto"

/**
 * Taille cible d'un chunk en caractères.
 * Assez grand pour garder du contexte, assez petit pour des embeddings précis.
 */
export const CHUNK_SIZE = 500

/**
 * Chevauchement entre chunks pour ne pas perdre de contexte aux frontières.
 */
export const CHUNK_OVERLAP = 50

/**
 * Extrait le frontmatter YAML d'un contenu markdown.
 * Retourne les métadonnées parsées et le contenu sans frontmatter.
 */
export function extractFrontmatter(content: string): { metadata: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!match) {
    return { metadata: {}, body: content }
  }

  const rawYaml = match[1]
  const body = match[2]

  const metadata: Record<string, unknown> = {}
  for (const line of rawYaml.split("\n")) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (key) {
      metadata[key] = value.replace(/^["']|["']$/g, "")
    }
  }

  return { metadata, body }
}

/**
 * Génère un ID déterministe pour un chunk basé sur son source et son contenu.
 */
export function generateChunkId(source: string, text: string): string {
  const hash = createHash("md5").update(`${source}:${text}`).digest("hex").slice(0, 8)
  return `${source}-${hash}`
}

/**
 * Découpe un texte en chunks de taille CHUNK_SIZE avec un chevauchement CHUNK_OVERLAP.
 * Essaie de couper aux sauts de ligne pour garder la cohérence sémantique.
 */
export function splitTextIntoChunks(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim()

  if (cleaned.length <= chunkSize) {
    return cleaned.length > 0 ? [cleaned] : []
  }

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = start + chunkSize

    if (end < cleaned.length) {
      // Chercher le dernier saut de ligne dans la zone pour couper proprement
      const lastNewline = cleaned.lastIndexOf("\n", end)
      if (lastNewline > start + chunkSize / 2) {
        end = lastNewline
      }
    } else {
      end = cleaned.length
    }

    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    const nextStart = end - overlap
    // Garantir que start avance toujours pour éviter les boucles infinies
    start = nextStart > start ? nextStart : end
    if (start >= cleaned.length) break
  }

  return chunks
}

/**
 * Transforme un document markdown en une liste de chunks indexables.
 */
export function chunkDocument(doc: IContentDocument): IContentChunk[] {
  const { metadata, body } = extractFrontmatter(doc.content)
  const textChunks = splitTextIntoChunks(body)

  return textChunks.map((text) => ({
    id: generateChunkId(doc.filename, text),
    source: doc.filename,
    text,
    metadata,
  }))
}

/**
 * Charge et chunke tous les documents du dossier content.
 */
export function chunkAllContent(contentDir?: string): IContentChunk[] {
  const docs = loadContentDocuments(contentDir)
  return docs.flatMap(chunkDocument)
}

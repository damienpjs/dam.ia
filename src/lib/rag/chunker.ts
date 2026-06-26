import type { IContentChunk } from "./types"
import { loadContentDocuments, type IContentDocument } from "../content-loader"
import { createHash } from "crypto"
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@/constants/rag"

export { CHUNK_SIZE, CHUNK_OVERLAP }

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
 * Construit un en-tête de contexte à partir du frontmatter (contextual retrieval).
 *
 * Chaque chunk d'une expérience perd, une fois découpé, le fil temporel du document
 * d'origine : impossible alors de savoir si « elloha » est l'employeur actuel ou passé.
 * On réinjecte donc les métadonnées clés (entreprise, poste, période, et surtout le
 * marqueur « Poste actuel ») en tête de CHAQUE chunk. Cet en-tête est embeddé ET montré
 * au LLM, ce qui améliore à la fois le recall (les mots « actuel/présent/<entreprise> »
 * entrent dans le vecteur) et la précision (le LLM dispose d'un signal non ambigu).
 *
 * Retourne "" si aucune métadonnée pertinente n'est disponible.
 */
export function buildChunkContextHeader(metadata: Record<string, unknown>): string {
  const parts: string[] = []

  if (metadata.company) parts.push(`Entreprise: ${String(metadata.company)}`)
  if (metadata.role) parts.push(`Poste: ${String(metadata.role)}`)
  if (metadata.period) parts.push(`Période: ${String(metadata.period)}`)
  // Le parser de frontmatter est naïf : les booléens arrivent sous forme de chaîne.
  if (metadata.current !== undefined) {
    parts.push(`Poste actuel: ${String(metadata.current) === "true" ? "OUI" : "non"}`)
  }

  return parts.length > 0 ? `[${parts.join(" | ")}]` : ""
}

/**
 * Transforme un document markdown en une liste de chunks indexables.
 */
export function chunkDocument(doc: IContentDocument): IContentChunk[] {
  const { metadata, body } = extractFrontmatter(doc.content)
  const textChunks = splitTextIntoChunks(body)
  const header = buildChunkContextHeader(metadata)

  return textChunks.map((text) => {
    const contextualText = header ? `${header}\n${text}` : text
    return {
      id: generateChunkId(doc.filename, contextualText),
      source: doc.filename,
      text: contextualText,
      metadata,
    }
  })
}

/**
 * Charge et chunke tous les documents du dossier content.
 */
export function chunkAllContent(contentDir?: string): IContentChunk[] {
  const docs = loadContentDocuments(contentDir)
  return docs.flatMap(chunkDocument)
}

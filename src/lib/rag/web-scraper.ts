import type { IContentChunk } from "./types"
import { splitTextIntoChunks } from "./chunker"
import { generateChunkId } from "./chunker"

/**
 * Configuration d'une source web externe à indexer
 */
export interface IWebSource {
  /** Identifiant unique (ex: "linkedin", "site-perso") */
  id: string
  /** URL à scraper */
  url: string
  /** Label affiché à l'utilisateur (ex: "LinkedIn") */
  label: string
}

/**
 * Extrait le contenu textuel d'une page HTML.
 * Supprime les scripts, styles, et balises HTML pour ne garder que le texte lisible.
 */
export function extractTextFromHtml(html: string): string {
  return (
    html
      // Supprimer scripts et styles
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      // Supprimer les balises HTML
      .replace(/<[^>]+>/g, " ")
      // Décoder les entités HTML courantes
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Nettoyer les espaces multiples
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim()
  )
}

/**
 * Fetch une page web et retourne son contenu textuel.
 */
export async function fetchWebPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "DamIA-Indexer/1.0",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${url}`)
  }

  const html = await response.text()
  return extractTextFromHtml(html)
}

/**
 * Scrape une source web et la transforme en chunks indexables.
 * Le metadata de chaque chunk contient sourceUrl et sourceLabel
 * pour que le pipeline RAG puisse les afficher comme sources cliquables.
 */
export async function scrapeWebSource(source: IWebSource): Promise<IContentChunk[]> {
  const text = await fetchWebPage(source.url)

  if (text.length === 0) {
    return []
  }

  const textChunks = splitTextIntoChunks(text)
  const metadata: Record<string, unknown> = {
    sourceUrl: source.url,
    sourceLabel: source.label,
  }

  return textChunks.map((chunk) => ({
    id: generateChunkId(source.id, chunk),
    source: source.id,
    text: chunk,
    metadata,
  }))
}

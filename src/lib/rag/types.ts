/**
 * Représente un chunk de contenu markdown prêt à être indexé
 */
export interface IContentChunk {
  /** Identifiant unique du chunk */
  id: string
  /** Nom du fichier source (sans extension) */
  source: string
  /** Contenu textuel du chunk */
  text: string
  /** Métadonnées extraites du frontmatter */
  metadata: Record<string, unknown>
}

/**
 * Résultat de recherche Qdrant avec score de similarité
 */
export interface ISearchResult {
  /** Contenu textuel du chunk */
  text: string
  /** Nom du fichier source */
  source: string
  /** Score de similarité (0-1) */
  score: number
}

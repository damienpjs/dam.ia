import fs from "fs"
import path from "path"

/**
 * Interface représentant un document de contenu chargé
 */
export interface IContentDocument {
  /** Nom du fichier (sans extension) */
  filename: string
  /** Contenu brut du fichier markdown */
  content: string
}

/**
 * Chemin par défaut vers le dossier de contenu
 */
export const CONTENT_DIR = path.join(process.cwd(), "content")

/**
 * Charge tous les fichiers markdown du dossier /content.
 * Utilisé par le pipeline RAG pour le chunking des documents.
 *
 * @param contentDir - Chemin vers le dossier de contenu (par défaut: /content)
 * @returns Liste des documents chargés
 */
export function loadContentDocuments(contentDir: string = CONTENT_DIR): IContentDocument[] {
  if (!fs.existsSync(contentDir)) {
    return []
  }

  const files = fs.readdirSync(contentDir).filter((file) => file.endsWith(".md"))

  return files.map((file) => ({
    filename: file.replace(/\.md$/, ""),
    content: fs.readFileSync(path.join(contentDir, file), "utf-8"),
  }))
}

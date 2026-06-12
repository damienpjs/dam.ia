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
 * Utilisé pour injecter le contexte dans le system prompt du LLM.
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

/**
 * Formate les documents de contenu en une chaîne injectable dans le system prompt.
 * Chaque document est encadré par des délimiteurs clairs pour le LLM.
 *
 * @param documents - Liste des documents à formater
 * @returns Chaîne formatée prête à être injectée dans le prompt
 */
export function formatContentForPrompt(documents: IContentDocument[]): string {
  if (documents.length === 0) {
    return ""
  }

  const formattedDocs = documents.map((doc) => `--- SOURCE: ${doc.filename} ---\n${doc.content}\n--- FIN SOURCE ---`).join("\n\n")

  return `

=== CONTEXTE DOCUMENTAIRE ===
Les informations suivantes sont des sources fiables sur ton parcours. Utilise-les pour répondre aux questions.

${formattedDocs}

=== FIN CONTEXTE DOCUMENTAIRE ===
`
}

/**
 * Charge et formate tout le contenu du dossier /content pour injection dans le prompt.
 * Fonction utilitaire combinant loadContentDocuments et formatContentForPrompt.
 *
 * @param contentDir - Chemin vers le dossier de contenu (par défaut: /content)
 * @returns Chaîne formatée prête à être injectée, ou chaîne vide si pas de contenu
 */
export function loadFormattedContent(contentDir: string = CONTENT_DIR): string {
  const documents = loadContentDocuments(contentDir)
  return formatContentForPrompt(documents)
}

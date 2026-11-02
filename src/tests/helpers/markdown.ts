/** Texte tel qu'affiché une fois le gras markdown rendu : `**Lead Tech JS**` → `Lead Tech JS`. */
export function plainText(markdown: string): string {
  return markdown.replace(/\*\*(.+?)\*\*/g, "$1")
}

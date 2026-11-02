/**
 * Poids d'un texte en octets (UTF-8), affiché à côté du nom de chaque
 * « fichier » de l'interface, comme sur le CV. Calculé et non saisi à la main :
 * il reste juste quand le texte change.
 */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/** Poids d'un fichier fait de plusieurs textes, les absents ignorés. */
export function sizeOf(...parts: Array<string | undefined>): number {
  return byteLength(parts.filter(Boolean).join(""))
}

/** Heure d'un message, « 22:31 », dans la langue courante. */
export function formatClock(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })
}

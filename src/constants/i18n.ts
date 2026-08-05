/**
 * Configuration du sélecteur de langue « FR / EN ».
 *
 * Le site n'utilise pas le routage i18n de Next (pas de préfixe `/fr`, `/en`) :
 * la langue est un état purement client, mémorisé dans localStorage. Ce choix
 * garde une URL unique — et donc une seule page à indexer — pour un site
 * personnel dont le contenu SEO reste rédigé en français.
 */

/** Langues proposées par le sélecteur. */
export type TLocale = "fr" | "en"

/** Ordre d'affichage dans le sélecteur (« FR / EN »). */
export const LOCALES: readonly TLocale[] = ["fr", "en"]

/** Langue servie par le rendu serveur, et repli quand rien n'est mémorisé. */
export const DEFAULT_LOCALE: TLocale = "fr"

/** Clé localStorage mémorisant la langue choisie par le visiteur. */
export const LOCALE_STORAGE_KEY = "dam_ia_locale"

/** Libellés affichés dans le sélecteur. */
export const LOCALE_LABELS: Record<TLocale, string> = {
  fr: "FR",
  en: "EN",
}

/**
 * Garde-fou : une valeur lue depuis localStorage (ou reçue par l'API) n'est
 * digne de confiance qu'après vérification.
 */
export function isLocale(value: unknown): value is TLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

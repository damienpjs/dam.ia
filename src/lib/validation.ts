import { UUID_REGEX } from "@/constants/validation"

/**
 * Vérifie qu'une valeur est une chaîne au format UUID.
 *
 * Sert de garde-fou avant toute requête DB : un identifiant malformé est
 * rejeté côté application (400) plutôt que de provoquer une exception Postgres
 * (500) sur une colonne `uuid`.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

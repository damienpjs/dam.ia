/**
 * Configuration du rate limiting par IP (anti-spam / protection des bases).
 *
 * Fenêtres glissantes appliquées dans `proxy.ts` via Upstash Redis.
 * Les valeurs sont dimensionnées pour un usage humain normal du chat tout en
 * bloquant les boucles automatisées qui satureraient Neon et le quota LLM.
 */

export type TRateLimitKind = "chat" | "feedback"

export interface IRateLimitRule {
  // Nombre de requêtes autorisées par fenêtre
  limit: number
  // Durée de la fenêtre glissante (format Upstash : "10 s", "1 m", "1 h"...)
  window: `${number} ${"s" | "m" | "h" | "d"}`
}

export const RATE_LIMIT_RULES: Record<TRateLimitKind, IRateLimitRule> = {
  // Le chat consomme DB + quota LLM : limite la plus stricte.
  chat: { limit: 15, window: "1 m" },
  // Le feedback est léger mais reste une écriture DB à protéger du spam.
  feedback: { limit: 30, window: "1 m" },
}

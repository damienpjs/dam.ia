import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"
import { RATE_LIMIT_RULES, type TRateLimitKind } from "@/constants/rate-limit"

export type { TRateLimitKind }

export interface IRateLimitResult {
  // false → la requête doit être rejetée (429)
  success: boolean
  // Nombre de requêtes restantes dans la fenêtre
  remaining: number
  // Timestamp (epoch ms) de réinitialisation de la fenêtre
  reset: number
}

// Cache des limiteurs par type (réutilisation entre invocations chaudes).
// `undefined` = pas encore initialisé, `null` = Upstash non configuré.
const limiters = new Map<TRateLimitKind, Ratelimit | null>()
let redis: Redis | null | undefined

/**
 * Récupère le client Redis Upstash, ou `null` si les variables d'environnement
 * ne sont pas configurées (dev local, mode mock, CI). Permet une dégradation
 * gracieuse : sans Upstash, le rate limiting est simplement désactivé.
 */
function getRedis(): Redis | null {
  if (redis !== undefined) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

function getLimiter(kind: TRateLimitKind): Ratelimit | null {
  const cached = limiters.get(kind)
  if (cached !== undefined) return cached

  const client = getRedis()
  if (!client) {
    limiters.set(kind, null)
    return null
  }

  const rule = RATE_LIMIT_RULES[kind]
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
    prefix: `ratelimit:${kind}`,
    analytics: false,
  })
  limiters.set(kind, limiter)
  return limiter
}

/**
 * Réinitialise les limiteurs mis en cache. Réservé aux tests.
 */
export function resetRateLimiters(): void {
  limiters.clear()
  redis = undefined
}

/**
 * Extrait l'IP cliente depuis les en-têtes de proxy (Vercel, reverse proxy).
 * Retombe sur "anonymous" si aucune IP n'est disponible — tous les clients
 * anonymes partagent alors le même seau, ce qui reste protecteur.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()

  return "anonymous"
}

/**
 * Applique le rate limiting pour un identifiant (IP) et un type de route.
 * Si Upstash n'est pas configuré, autorise systématiquement la requête.
 */
export async function checkRateLimit(identifier: string, kind: TRateLimitKind): Promise<IRateLimitResult> {
  const limiter = getLimiter(kind)

  if (!limiter) {
    return { success: true, remaining: Infinity, reset: 0 }
  }

  const { success, remaining, reset } = await limiter.limit(identifier)
  return { success, remaining, reset }
}

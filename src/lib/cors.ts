import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { PRODUCTION_ORIGIN, ALLOWED_ORIGINS_ENV, CORS_ALLOW_METHODS, CORS_ALLOW_HEADERS } from "@/constants/cors"

/**
 * Liste des origines explicitement autorisées (en plus du same-origin).
 * Lue depuis `ALLOWED_ORIGINS` (CSV) ou, à défaut, le domaine de production.
 */
export function getAllowedOrigins(): string[] {
  const fromEnv = process.env[ALLOWED_ORIGINS_ENV]
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  }
  return [PRODUCTION_ORIGIN]
}

/**
 * Détermine si une origine est autorisée à appeler les routes d'écriture.
 *
 * - Same-origin : l'hôte de l'`Origin` correspond à l'en-tête `Host` de la
 *   requête (couvre dev/preview/prod sans configuration ; un navigateur ne peut
 *   pas forger `Host`, donc un site tiers est bloqué).
 * - Sinon : l'origine doit figurer dans l'allowlist explicite.
 */
export function isAllowedOrigin(origin: string, request: NextRequest): boolean {
  const host = request.headers.get("host")
  try {
    if (host && new URL(origin).host === host) return true
  } catch {
    // Origin malformée → refus
    return false
  }
  return getAllowedOrigins().includes(origin)
}

/**
 * En-têtes CORS à attacher à une réponse pour une origine autorisée.
 */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    Vary: "Origin",
  }
}

/**
 * Construit la réponse à une requête preflight (OPTIONS) : 204 + en-têtes CORS
 * si l'origine est autorisée, 403 sinon.
 */
export function preflightResponse(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin")
  if (origin && isAllowedOrigin(origin, request)) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
  }
  return new NextResponse(null, { status: 403 })
}

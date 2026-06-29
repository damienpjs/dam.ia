import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, getClientIp, type TRateLimitKind } from "@/lib/rate-limit"
import { isAllowedOrigin, corsHeaders, preflightResponse } from "@/lib/cors"

/**
 * Proxy Next.js (ex-`middleware`, renommé en v16).
 *
 * Protège les routes d'écriture publiques contre l'abus automatisé afin de
 * préserver les bases (Neon / quota LLM) :
 * - contrôle d'origine (CORS) : rejette les appels cross-site navigateur ;
 * - rate limiting par IP sur les requêtes POST.
 * Les lectures (GET) ne mutent rien et ne sont pas limitées.
 */

const RATE_LIMITED_ROUTES: { prefix: string; kind: TRateLimitKind }[] = [
  { prefix: "/api/feedback", kind: "feedback" },
  { prefix: "/api/chat", kind: "chat" },
]

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const route = RATE_LIMITED_ROUTES.find((r) => pathname.startsWith(r.prefix))
  if (!route) {
    return NextResponse.next()
  }

  // Preflight CORS
  if (request.method === "OPTIONS") {
    return preflightResponse(request)
  }

  if (request.method !== "POST") {
    return NextResponse.next()
  }

  // Contrôle d'origine : un Origin présent mais non autorisé est rejeté.
  // Origin absent (clients non-navigateur) → laissé au rate limiting.
  const origin = request.headers.get("origin")
  if (origin && !isAllowedOrigin(origin, request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 })
  }

  const ip = getClientIp(request)
  const { success, reset } = await checkRateLimit(ip, route.kind)

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return NextResponse.json(
      { error: "Trop de requêtes. Réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    )
  }

  // Origine autorisée : on reflète les en-têtes CORS sur la réponse.
  const response = NextResponse.next()
  if (origin) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      response.headers.set(key, value)
    }
  }
  return response
}

export const config = {
  matcher: ["/api/chat/:path*", "/api/feedback/:path*"],
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, getClientIp, type TRateLimitKind } from "@/lib/rate-limit"

/**
 * Proxy Next.js (ex-`middleware`, renommé en v16).
 *
 * Applique un rate limiting par IP sur les routes d'écriture publiques afin de
 * protéger les bases de données (Neon / quota LLM) contre le spam automatisé.
 * Seules les requêtes POST sont limitées : les lectures (GET) ne mutent rien.
 */

const RATE_LIMITED_ROUTES: { prefix: string; kind: TRateLimitKind }[] = [
  { prefix: "/api/feedback", kind: "feedback" },
  { prefix: "/api/chat", kind: "chat" },
]

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.method !== "POST") {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const route = RATE_LIMITED_ROUTES.find((r) => pathname.startsWith(r.prefix))
  if (!route) {
    return NextResponse.next()
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

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/chat/:path*", "/api/feedback/:path*"],
}

import type { NextRequest } from "next/server"
import { getSessionMessages } from "@/lib/db/chat-service"
import { isUuid } from "@/lib/validation"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }): Promise<Response> {
  const { sessionId } = await params

  if (!isUuid(sessionId)) {
    return new Response(JSON.stringify({ error: "sessionId invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const messages = await getSessionMessages(sessionId)
    return Response.json({ messages })
  } catch {
    return new Response(JSON.stringify({ error: "Impossible de récupérer la session" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

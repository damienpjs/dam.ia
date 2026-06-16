import type { NextRequest } from "next/server"
import { getSessionMessages } from "@/lib/db/chat-service"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }): Promise<Response> {
  const { sessionId } = await params

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

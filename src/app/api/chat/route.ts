import { NextRequest } from "next/server"
import { createLLMProvider, MockProvider } from "@/lib/llm"
import { sanitizeMessage, MAX_MESSAGE_LENGTH } from "@/lib/sanitize-message"
import { QuotaExceededError } from "@/lib/llm/errors"

/**
 * Interface pour le body de la requête POST
 */
interface IChatRequest {
  message: string
}

/**
 * Type pour les chunks de réponse streamés
 */
type TStreamChunk = {
  content: string
  done: boolean
}

/**
 * Encode un chunk pour le streaming
 */
function encodeChunk(chunk: TStreamChunk): string {
  return JSON.stringify(chunk) + "\n"
}

/**
 * POST /api/chat
 *
 * Reçoit un message utilisateur et retourne une réponse streamée
 * via le provider LLM configuré (Gemini, mock, etc.).
 *
 * Body attendu: { message: string }
 * Réponse: Stream de chunks JSON { content: string, done: boolean }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as IChatRequest
    const { message } = body

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Le champ 'message' est requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Le message ne doit pas dépasser ${MAX_MESSAGE_LENGTH} caractères` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { sanitized } = sanitizeMessage(message)
    const provider = createLLMProvider()

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          for await (const text of provider.streamResponse(sanitized)) {
            const chunk: TStreamChunk = {
              content: text,
              done: false,
            }
            controller.enqueue(encoder.encode(encodeChunk(chunk)))
          }

          // Chunk final signalant la fin du stream
          const finalChunk: TStreamChunk = {
            content: "",
            done: true,
          }
          controller.enqueue(encoder.encode(encodeChunk(finalChunk)))
        } catch (error) {
          if (error instanceof QuotaExceededError) {
            // Fallback : message d'excuse + réponse via MockProvider
            const notice = "⏳ Notre assistant IA est temporairement indisponible en raison d'un trop grand nombre de demandes. " + "Voici une réponse pré-enregistrée en attendant :\n\n"
            controller.enqueue(encoder.encode(encodeChunk({ content: notice, done: false })))

            const fallback = new MockProvider()
            for await (const text of fallback.streamResponse(sanitized)) {
              controller.enqueue(encoder.encode(encodeChunk({ content: text, done: false })))
            }
          } else {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
            const errorChunk: TStreamChunk = {
              content: `\n\n⚠️ ${errorMessage}`,
              done: false,
            }
            controller.enqueue(encoder.encode(encodeChunk(errorChunk)))
          }

          const finalChunk: TStreamChunk = {
            content: "",
            done: true,
          }
          controller.enqueue(encoder.encode(encodeChunk(finalChunk)))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Erreur lors du traitement de la requête" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

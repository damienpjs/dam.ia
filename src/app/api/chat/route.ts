import { NextRequest } from "next/server"
import { createLLMProvider, MockProvider } from "@/lib/llm"
import { sanitizeMessage, MAX_MESSAGE_LENGTH } from "@/lib/sanitize-message"
import { QuotaExceededError } from "@/lib/llm/errors"
import { retrieveRelevantChunks, formatRAGContext } from "@/lib/rag/pipeline"
import { createSession, saveMessage } from "@/lib/db/chat-service"
import type { ISearchResult } from "@/lib/rag/types"

/**
 * Interface pour le body de la requête POST
 */
interface IChatRequest {
  message: string
  sessionId?: string
}

/**
 * Source RAG envoyée au client
 */
interface ISourceInfo {
  label: string
  source: string
  url?: string
}

/**
 * Type pour les chunks de réponse streamés
 */
type TStreamChunk = {
  content: string
  done: boolean
  sources?: ISourceInfo[]
  sessionId?: string
  messageId?: string
  status?: "ok" | "error"
}

/**
 * Message de repli neutre stocké et affiché lorsqu'une erreur technique du LLM survient.
 * On évite d'exposer le message d'erreur brut à l'utilisateur (et de le persister).
 */
const ERROR_FALLBACK_MESSAGE = "⚠️ Une erreur est survenue. Réessaie dans un instant."

/**
 * Encode un chunk pour le streaming
 */
function encodeChunk(chunk: TStreamChunk): string {
  return JSON.stringify(chunk) + "\n"
}

/**
 * Déduplique et formate les sources RAG pour le client.
 * Regroupe par sourceUrl (depuis le frontmatter/metadata) au lieu de par fichier .md.
 * Seules les sources effectivement retrouvées par la recherche vectorielle apparaissent.
 */
function formatSources(results: ISearchResult[]): ISourceInfo[] {
  const seen = new Set<string>()
  const sources: ISourceInfo[] = []

  for (const r of results) {
    const url = r.metadata?.sourceUrl as string | undefined
    const key = url ?? r.source
    if (seen.has(key)) continue
    seen.add(key)

    sources.push({
      label: (r.metadata?.sourceLabel as string) ?? r.source,
      source: r.source,
      url,
    })
  }

  return sources
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
    const { message, sessionId: incomingSessionId } = body

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

    // Pipeline RAG : enrichir le message avec les chunks pertinents
    let enrichedMessage = sanitized
    let sources: ISourceInfo[] = []
    try {
      const ragResults = await retrieveRelevantChunks(sanitized)
      if (ragResults.length > 0) {
        console.log(`[RAG] ✅ ${ragResults.length} chunks trouvés (scores: ${ragResults.map((r) => `${(r.score * 100).toFixed(0)}%`).join(", ")})`)
        const ragContext = formatRAGContext(ragResults)
        enrichedMessage = `${ragContext}\n\nQuestion de l'utilisateur : ${sanitized}`
        sources = formatSources(ragResults)
      } else {
        console.log("[RAG] ⚠️ Aucun chunk pertinent trouvé")
      }
    } catch (ragError) {
      console.warn("[RAG] ❌ Fallback sans RAG:", ragError instanceof Error ? ragError.message : ragError)
    }

    // Persistence DB (graceful — ne bloque pas le chat si la DB est down)
    let sessionId = incomingSessionId
    try {
      if (!sessionId) {
        sessionId = await createSession()
      }
      await saveMessage(sessionId, "user", sanitized)
    } catch (dbError) {
      console.warn("[DB] ❌ Impossible de sauvegarder le message utilisateur:", dbError instanceof Error ? dbError.message : dbError)
      sessionId = undefined
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let fullResponse = ""

        try {
          for await (const text of provider.streamResponse(enrichedMessage)) {
            fullResponse += text
            const chunk: TStreamChunk = {
              content: text,
              done: false,
            }
            controller.enqueue(encoder.encode(encodeChunk(chunk)))
          }

          // Sauvegarder la réponse assistant en DB
          let assistantMessageId: string | undefined
          if (sessionId) {
            try {
              assistantMessageId = await saveMessage(sessionId, "assistant", fullResponse, sources.length > 0 ? sources : undefined)
            } catch (dbError) {
              console.warn("[DB] ❌ Impossible de sauvegarder la réponse assistant:", dbError instanceof Error ? dbError.message : dbError)
            }
          }

          // Chunk final avec les sources RAG, sessionId et messageId
          const finalChunk: TStreamChunk = {
            content: "",
            done: true,
            sources: sources.length > 0 ? sources : undefined,
            sessionId,
            messageId: assistantMessageId,
          }
          controller.enqueue(encoder.encode(encodeChunk(finalChunk)))
        } catch (error) {
          // Statut et contenu à persister selon le type d'échec.
          // Le fallback quota est une vraie réponse utile → "ok" ; une erreur technique → "error".
          let status: "ok" | "error" = "error"
          let fallbackResponse = ""

          if (error instanceof QuotaExceededError) {
            status = "ok"
            // Fallback : message d'excuse + réponse via MockProvider
            const notice = "⏳ Notre assistant IA est temporairement indisponible en raison d'un trop grand nombre de demandes. " + "Voici une réponse pré-enregistrée en attendant :\n\n"
            fallbackResponse += notice
            controller.enqueue(encoder.encode(encodeChunk({ content: notice, done: false })))

            const fallback = new MockProvider()
            for await (const text of fallback.streamResponse(sanitized)) {
              fallbackResponse += text
              controller.enqueue(encoder.encode(encodeChunk({ content: text, done: false })))
            }
          } else {
            console.warn("[LLM] ❌ Erreur de génération:", error instanceof Error ? error.message : error)
            fallbackResponse = ERROR_FALLBACK_MESSAGE
            controller.enqueue(encoder.encode(encodeChunk({ content: fallbackResponse, done: false })))
          }

          // Persister la réponse de repli pour éviter les bulles utilisateur orphelines au rechargement
          let assistantMessageId: string | undefined
          if (sessionId) {
            try {
              assistantMessageId = await saveMessage(sessionId, "assistant", fallbackResponse, undefined, status)
            } catch (dbError) {
              console.warn("[DB] ❌ Impossible de sauvegarder la réponse de repli:", dbError instanceof Error ? dbError.message : dbError)
            }
          }

          const finalChunk: TStreamChunk = {
            content: "",
            done: true,
            sessionId,
            messageId: assistantMessageId,
            status,
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

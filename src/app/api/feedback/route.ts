import { NextRequest } from "next/server"
import { saveFeedback } from "@/lib/db/chat-service"
import { isUuid } from "@/lib/validation"
import { MAX_FEEDBACK_COMMENT_LENGTH } from "@/constants/validation"

/**
 * Interface pour le body de la requête POST
 */
interface IFeedbackRequest {
  messageId: string
  rating: number
  comment?: string
}

/**
 * POST /api/feedback
 *
 * Enregistre un feedback utilisateur sur un message assistant.
 *
 * Body attendu: { messageId: string, rating: number, comment?: string }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as IFeedbackRequest
    const { messageId, rating, comment } = body

    if (!isUuid(messageId)) {
      return new Response(JSON.stringify({ error: "Le champ 'messageId' doit être un UUID valide" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "Le champ 'rating' doit être un nombre entre 1 et 5" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (comment !== undefined && (typeof comment !== "string" || comment.length > MAX_FEEDBACK_COMMENT_LENGTH)) {
      return new Response(JSON.stringify({ error: `Le commentaire ne doit pas dépasser ${MAX_FEEDBACK_COMMENT_LENGTH} caractères` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const feedbackId = await saveFeedback(messageId, rating, comment)

    return new Response(JSON.stringify({ id: feedbackId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[DB] ❌ Erreur lors de la sauvegarde du feedback:", error instanceof Error ? error.message : error)

    return new Response(JSON.stringify({ error: "Impossible d'enregistrer le feedback" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

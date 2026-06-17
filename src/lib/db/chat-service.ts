import { eq, asc } from "drizzle-orm"
import { db } from "./index"
import { chatSessions, messages, feedbacks } from "./schema"
import type { ISourceInfo } from "@/lib/stream-chat"

export type TMessageStatus = "ok" | "error"

export interface ISessionMessage {
  id: string
  role: "user" | "assistant"
  content: string
  status: TMessageStatus
  sources: ISourceInfo[] | null
  createdAt: Date
}

/**
 * Crée une nouvelle session de chat.
 * @returns L'ID de la session créée
 */
export async function createSession(): Promise<string> {
  const [session] = await db.insert(chatSessions).values({}).returning({ id: chatSessions.id })
  return session.id
}

/**
 * Sauvegarde un message dans une session.
 * Les sources RAG (optionnelles) ne concernent que les réponses assistant.
 * Le statut vaut "error" pour une réponse assistant de repli après un échec LLM, sinon "ok".
 * @returns L'ID du message créé
 */
export async function saveMessage(sessionId: string, role: "user" | "assistant", content: string, sources?: ISourceInfo[], status: TMessageStatus = "ok"): Promise<string> {
  const [message] = await db
    .insert(messages)
    .values({ sessionId, role, content, sources: sources ?? null, status })
    .returning({ id: messages.id })
  return message.id
}

/**
 * Récupère tous les messages d'une session, triés par date de création.
 * Retourne un tableau vide si la session n'existe pas ou n'a pas de messages.
 */
export async function getSessionMessages(sessionId: string): Promise<ISessionMessage[]> {
  return db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      status: messages.status,
      sources: messages.sources,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt))
}

/**
 * Sauvegarde un feedback sur un message.
 * @returns L'ID du feedback créé
 */
export async function saveFeedback(messageId: string, rating: number, comment?: string): Promise<string> {
  const [feedback] = await db
    .insert(feedbacks)
    .values({ messageId, rating, comment: comment ?? null })
    .returning({ id: feedbacks.id })
  return feedback.id
}

import { db } from "./index"
import { chatSessions, messages, feedbacks } from "./schema"

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
 * @returns L'ID du message créé
 */
export async function saveMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<string> {
  const [message] = await db.insert(messages).values({ sessionId, role, content }).returning({ id: messages.id })
  return message.id
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

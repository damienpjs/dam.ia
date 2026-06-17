import { pgTable, uuid, text, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core"
import type { ISourceInfo } from "@/lib/stream-chat"

/**
 * Enum pour le rôle des messages (user ou assistant)
 */
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"])

/**
 * Enum pour le statut d'un message.
 * "ok" : message normal (question utilisateur ou réponse assistant valide, fallback quota inclus).
 * "error" : réponse assistant de repli affichée quand le LLM a échoué techniquement.
 * Permet de styliser/masquer les actions au rechargement et d'exclure ces messages d'un futur historique LLM.
 */
export const messageStatusEnum = pgEnum("message_status", ["ok", "error"])

/**
 * Table des sessions de chat.
 * Chaque conversation démarre une nouvelle session.
 */
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/**
 * Table des messages.
 * Chaque message appartient à une session et a un rôle (user/assistant).
 */
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  /**
   * Statut du message. "ok" par défaut ; "error" pour les réponses assistant de repli (échec LLM).
   */
  status: messageStatusEnum("status").notNull().default("ok"),
  /**
   * Sources RAG attachées à une réponse assistant (null pour les messages utilisateur).
   * Permet de réafficher les sources au rechargement d'une conversation.
   */
  sources: jsonb("sources").$type<ISourceInfo[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Table des feedbacks.
 * Chaque feedback est lié à un message assistant (rating + commentaire optionnel).
 */
export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

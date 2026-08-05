import type { IMessage } from "@/components/features/message-bubble"

export const SESSION_STORAGE_KEY = "dam_ia_chat_session_id"
export const SUGGESTIONS_STORAGE_KEY = "dam_ia_used_suggestions"

// Durée de l'animation morphe de la bulle d'accueil vers le haut du chat
export const MORPH_DURATION_MS = 600

// Décalage vertical en px entre le bas du header et le premier message (correspond à py-6)
export const MESSAGES_TOP_PADDING = 24

// Identifiant de la bulle d'accueil. Elle n'est jamais persistée en base : son
// texte — comme les suggestions et les phrases de « réflexion » — vit dans le
// dictionnaire de traduction (cf. `src/constants/dictionary.ts`) et suit donc
// toujours la langue courante.
export const WELCOME_MESSAGE_ID = "welcome"

/** Construit la bulle d'accueil à partir de son texte traduit. */
export function createWelcomeMessage(content: string): IMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: "assistant",
    content,
    createdAt: new Date(),
  }
}

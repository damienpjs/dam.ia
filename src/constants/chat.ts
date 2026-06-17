import type { IMessage } from "@/components/features/message-bubble"

export const SESSION_STORAGE_KEY = "dam_ia_chat_session_id"
export const SUGGESTIONS_STORAGE_KEY = "dam_ia_used_suggestions"

export const SUGGESTIONS = ["Quelles sont tes compétences ?", "Parle-moi de tes projets", "Quel est ton parcours ?", "Quels sont tes loisirs et passions ?", "Comment as-tu commencé à coder ?", "Quelles langues parles-tu ?"]

// Durée de l'animation morphe de la bulle d'accueil vers le haut du chat
export const MORPH_DURATION_MS = 600

// Décalage vertical en px entre le bas du header et le premier message (correspond à py-6)
export const MESSAGES_TOP_PADDING = 24

export const WELCOME_MESSAGE: IMessage = {
  id: "welcome",
  role: "assistant",
  content: "👋 Je suis Damien, lead tech JS. Pose-moi tes questions sur mon parcours, mes compétences, mes projets, mes loisirs ou mes passions.",
  createdAt: new Date(),
}

import type { IMessage } from "@/components/features/message-bubble"

export const SESSION_STORAGE_KEY = "dam_ia_chat_session_id"
export const SUGGESTIONS_STORAGE_KEY = "dam_ia_used_suggestions"

export const SUGGESTIONS = ["Quelles sont tes compétences ?", "Parle-moi de tes soft skills", "Quel est ton parcours ?", "Quels sont tes loisirs et passions ?", "Que penses-tu du full remote ?", "Quelles langues parles-tu ?"]

// Phrases de « réflexion » affichées (tapées lettre par lettre) en attendant la réponse de l'IA.
// Ton un peu edgy / autodérision — les « … » sont ajoutés et animés séparément, ne pas les inclure ici.
export const THINKING_PHRASES = [
  "Damien réfléchit",
  "Damien consulte ses neurones",
  "Damien chauffe les synapses",
  "Damien fouille dans sa matière grise",
  "Damien fait semblant de savoir",
  "Damien improvise un truc intelligent",
  "Damien gratte le fond du cerveau",
  "Damien convoque le café",
  "Damien rumine ta question",
  "Damien compile une réponse pas trop nulle",
  "Damien tergiverse avec classe",
  "Damien interroge son ego",
  "Damien procrastine élégamment",
  "Damien cherche une vanne potable",
  "Damien recharge ses deux neurones",
]

// Durée de l'animation morphe de la bulle d'accueil vers le haut du chat
export const MORPH_DURATION_MS = 600

// Décalage vertical en px entre le bas du header et le premier message (correspond à py-6)
export const MESSAGES_TOP_PADDING = 24

export const WELCOME_MESSAGE: IMessage = {
  id: "welcome",
  role: "assistant",
  content: "👋 **Product Builder** & **enthousiaste IA** (avec un solide socle en **Technical Lead JS**). On peut parler de mon parcours, mes projets, mes loisirs ou mes passions ;)",
  createdAt: new Date(),
}

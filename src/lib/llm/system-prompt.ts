import { PERSONA } from "@/constants/llm"
import { MOOD_DIRECTIVE } from "@/lib/llm/mood-tag"

/**
 * Construit le system prompt complet avec le persona, la date du jour et la
 * consigne d'humeur (balise lue par le personnage 3D, retirée avant affichage).
 * Agnostique du provider : partagé par Gemini, Groq et tout futur provider.
 *
 * @returns System prompt complet
 */
export function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  return `Date du jour : ${today}\n\n` + PERSONA + `\n\n${MOOD_DIRECTIVE}`
}

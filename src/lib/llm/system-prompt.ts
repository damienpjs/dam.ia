import { PERSONA } from "@/constants/llm"

/**
 * Construit le system prompt complet avec le persona et la date du jour.
 * Agnostique du provider : partagé par Gemini, Groq et tout futur provider.
 *
 * @returns System prompt complet
 */
export function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  return `Date du jour : ${today}\n\n` + PERSONA
}

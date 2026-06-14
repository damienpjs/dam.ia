import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ILLMProvider } from "./types"
import { PERSONA } from "./persona"
import { isQuotaExceededError, QuotaExceededError } from "./errors"
import { loadFormattedContent } from "../content-loader"

/**
 * Timeout par défaut pour les requêtes Gemini (en ms)
 */
export const GEMINI_TIMEOUT_MS = 30_000

/**
 * Construit le system prompt complet avec le persona et le contexte documentaire.
 * Le contenu est chargé depuis /content/*.md et injecté après le persona.
 *
 * @returns System prompt complet
 */
export function buildSystemPrompt(): string {
  const contentContext = loadFormattedContent()
  return PERSONA + contentContext
}

/**
 * Provider Gemini utilisant le SDK officiel Google.
 * Streame les réponses token par token via l'API Gemini.
 */
export class GeminiProvider implements ILLMProvider {
  private readonly model

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(),
    })
  }

  async *streamResponse(message: string): AsyncIterable<string> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS)

    try {
      const result = await this.model.generateContentStream(
        {
          contents: [{ role: "user", parts: [{ text: message }] }],
        },
        { signal: abortController.signal },
      )

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          yield text
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("La requête a expiré (timeout)")
      }
      if (isQuotaExceededError(error)) {
        throw new QuotaExceededError()
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

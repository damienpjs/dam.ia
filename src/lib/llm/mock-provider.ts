import { getMockResponse } from "@/lib/mock-responses"
import type { ILLMProvider } from "./types"

/**
 * Provider mock qui utilise les réponses prédéfinies.
 * Utilisé comme fallback quand aucune clé API n'est configurée.
 */
export class MockProvider implements ILLMProvider {
  async *streamResponse(message: string): AsyncIterable<string> {
    const response = getMockResponse(message)

    for (const char of response) {
      yield char
    }
  }
}

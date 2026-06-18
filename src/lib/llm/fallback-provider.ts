import type { ILLMProvider, IConversationMessage } from "./types"
import { QuotaExceededError } from "./errors"

/**
 * Provider composite qui enchaîne plusieurs providers par ordre de priorité.
 *
 * Si un provider lève une `QuotaExceededError` **avant d'avoir streamé le
 * moindre token**, on bascule de façon transparente sur le suivant. Une fois
 * qu'un token a été émis, on ne peut plus basculer (sinon la réponse serait
 * tronquée puis dupliquée) : l'erreur est alors propagée.
 *
 * Le dernier provider de la chaîne propage toujours son erreur, ce qui permet
 * à l'appelant (route /api/chat) de gérer son propre repli (notice + mock).
 */
export class FallbackProvider implements ILLMProvider {
  private readonly providers: ILLMProvider[]

  constructor(providers: ILLMProvider[]) {
    if (providers.length === 0) {
      throw new Error("FallbackProvider requiert au moins un provider")
    }
    this.providers = providers
  }

  async *streamResponse(message: string, history: IConversationMessage[] = []): AsyncIterable<string> {
    for (let i = 0; i < this.providers.length; i++) {
      const isLast = i === this.providers.length - 1
      let emitted = false

      try {
        for await (const text of this.providers[i].streamResponse(message, history)) {
          emitted = true
          yield text
        }
        return
      } catch (error) {
        const canFallback = error instanceof QuotaExceededError && !emitted && !isLast
        if (!canFallback) {
          throw error
        }
        // Quota atteint sur ce provider et rien n'a été streamé → on tente le suivant.
      }
    }
  }
}

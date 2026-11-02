import { STREAM_RESTART, type ILLMProvider, type IConversationMessage, type TStreamPart } from "./types"
import { QuotaExceededError, ServiceUnavailableError } from "./errors"

/**
 * Provider composite qui enchaîne plusieurs providers par ordre de priorité.
 *
 * Si un provider lève une erreur transitoire (`QuotaExceededError`, quota 429,
 * ou `ServiceUnavailableError`, surcharge 503) **avant d'avoir streamé le
 * moindre token**, on bascule de façon transparente sur le suivant.
 *
 * Si l'erreur survient **après** des tokens (coupure, surcharge en plein flux),
 * la réponse est reprise à zéro sur le suivant, précédée du marqueur
 * `STREAM_RESTART` pour que le client jette le début tronqué au lieu de le
 * dupliquer.
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

  async *streamResponse(message: string, history: IConversationMessage[] = []): AsyncIterable<TStreamPart> {
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
        const isTransient = error instanceof QuotaExceededError || error instanceof ServiceUnavailableError
        const canFallback = !isLast && (emitted || isTransient)
        if (!canFallback) {
          throw error
        }
        // Rien n'a été streamé et l'erreur est transitoire : on tente le suivant sans bruit.
        // Réponse déjà entamée : on signale la reprise, quelle que soit l'erreur (coupure réseau incluse).
        if (emitted) yield STREAM_RESTART
      }
    }
  }
}

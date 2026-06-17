import type { TLLMProviderName } from "./types"
import { QUOTA_STATUS_TTL_MS } from "@/constants/llm"

/**
 * Suivi en mémoire du statut de quota par provider LLM.
 *
 * Stocke l'instant où un provider a renvoyé une erreur de quota. Le statut
 * « quota atteint » expire automatiquement après `QUOTA_STATUS_TTL_MS` (les
 * quotas gratuits se réinitialisant côté fournisseur), ou dès qu'un appel
 * réussit (`markOperational`).
 *
 * Note : l'état est volatile (réinitialisé au redémarrage / par instance
 * serverless). Suffisant pour un indicateur d'UI en temps réel.
 */
const quotaExceededAt = new Map<TLLMProviderName, number>()

/** Marque un provider comme ayant atteint son quota (timestamp courant). */
export function markQuotaExceeded(provider: TLLMProviderName): void {
  quotaExceededAt.set(provider, Date.now())
}

/** Marque un provider comme opérationnel (efface tout statut de quota atteint). */
export function markOperational(provider: TLLMProviderName): void {
  quotaExceededAt.delete(provider)
}

/**
 * Indique si le quota d'un provider est actuellement considéré comme atteint.
 * Le statut expire passé `QUOTA_STATUS_TTL_MS` et est alors purgé.
 */
export function isQuotaExceeded(provider: TLLMProviderName): boolean {
  const at = quotaExceededAt.get(provider)
  if (at === undefined) return false

  if (Date.now() - at > QUOTA_STATUS_TTL_MS) {
    quotaExceededAt.delete(provider)
    return false
  }
  return true
}

/** Réinitialise tout le suivi (utilisé par les tests). */
export function resetQuotaStatus(): void {
  quotaExceededAt.clear()
}

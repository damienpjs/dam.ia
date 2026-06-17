import { getConfiguredProviderNames } from "@/lib/llm"
import { isQuotaExceeded } from "@/lib/llm/quota-status"

/**
 * Statut d'un provider renvoyé au client.
 */
interface IProviderStatus {
  name: string
  quotaExceeded: boolean
}

/**
 * GET /api/llm/status
 *
 * Retourne le statut de quota des providers actifs selon la configuration
 * (.env). Un seul provider si forcé/seul, les deux si la chaîne de fallback
 * est active, liste vide en mode mock.
 *
 * Réponse: { providers: { name: string, quotaExceeded: boolean }[] }
 */
export async function GET(): Promise<Response> {
  const providers: IProviderStatus[] = getConfiguredProviderNames().map((name) => ({
    name,
    quotaExceeded: isQuotaExceeded(name),
  }))

  return new Response(JSON.stringify({ providers }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  })
}

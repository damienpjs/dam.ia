"use client"

import { useCallback, useEffect, useState } from "react"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { LLM_STATUS_REFRESH_EVENT, PROVIDER_LABELS } from "@/constants/llm"

interface IProviderStatus {
  name: string
  quotaExceeded: boolean
}

/**
 * Pastilles de statut des providers LLM affichées dans le header.
 *
 * Une pastille par provider actif (selon la configuration .env) : point vert =
 * opérationnel, point ambre = quota atteint. Se rafraîchit au montage et à
 * chaque évènement `LLM_STATUS_REFRESH_EVENT` (émis après chaque réponse).
 */
export function ProviderStatus() {
  const [providers, setProviders] = useState<IProviderStatus[]>([])

  const refresh = useCallback(() => {
    fetch("/api/llm/status")
      .then((res) => (res.ok ? (res.json() as Promise<{ providers: IProviderStatus[] }>) : Promise.reject(new Error("statut indisponible"))))
      .then((data) => setProviders(data.providers))
      .catch(() => {
        // Statut purement indicatif : on ignore silencieusement les échecs.
      })
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(LLM_STATUS_REFRESH_EVENT, refresh)
    return () => window.removeEventListener(LLM_STATUS_REFRESH_EVENT, refresh)
  }, [refresh])

  if (providers.length === 0) return null

  return (
    <div data-testid="provider-status" className="flex items-center gap-1.5">
      {providers.map((provider) => {
        const operational = !provider.quotaExceeded
        const label = PROVIDER_LABELS[provider.name] ?? provider.name
        const stateText = operational ? "disponible" : "indisponible"

        return (
          <Tooltip key={provider.name} content={`${label} : ${stateText}`}>
            <span role="status" aria-label={`${label} : ${stateText}`} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300 backdrop-blur-sm">
              <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", operational ? "bg-emerald-400" : "bg-red-400")} />
              {label}
            </span>
          </Tooltip>
        )
      })}
    </div>
  )
}

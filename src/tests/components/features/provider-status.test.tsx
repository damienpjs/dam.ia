import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { ProviderStatus } from "@/components/features/provider-status"
import { LLM_STATUS_REFRESH_EVENT } from "@/constants/llm"

interface IProviderStatus {
  name: string
  quotaExceeded: boolean
}

function jsonResponse(providers: IProviderStatus[]) {
  return { ok: true, json: async () => ({ providers }) }
}

describe("ProviderStatus", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("interroge /api/llm/status au montage", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    render(<ProviderStatus />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/llm/status"))
  })

  it("n'affiche rien quand aucun provider n'est configuré", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    render(<ProviderStatus />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByTestId("provider-status")).toBeNull()
  })

  it("affiche une pastille opérationnelle (point vert) pour Gemini", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ name: "gemini", quotaExceeded: false }]))
    render(<ProviderStatus />)

    const pill = await screen.findByRole("status")
    expect(pill).toHaveAccessibleName("Gemini : opérationnel")
    expect(pill.querySelector(".bg-emerald-400")).not.toBeNull()
  })

  it("affiche une pastille quota atteint (point ambre) pour Groq", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ name: "groq", quotaExceeded: true }]))
    render(<ProviderStatus />)

    const pill = await screen.findByRole("status")
    expect(pill).toHaveAccessibleName("Groq : quota atteint")
    expect(pill.querySelector(".bg-amber-400")).not.toBeNull()
  })

  it("affiche deux pastilles séparées quand la chaîne de fallback est active", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { name: "gemini", quotaExceeded: false },
        { name: "groq", quotaExceeded: true },
      ]),
    )
    render(<ProviderStatus />)

    await screen.findByText("Gemini")
    expect(screen.getByText("Groq")).toBeInTheDocument()
    expect(screen.getAllByRole("status")).toHaveLength(2)
  })

  it("affiche le nom brut pour un provider sans libellé connu", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ name: "inconnu", quotaExceeded: false }]))
    render(<ProviderStatus />)

    const pill = await screen.findByRole("status")
    expect(pill).toHaveAccessibleName("inconnu : opérationnel")
  })

  it("se rafraîchit sur l'évènement de refresh", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ name: "gemini", quotaExceeded: false }]))
      .mockResolvedValueOnce(jsonResponse([{ name: "gemini", quotaExceeded: true }]))
    render(<ProviderStatus />)

    const pill = await screen.findByRole("status")
    expect(pill).toHaveAccessibleName("Gemini : opérationnel")

    act(() => {
      window.dispatchEvent(new Event(LLM_STATUS_REFRESH_EVENT))
    })

    await waitFor(() => expect(screen.getByRole("status")).toHaveAccessibleName("Gemini : quota atteint"))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("ignore silencieusement une réponse non-ok", async () => {
    fetchMock.mockResolvedValue({ ok: false })
    render(<ProviderStatus />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByTestId("provider-status")).toBeNull()
  })

  it("ignore silencieusement un rejet réseau", async () => {
    fetchMock.mockRejectedValue(new Error("réseau indisponible"))
    render(<ProviderStatus />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByTestId("provider-status")).toBeNull()
  })
})

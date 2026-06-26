import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ThinkingPhrase } from "@/components/features/thinking-phrase"
import { THINKING_PHRASES } from "@/constants/chat"

describe("ThinkingPhrase", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Phrase déterministe pour les assertions
    vi.spyOn(Math, "random").mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("rend le conteneur avec son aria-label", () => {
    render(<ThinkingPhrase />)
    expect(screen.getByTestId("thinking-phrase")).toBeInTheDocument()
    expect(screen.getByLabelText("Damien réfléchit")).toBeInTheDocument()
  })

  it("affiche trois points animés (sautillants)", () => {
    const { container } = render(<ThinkingPhrase />)
    const dots = container.querySelectorAll(".animate-thinking-dot")
    expect(dots).toHaveLength(3)
    expect(dots[0]).toHaveTextContent(".")
  })

  it("commence sans aucune lettre puis tape la phrase caractère par caractère", () => {
    const phrase = THINKING_PHRASES[0]
    const { container } = render(<ThinkingPhrase />)
    const textSpan = container.querySelector("[data-testid='thinking-phrase'] > span")

    // Rien de tapé au montage
    expect(textSpan?.textContent).toBe("")

    // Après un tick : une lettre
    act(() => {
      vi.advanceTimersByTime(45)
    })
    expect(textSpan?.textContent).toBe(phrase.slice(0, 1))

    // Après plusieurs ticks : davantage de lettres
    act(() => {
      vi.advanceTimersByTime(45 * 3)
    })
    expect(textSpan?.textContent).toBe(phrase.slice(0, 4))
  })

  it("affiche la phrase complète une fois tous les caractères tapés et n'en ajoute pas plus", () => {
    const phrase = THINKING_PHRASES[0]
    const { container } = render(<ThinkingPhrase />)
    const textSpan = container.querySelector("[data-testid='thinking-phrase'] > span")

    act(() => {
      vi.advanceTimersByTime(45 * phrase.length)
    })
    expect(textSpan?.textContent).toBe(phrase)

    // L'intervalle est arrêté : aucun caractère supplémentaire
    act(() => {
      vi.advanceTimersByTime(45 * 5)
    })
    expect(textSpan?.textContent).toBe(phrase)
  })

  it("affiche la phrase complète immédiatement si l'utilisateur préfère réduire les animations", () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia

    const { container } = render(<ThinkingPhrase />)
    const textSpan = container.querySelector("[data-testid='thinking-phrase'] > span")
    expect(textSpan?.textContent).toBe(THINKING_PHRASES[0])

    window.matchMedia = original
  })
})

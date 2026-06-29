import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { Timeline } from "@/components/features/timeline"

/** Stub minimal d'IntersectionObserver pour les tests JSDOM. */
function mockIntersectionObserver(intersecting: boolean) {
  const observe = vi.fn()
  const disconnect = vi.fn()

  const MockObserver = vi.fn((callback: IntersectionObserverCallback) => {
    // Déclenche le callback immédiatement avec l'état voulu
    setTimeout(() => {
      callback(
        [{ isIntersecting: intersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    }, 0)
    return { observe, disconnect }
  })

  vi.stubGlobal("IntersectionObserver", MockObserver)
  return { MockObserver, observe, disconnect }
}

const ENTRIES = [
  {
    period: "2024 — présent",
    role: "Lead React",
    org: "Acme",
    description: "Lead front-end.",
    stack: ["React", "TypeScript"],
    current: true,
  },
  {
    period: "2020 — 2024",
    role: "Développeur web",
    org: "Foo Corp",
    description: "Développement web.",
  },
]

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("Timeline", () => {
  it("rend toutes les entrées", () => {
    mockIntersectionObserver(false)
    render(<Timeline entries={ENTRIES} />)
    expect(screen.getByText("Acme")).toBeInTheDocument()
    expect(screen.getByText("Foo Corp")).toBeInTheDocument()
  })

  it("affiche le badge Actuel sur l'entrée courante", () => {
    mockIntersectionObserver(false)
    render(<Timeline entries={ENTRIES} />)
    expect(screen.getByText("Actuel")).toBeInTheDocument()
  })

  it("affiche les technologies de la stack", () => {
    mockIntersectionObserver(false)
    render(<Timeline entries={ENTRIES} />)
    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
  })

  it("n'affiche pas de stack si absente", () => {
    mockIntersectionObserver(false)
    render(<Timeline entries={[ENTRIES[1]]} />)
    expect(screen.queryByRole("list", { hidden: true })).toBeInTheDocument() // ol
    // Pas de <li> de tech
    expect(screen.queryByText("React")).not.toBeInTheDocument()
  })

  it("démarre invisible puis devient visible à l'intersection", async () => {
    const { MockObserver, observe, disconnect } = mockIntersectionObserver(true)

    render(<Timeline entries={[ENTRIES[0]]} />)

    expect(MockObserver).toHaveBeenCalled()
    expect(observe).toHaveBeenCalled()

    // Laisse le setTimeout se déclencher
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(disconnect).toHaveBeenCalled()
  })

  it("observe chaque élément de la liste (un observer par entrée)", () => {
    const { observe } = mockIntersectionObserver(false)
    render(<Timeline entries={ENTRIES} />)
    expect(observe).toHaveBeenCalledTimes(ENTRIES.length)
  })

  it("n'affiche rien avec un tableau vide", () => {
    mockIntersectionObserver(false)
    const { container } = render(<Timeline entries={[]} />)
    const ol = container.querySelector("ol")
    expect(ol?.children.length).toBe(0)
  })
})

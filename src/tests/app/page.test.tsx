import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Home from "@/app/page"

vi.mock("@/components/features/hero-scene", () => ({
  HeroScene: () => <div data-testid="hero-scene" />,
}))

vi.mock("@/components/features/chat-interface", () => ({
  ChatInterface: ({ messagesVisible }: { messagesVisible?: boolean }) => <div data-testid="chat-interface" data-messages-visible={String(messagesVisible)} />,
}))

// Force des dimensions non nulles pour exercer le morph (jsdom renvoie 0 par défaut)
function stubLayout() {
  const rect = { top: 100, left: 0, right: 300, bottom: 150, width: 300, height: 50, x: 0, y: 100, toJSON: () => ({}) } as DOMRect
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Page d'accueil (/)", () => {
  it("affiche l'accroche principale", () => {
    render(<Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/salut ! moi c'est damien/i)
  })

  it("met en exergue un terme avec un dégradé animé", () => {
    const { container } = render(<Home />)
    const highlight = container.querySelector(".text-gradient-animated")
    expect(highlight).not.toBeNull()
    expect(highlight).toHaveTextContent(/Damien/i)
  })

  it("affiche la bulle d'accueil comme premier message", () => {
    render(<Home />)
    expect(screen.getByTestId("markdown-content")).toHaveTextContent(/Product Builder & enthousiaste IA/i)
    // "Product Builder" est mis en gras via markdown (**…**)
    expect(screen.getByText("Product Builder").tagName).toBe("STRONG")
  })

  it("affiche le bouton CTA pour démarrer le chat", () => {
    render(<Home />)
    const btn = screen.getByRole("button", { name: /commencer la conversation/i })
    expect(btn).toBeInTheDocument()
  })

  it("affiche les étiquettes des technos maîtrisées", () => {
    render(<Home />)
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
    expect(screen.getByText("Next.js")).toBeInTheDocument()
    expect(screen.getByText("Qdrant")).toBeInTheDocument()
    expect(screen.getByText("C#")).toBeInTheDocument()
  })

  it("rend la hero scene 3D", () => {
    render(<Home />)
    expect(screen.getByTestId("hero-scene")).toBeInTheDocument()
  })

  it("ouvre le panneau chat au clic sur la bulle d'accueil", async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole("button", { name: /commencer la conversation/i }))
    expect(screen.getByTestId("chat-interface")).toBeInTheDocument()
  })

  it("ferme le panneau chat au clic sur le logo", async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole("button", { name: /commencer la conversation/i }))
    await user.click(screen.getByRole("button", { name: /damien pasulj/i }))
    expect(screen.getByRole("button", { name: /commencer la conversation/i })).toBeInTheDocument()
  })

  it("anime la bulle d'accueil (morph) vers le haut du chat puis révèle les messages", async () => {
    stubLayout()
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByRole("button", { name: /commencer la conversation/i }))

    // Pendant le morph : le clone est présent et la liste des messages est masquée
    const clone = screen.getByTestId("welcome-clone")
    expect(clone).toBeInTheDocument()
    expect(screen.getByTestId("chat-interface")).toHaveAttribute("data-messages-visible", "false")

    // Fin de la transition : le clone disparaît, les messages deviennent visibles
    fireEvent.transitionEnd(clone)
    expect(screen.queryByTestId("welcome-clone")).not.toBeInTheDocument()
    expect(screen.getByTestId("chat-interface")).toHaveAttribute("data-messages-visible", "true")
  })

  it("réinitialise le morph à la fermeture pendant la transition", async () => {
    stubLayout()
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByRole("button", { name: /commencer la conversation/i }))
    expect(screen.getByTestId("welcome-clone")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /damien pasulj/i }))
    expect(screen.queryByTestId("welcome-clone")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /commencer la conversation/i })).toBeInTheDocument()
  })
})

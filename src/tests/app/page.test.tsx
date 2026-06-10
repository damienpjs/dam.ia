import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Home from "@/app/page"

vi.mock("@/components/features/animated-background", () => ({
  AnimatedBackground: () => <div data-testid="animated-background" />,
}))

describe("Page d'accueil (/)", () => {
  it("affiche le titre principal avec le nom 'Damien'", () => {
    render(<Home />)
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(screen.getByText("Damien")).toBeInTheDocument()
  })

  it("affiche la description du profil", () => {
    render(<Home />)
    expect(screen.getByText(/Lead Tech JS/i)).toBeInTheDocument()
  })

  it("affiche le bouton CTA pour démarrer le chat", () => {
    render(<Home />)
    const btn = screen.getByRole("button", { name: /commencer la conversation/i })
    expect(btn).toBeInTheDocument()
  })

  it("affiche les badges tech stack", () => {
    render(<Home />)
    expect(screen.getByText("Next.js")).toBeInTheDocument()
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
    expect(screen.getByText("OpenAI")).toBeInTheDocument()
    expect(screen.getByText("Qdrant")).toBeInTheDocument()
  })

  it("rend l'AnimatedBackground", () => {
    render(<Home />)
    expect(screen.getByTestId("animated-background")).toBeInTheDocument()
  })

  it("ouvre le panneau chat au clic sur le bouton CTA", async () => {
    const user = userEvent.setup()
    render(<Home />)
    const btn = screen.getByRole("button", { name: /commencer la conversation/i })
    await user.click(btn)
    expect(screen.getByPlaceholderText(/écris ton message/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled()
  })

  it("ferme le panneau chat au clic sur dam.ia", async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole("button", { name: /commencer la conversation/i }))
    await user.click(screen.getByRole("button", { name: /dam\.ia/i }))
    expect(screen.getByRole("button", { name: /commencer la conversation/i })).toBeInTheDocument()
  })
})

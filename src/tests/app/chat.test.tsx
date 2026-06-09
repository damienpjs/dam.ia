import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ChatPage from "@/app/chat/page"

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock("@/components/features/animated-background", () => ({
  AnimatedBackground: () => <div data-testid="animated-background" />,
}))

describe("Page Chat (/chat)", () => {
  it("affiche le header avec le lien vers l'accueil", () => {
    render(<ChatPage />)
    const link = screen.getByRole("link", { name: /dam\.ia/i })
    expect(link).toHaveAttribute("href", "/")
  })

  it("affiche le message de disponibilité prochaine", () => {
    render(<ChatPage />)
    expect(screen.getByText(/bientôt disponible/i)).toBeInTheDocument()
  })

  it("affiche la mention Phase 2", () => {
    render(<ChatPage />)
    expect(screen.getByText(/Phase 2/i)).toBeInTheDocument()
  })

  it("affiche le champ de saisie désactivé", () => {
    render(<ChatPage />)
    const input = screen.getByPlaceholderText(/écris ton message/i)
    expect(input).toBeDisabled()
  })

  it("affiche le bouton Envoyer désactivé", () => {
    render(<ChatPage />)
    const btn = screen.getByRole("button", { name: /envoyer/i })
    expect(btn).toBeDisabled()
  })

  it("rend l'AnimatedBackground", () => {
    render(<ChatPage />)
    expect(screen.getByTestId("animated-background")).toBeInTheDocument()
  })
})

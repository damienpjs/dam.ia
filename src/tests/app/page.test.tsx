import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Home from "@/app/page"

// Mock des composants Next.js et internes
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

  it("affiche le bouton CTA vers /chat", () => {
    render(<Home />)
    const link = screen.getByRole("link", { name: /commencer la conversation/i })
    expect(link).toHaveAttribute("href", "/chat")
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
})

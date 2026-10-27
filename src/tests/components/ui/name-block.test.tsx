import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NameBlock } from "@/components/ui/name-block"

describe("NameBlock", () => {
  it("donne « damien pasulj » comme texte du titre, malgré le saut de ligne", () => {
    render(<NameBlock />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("damien pasulj")
  })

  it("dessine le carré corail sans l'exposer aux lecteurs d'écran", () => {
    const { container } = render(<NameBlock />)
    const dot = container.querySelector("h1 > span")
    expect(dot).toHaveAttribute("aria-hidden", "true")
    expect(dot).toHaveClass("bg-dot")
  })

  it("garde l'interlignage serré quelle que soit la taille passée", () => {
    render(<NameBlock className="text-[60px] lg:text-[128px]" />)
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toHaveClass("text-[60px]", "lg:text-[128px]", "leading-[0.86]")
  })
})

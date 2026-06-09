import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { AnimatedBackground } from "@/components/features/animated-background"

// Mock requestAnimationFrame et cancelAnimationFrame
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
})

describe("AnimatedBackground", () => {
  it("rend un élément canvas", () => {
    const { container } = render(<AnimatedBackground />)
    const canvas = container.querySelector("canvas")
    expect(canvas).toBeInTheDocument()
  })

  it("le canvas a les classes de positionnement attendues", () => {
    const { container } = render(<AnimatedBackground />)
    const canvas = container.querySelector("canvas")
    expect(canvas).toHaveClass("fixed")
  })

  it("le canvas est positionné derrière le contenu (-z-10)", () => {
    const { container } = render(<AnimatedBackground />)
    const canvas = container.querySelector("canvas")
    expect(canvas).toHaveClass("-z-10")
  })

  it("le canvas couvre tout l'écran (inset-0)", () => {
    const { container } = render(<AnimatedBackground />)
    const canvas = container.querySelector("canvas")
    expect(canvas).toHaveClass("inset-0")
  })

  it("le canvas a l'attribut aria-hidden", () => {
    const { container } = render(<AnimatedBackground />)
    const canvas = container.querySelector("canvas")
    expect(canvas).toHaveAttribute("aria-hidden", "true")
  })
})

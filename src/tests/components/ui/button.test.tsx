import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("s'affiche correctement avec le contenu enfant", () => {
    render(<Button>Cliquer</Button>)
    expect(screen.getByRole("button", { name: "Cliquer" })).toBeInTheDocument()
  })

  it("applique la variante 'default' par défaut", () => {
    render(<Button>Default</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("bg-primary")
  })

  it("applique la variante 'outline'", () => {
    render(<Button variant="outline">Outline</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("border-border")
  })

  it("applique la variante 'destructive'", () => {
    render(<Button variant="destructive">Supprimer</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("bg-destructive/10")
  })

  it("applique la variante 'ghost'", () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("hover:bg-muted")
  })

  it("applique la taille 'lg'", () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("h-9")
  })

  it("applique la taille 'sm'", () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("h-7")
  })

  it("est désactivé quand la prop disabled est présente", () => {
    render(<Button disabled>Désactivé</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("accepte une className personnalisée", () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole("button")).toHaveClass("custom-class")
  })

  it("déclenche onClick au clic", async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <Button
        onClick={() => {
          clicked = true
        }}
      >
        Clic
      </Button>,
    )
    await user.click(screen.getByRole("button"))
    expect(clicked).toBe(true)
  })

  it("ne déclenche pas onClick quand disabled", async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <Button
        disabled
        onClick={() => {
          clicked = true
        }}
      >
        Clic
      </Button>,
    )
    await user.click(screen.getByRole("button"))
    expect(clicked).toBe(false)
  })
})

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DirLabel } from "@/components/ui/dir-label"

describe("DirLabel", () => {
  it("rend un titre de section lisible avec son contenu", () => {
    render(<DirLabel name="expérience/" meta="(3 éléments)" />)
    expect(screen.getByRole("heading", { level: 2, name: "expérience/ (3 éléments)" })).toBeInTheDocument()
  })

  it("passe le nom en capitales par le style, sans toucher au texte", () => {
    render(<DirLabel name="projets/" />)
    const name = screen.getByText("projets/")
    expect(name).toHaveClass("uppercase", "font-bold")
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^projets\/$/)
  })

  it("reporte la className", () => {
    render(<DirLabel name="a/" className="mt-10" />)
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("mt-10")
  })
})

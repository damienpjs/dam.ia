import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { FileBox } from "@/components/ui/file-box"

describe("FileBox", () => {
  it("affiche le nom du fichier, sa métadonnée et son contenu", () => {
    render(
      <FileBox name="README.md" meta="(431 o)">
        <p>Contenu</p>
      </FileBox>,
    )
    const box = screen.getByTestId("file-box")
    expect(box).toHaveTextContent("README.md (431 o)")
    expect(screen.getByText("README.md")).toHaveClass("file-name")
    expect(screen.getByText("(431 o)")).toHaveClass("text-coral-ink")
    expect(screen.getByText("Contenu")).toBeInTheDocument()
  })

  it("omet la métadonnée quand elle n'est pas fournie", () => {
    render(<FileBox name="photo.jpg">image</FileBox>)
    expect(screen.getByTestId("file-box").querySelector("p")).toHaveTextContent(/^photo\.jpg$/)
  })

  it("fait du nom un lien externe quand il pointe quelque part", () => {
    render(
      <FileBox name="github.com/damienpjs/Komfy" href="https://github.com/damienpjs/Komfy">
        projet
      </FileBox>,
    )
    const link = screen.getByRole("link", { name: "github.com/damienpjs/Komfy" })
    expect(link).toHaveAttribute("href", "https://github.com/damienpjs/Komfy")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("se contente d'un filet par défaut", () => {
    render(<FileBox name="a.md">a</FileBox>)
    const box = screen.getByTestId("file-box")
    expect(box).toHaveAttribute("data-tone", "plain")
    expect(box).toHaveClass("border-rule")
  })

  it("passe en aplat teal, texte à l'encre, en ton accent", () => {
    render(
      <FileBox name="todo.md" meta="(184 o)" tone="accent">
        a
      </FileBox>,
    )
    const box = screen.getByTestId("file-box")
    expect(box).toHaveAttribute("data-tone", "accent")
    expect(box).toHaveClass("bg-teal", "text-ink")
    expect(screen.getByText("todo.md")).not.toHaveClass("file-name")
    expect(screen.getByText("(184 o)")).toHaveClass("text-ink")
  })

  it("reporte la className pour le placement dans la grille", () => {
    render(
      <FileBox name="a.md" className="lg:col-span-8">
        a
      </FileBox>,
    )
    expect(screen.getByTestId("file-box")).toHaveClass("lg:col-span-8", "self-start")
  })
})

import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReadmeCard } from "@/components/features/readme-card"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"

afterEach(() => {
  localStorage.clear()
})

describe("ReadmeCard", () => {
  it("présente le texte comme un README.md avec son poids en octets", () => {
    render(<ReadmeCard content="Ici, c’est mon double." />)
    expect(screen.getByText(DICTIONARIES.fr.chat.welcomeFile)).toBeInTheDocument()
    expect(screen.getByTestId("readme-content")).toHaveTextContent("Ici, c’est mon double.")
    // 22 caractères, dont « ’ » (3 octets) : 24 octets
    expect(screen.getByText("(24 o)")).toBeInTheDocument()
  })

  it("garde un fond papier pour rester lisible au-dessus de la scène 3D", () => {
    render(<ReadmeCard content="a" />)
    expect(screen.getByTestId("file-box")).toHaveClass("bg-paper")
  })

  it("exprime le poids dans l'unité de la langue", () => {
    renderWithLocale(<ReadmeCard content="abc" />, "en")
    expect(screen.getByText("(3 B)")).toBeInTheDocument()
  })
})

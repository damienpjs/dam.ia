import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatInterface } from "@/components/features/chat-interface"

vi.mock("@/lib/mock-responses", () => ({
  getMockResponse: vi.fn(() => "Réponse mockée de l'assistant."),
}))

afterEach(() => {
  vi.clearAllMocks()
})

// Helper : user sans délai inter-touches pour des tests rapides
const setup = () => userEvent.setup({ delay: null })

describe("ChatInterface", () => {
  it("affiche le message de bienvenue de l'assistant au chargement", () => {
    render(<ChatInterface />)
    expect(screen.getByText(/Bonjour/i)).toBeInTheDocument()
  })

  it("affiche le message de bienvenue dans une bulle assistant (bg-card)", () => {
    render(<ChatInterface />)
    const bubble = screen.getByText(/Bonjour/i)
    expect(bubble).toHaveClass("bg-card")
  })

  it("rend le textarea de saisie", () => {
    render(<ChatInterface />)
    expect(screen.getByLabelText(/message à envoyer/i)).toBeInTheDocument()
  })

  it("rend le bouton d'envoi", () => {
    render(<ChatInterface />)
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeInTheDocument()
  })

  it("désactive le bouton d'envoi quand l'input est vide", () => {
    render(<ChatInterface />)
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled()
  })

  it("active le bouton d'envoi quand l'input contient du texte", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    expect(screen.getByRole("button", { name: /envoyer/i })).not.toBeDisabled()
  })

  it("met à jour l'input quand l'utilisateur tape", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "test message")
    expect(textarea).toHaveValue("test message")
  })

  it("envoie un message utilisateur au clic sur le bouton", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Salut !")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))
    expect(screen.getByText("Salut !")).toBeInTheDocument()
  })

  it("vide le champ de saisie après l'envoi", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "Bonjour")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))
    expect(textarea).toHaveValue("")
  })

  it("affiche l'indicateur de frappe après l'envoi", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))
    expect(screen.getByTestId("typing-indicator")).toBeInTheDocument()
  })

  it("affiche la réponse de l'assistant après le délai", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(() => expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument(), { timeout: 2000 })
  })

  it("masque l'indicateur de frappe après la réponse", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(() => expect(screen.queryByTestId("typing-indicator")).not.toBeInTheDocument(), { timeout: 2000 })
  })

  it("envoie le message avec la touche Entrée", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "Coucou")
    await user.keyboard("{Enter}")
    expect(screen.getByText("Coucou")).toBeInTheDocument()
  })

  it("n'envoie pas avec Shift+Entrée (saut de ligne)", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "Ligne 1")
    await user.keyboard("{Shift>}{Enter}{/Shift}")
    // Le message ne doit PAS être envoyé — seule la bulle de bienvenue existe
    expect(screen.getAllByTestId("message-bubble")).toHaveLength(1)
  })

  it("désactive le textarea pendant la frappe de l'assistant", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "test")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))
    expect(screen.getByLabelText(/message à envoyer/i)).toBeDisabled()
  })

  it("ignore l'envoi si l'input est uniquement des espaces", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "   ")
    // Le bouton reste disabled (input.trim() est vide)
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled()
    expect(screen.getAllByTestId("message-bubble")).toHaveLength(1)
  })
})

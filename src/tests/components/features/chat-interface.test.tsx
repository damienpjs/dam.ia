import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatInterface } from "@/components/features/chat-interface"
import type { IStreamChatOptions } from "@/lib/stream-chat"
import { streamChat } from "@/lib/stream-chat"

// Mock streamChat pour simuler le streaming
vi.mock("@/lib/stream-chat", () => ({
  streamChat: vi.fn(async (_message: string, options: IStreamChatOptions) => {
    const response = "Réponse mockée de l'assistant."
    for (const char of response) {
      options.onChunk(char)
    }
    options.onComplete?.()
  }),
}))

const mockStreamChat = vi.mocked(streamChat)

beforeEach(() => {
  // Reset to default implementation
  mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
    const response = "Réponse mockée de l'assistant."
    for (const char of response) {
      options.onChunk(char)
    }
    options.onComplete?.()
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// Helper : user sans délai inter-touches pour des tests rapides
const setup = () => userEvent.setup({ delay: null })

describe("ChatInterface", () => {
  it("affiche le message de bienvenue de l'assistant au chargement", () => {
    render(<ChatInterface />)
    expect(screen.getByText(/Damien Pasulj/i)).toBeInTheDocument()
  })

  it("affiche le message de bienvenue dans une bulle assistant (bg-card)", () => {
    render(<ChatInterface />)
    const bubble = screen.getByText(/Damien Pasulj/i)
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

  it("garde le textarea éditable pendant la frappe de l'assistant", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "test")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))
    expect(screen.getByLabelText(/message à envoyer/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/message à envoyer/i)).not.toHaveAttribute("readonly")
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

  it("affiche un message d'erreur si le streaming échoue", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
      options.onError?.(new Error("Erreur réseau"))
    })

    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Test")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/Désolé, une erreur est survenue/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    expect(consoleErrorSpy).toHaveBeenCalledWith("Erreur stream chat:", expect.any(Error))
    consoleErrorSpy.mockRestore()
  })

  it("garde le textarea éditable et désactive le bouton pendant le streaming", async () => {
    // Mock qui ne termine jamais pour tester l'état de streaming
    mockStreamChat.mockImplementation(async () => {
      // Ne jamais appeler onComplete ni onError
      await new Promise(() => {}) // Never resolves
    })

    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Test")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    // Attendre que le streaming commence (après le délai de 300ms)
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled()
      },
      { timeout: 1000 },
    )

    // Le textarea reste éditable
    expect(screen.getByLabelText(/message à envoyer/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/message à envoyer/i)).not.toHaveAttribute("readonly")
  })

  it("remet le focus sur le textarea après la fin du streaming", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i) as HTMLTextAreaElement

    // Spy sur la méthode focus du textarea
    const focusSpy = vi.spyOn(textarea, "focus")

    await user.type(textarea, "Bonjour")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(
      () => {
        expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // focus() doit avoir été appelé après le streaming
    expect(focusSpy).toHaveBeenCalled()
    focusSpy.mockRestore()
  })

  it("remet le focus sur le textarea après une erreur de streaming", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
      options.onError?.(new Error("Erreur réseau"))
    })

    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i) as HTMLTextAreaElement

    // Spy sur la méthode focus du textarea
    const focusSpy = vi.spyOn(textarea, "focus")

    await user.type(textarea, "Test")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/Désolé, une erreur est survenue/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // focus() doit avoir été appelé même après une erreur
    expect(focusSpy).toHaveBeenCalled()
    focusSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it("affiche les suggestions de questions au chargement", () => {
    render(<ChatInterface />)
    expect(screen.getByTestId("suggestions")).toBeInTheDocument()
    expect(screen.getByText("Quelles sont tes compétences ?")).toBeInTheDocument()
    expect(screen.getByText("Parle-moi de tes projets")).toBeInTheDocument()
  })

  it("masque les suggestions pendant le chargement puis les réaffiche", async () => {
    const user = setup()
    render(<ChatInterface />)
    expect(screen.getByTestId("suggestions")).toBeInTheDocument()

    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: /envoyer/i }))

    // Les suggestions disparaissent pendant le streaming
    await waitFor(
      () => {
        expect(screen.queryByTestId("suggestions")).not.toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // Les suggestions réapparaissent après la fin du streaming
    await waitFor(
      () => {
        expect(screen.getByTestId("suggestions")).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it("envoie le message quand on clique sur une suggestion et la retire", async () => {
    const user = setup()
    render(<ChatInterface />)

    await user.click(screen.getByText("Quelles sont tes compétences ?"))

    // Le message utilisateur doit apparaître
    await waitFor(() => {
      expect(screen.getByText("Quelles sont tes compétences ?")).toBeInTheDocument()
    })

    // Pendant le streaming, les suggestions sont masquées
    await waitFor(
      () => {
        expect(screen.queryByTestId("suggestions")).not.toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // Après le streaming, les suggestions réapparaissent sans celle cliquée
    await waitFor(
      () => {
        expect(screen.getByTestId("suggestions")).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByText("Parle-moi de tes projets")).toBeInTheDocument()
    expect(screen.getByText("Quel est ton parcours ?")).toBeInTheDocument()
  })

  it("masque le bloc suggestions quand toutes ont été cliquées", async () => {
    const user = setup()
    render(<ChatInterface />)

    // Cliquer sur chaque suggestion une par une
    const suggestions = ["Quelles sont tes compétences ?", "Parle-moi de tes projets", "Quel est ton parcours ?"]
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i]
      // Attendre que les suggestions réapparaissent (fin du streaming précédent)
      await waitFor(
        () => {
          expect(screen.getByText(suggestion)).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await user.click(screen.getByText(suggestion))

      // Attendre la fin du streaming en vérifiant le nombre de réponses
      await waitFor(
        () => {
          expect(screen.getAllByText("Réponse mockée de l'assistant.")).toHaveLength(i + 1)
        },
        { timeout: 3000 },
      )
    }

    // Toutes les suggestions ont été utilisées
    expect(screen.queryByTestId("suggestions")).not.toBeInTheDocument()
  })
})

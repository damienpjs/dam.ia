import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatInterface } from "@/components/features/chat-interface"
import type { IStreamChatOptions } from "@/lib/stream-chat"
import { streamChat } from "@/lib/stream-chat"
import { SUGGESTIONS, SUGGESTIONS_STORAGE_KEY } from "@/constants/chat"

// Mock streamChat pour simuler le streaming
vi.mock("@/lib/stream-chat", () => ({
  streamChat: vi.fn(async (_message: string, options: IStreamChatOptions) => {
    const response = "Réponse mockée de l'assistant."
    for (const char of response) {
      options.onChunk(char)
    }
    options.onComplete?.({})
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
    options.onComplete?.({})
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

// Helper : user sans délai inter-touches pour des tests rapides
const setup = () => userEvent.setup({ delay: null })

describe("ChatInterface", () => {
  it("affiche le message de bienvenue de l'assistant au chargement", () => {
    render(<ChatInterface />)
    expect(screen.getByTestId("markdown-content")).toHaveTextContent(/Product Builder & enthousiaste IA/i)
    // "Product Builder" est interprété en markdown et rendu en gras
    expect(screen.getByText("Product Builder").tagName).toBe("STRONG")
  })

  it("affiche le message de bienvenue dans une bulle assistant (bg-card)", () => {
    const { container } = render(<ChatInterface />)
    const bubble = container.querySelector(".bg-card")
    expect(bubble).toBeInTheDocument()
    expect(bubble).toHaveTextContent(/Product Builder & enthousiaste IA/i)
  })

  it("affiche la liste des messages par défaut (messagesVisible)", () => {
    const { container } = render(<ChatInterface />)
    expect(container.querySelector(".opacity-100.max-w-3xl")).not.toBeNull()
  })

  it("masque la liste des messages quand messagesVisible est false", () => {
    const { container } = render(<ChatInterface messagesVisible={false} />)
    expect(container.querySelector(".opacity-0.max-w-3xl")).not.toBeNull()
  })

  it("rend le textarea de saisie", () => {
    render(<ChatInterface />)
    expect(screen.getByLabelText(/message à envoyer/i)).toBeInTheDocument()
  })

  it("rend le bouton d'envoi", () => {
    render(<ChatInterface />)
    expect(screen.getByRole("button", { name: "Envoyer"})).toBeInTheDocument()
  })

  it("désactive le bouton d'envoi quand l'input est vide", () => {
    render(<ChatInterface />)
    expect(screen.getByRole("button", { name: "Envoyer"})).toBeDisabled()
  })

  it("active le bouton d'envoi quand l'input contient du texte", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    expect(screen.getByRole("button", { name: "Envoyer"})).not.toBeDisabled()
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
    await user.click(screen.getByRole("button", { name: "Envoyer"}))
    expect(screen.getByText("Salut !")).toBeInTheDocument()
  })

  it("vide le champ de saisie après l'envoi", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))
    expect(textarea).toHaveValue("")
  })

  it("affiche le placeholder de réflexion après l'envoi", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))
    expect(screen.getByTestId("thinking-phrase")).toBeInTheDocument()
  })

  it("affiche la réponse de l'assistant après le délai", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    await waitFor(() => expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument(), { timeout: 2000 })
  })

  it("masque le placeholder de réflexion après la réponse", async () => {
    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    await waitFor(() => expect(screen.queryByTestId("thinking-phrase")).not.toBeInTheDocument(), { timeout: 2000 })
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
    await user.click(screen.getByRole("button", { name: "Envoyer"}))
    expect(screen.getByLabelText(/message à envoyer/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/message à envoyer/i)).not.toHaveAttribute("readonly")
  })

  it("ignore l'envoi si l'input est uniquement des espaces", async () => {
    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i)
    await user.type(textarea, "   ")
    // Le bouton reste disabled (input.trim() est vide)
    expect(screen.getByRole("button", { name: "Envoyer"})).toBeDisabled()
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
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

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
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    // Attendre que le streaming commence (après le délai de 300ms)
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Envoyer"})).toBeDisabled()
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
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

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

  it("stocke les sources RAG dans le message assistant quand elles sont fournies", async () => {
    const mockSources = [
      { label: "CV", source: "cv" },
      { label: "Apizee", source: "experience-apizee" },
    ]

    mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
      options.onChunk("Réponse avec sources.")
      options.onComplete?.({ sources: mockSources })
    })

    const user = setup()
    render(<ChatInterface />)
    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    await waitFor(
      () => {
        expect(screen.getByText("Réponse avec sources.")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
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
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

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
    expect(screen.getByText("Parle-moi de tes soft skills")).toBeInTheDocument()
  })

  it("masque les suggestions pendant le chargement puis les réaffiche", async () => {
    const user = setup()
    render(<ChatInterface />)
    expect(screen.getByTestId("suggestions")).toBeInTheDocument()

    await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

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
    expect(screen.getByText("Parle-moi de tes soft skills")).toBeInTheDocument()
    expect(screen.getByText("Quel est ton parcours ?")).toBeInTheDocument()
  })

  it("masque le bloc suggestions quand toutes ont été cliquées", async () => {
    const user = setup()
    render(<ChatInterface />)

    // Cliquer sur chaque suggestion une par une
    const suggestions = SUGGESTIONS
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

  it("ne remet pas le focus sur le textarea sur un appareil tactile (onComplete)", async () => {
    // Simuler un appareil tactile (pointer: coarse)
    const originalMatchMedia = window.matchMedia
    window.matchMedia = (query: string) =>
      ({
        matches: query === "(pointer: coarse)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList

    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i) as HTMLTextAreaElement
    const focusSpy = vi.spyOn(textarea, "focus")

    await user.type(textarea, "Bonjour")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    await waitFor(
      () => {
        expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // focus() ne doit PAS être appelé sur un appareil tactile
    expect(focusSpy).not.toHaveBeenCalled()
    focusSpy.mockRestore()
    window.matchMedia = originalMatchMedia
  })

  it("renvoie directement le message au clic sur le bouton de réutilisation (sans repasser par le champ)", async () => {
    const user = setup()
    render(<ChatInterface />)

    await user.type(screen.getByLabelText(/message à envoyer/i), "Message à réutiliser")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    await waitFor(
      () => {
        expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    mockStreamChat.mockClear()
    const textarea = screen.getByLabelText(/message à envoyer/i) as HTMLTextAreaElement

    fireEvent.click(screen.getByTestId("reuse-button"))

    // Le message est renvoyé immédiatement : le champ de saisie reste vide…
    expect(textarea).toHaveValue("")

    // …et streamChat est appelé avec le contenu réutilisé
    await waitFor(
      () => {
        expect(mockStreamChat).toHaveBeenCalledWith("Message à réutiliser", expect.anything())
      },
      { timeout: 2000 },
    )

    // Le message réutilisé apparaît une seconde fois dans la conversation
    await waitFor(
      () => {
        expect(screen.getAllByText("Message à réutiliser")).toHaveLength(2)
      },
      { timeout: 2000 },
    )
  })

  describe("Persistance de session (localStorage)", () => {
    it("sauvegarde le sessionId dans localStorage après réception depuis le stream", async () => {
      mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
        options.onChunk("Réponse.")
        options.onComplete?.({ sessionId: "session-abc-123" })
      })

      const user = setup()
      render(<ChatInterface />)
      await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
      await user.click(screen.getByRole("button", { name: "Envoyer"}))

      await waitFor(
        () => {
          expect(localStorage.getItem("dam_ia_chat_session_id")).toBe("session-abc-123")
        },
        { timeout: 2000 },
      )
    })

    it("ne sauvegarde rien dans localStorage si le stream ne retourne pas de sessionId", async () => {
      const user = setup()
      render(<ChatInterface />)
      await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
      await user.click(screen.getByRole("button", { name: "Envoyer"}))

      await waitFor(
        () => {
          expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )

      expect(localStorage.getItem("dam_ia_chat_session_id")).toBeNull()
    })

    it("restaure les messages d'une session existante au chargement", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-existing-456")

      const mockMessages = [
        { id: "msg-1", role: "user", content: "Message restauré", sources: null, createdAt: new Date().toISOString() },
        { id: "msg-2", role: "assistant", content: "Réponse restaurée", sources: [{ label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" }], createdAt: new Date().toISOString() },
      ]

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages }),
        }),
      )

      render(<ChatInterface />)

      await waitFor(
        () => {
          expect(screen.getByText("Message restauré")).toBeInTheDocument()
          expect(screen.getByText("Réponse restaurée")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )

      // Les sources persistées sont réaffichées après rechargement
      expect(screen.getByTestId("message-sources")).toBeInTheDocument()
      expect(screen.getByText("CV (PDF)")).toBeInTheDocument()

      expect(localStorage.getItem("dam_ia_chat_session_id")).toBe("session-existing-456")
    })

    it("restaure une réponse de repli avec le style d'erreur", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-with-error")

      const mockMessages = [
        { id: "msg-1", role: "user", content: "Question sans réponse", status: "ok", sources: null, createdAt: new Date().toISOString() },
        { id: "msg-2", role: "assistant", content: "⚠️ Une erreur est survenue. Réessaie dans un instant.", status: "error", sources: null, createdAt: new Date().toISOString() },
      ]

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages }),
        }),
      )

      render(<ChatInterface />)

      await waitFor(
        () => {
          expect(screen.getByTestId("message-bubble-error")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )

      expect(screen.getByText("⚠️ Une erreur est survenue. Réessaie dans un instant.")).toBeInTheDocument()
    })

    it("applique le style d'erreur quand onComplete renvoie status 'error'", async () => {
      mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
        const response = "⚠️ Une erreur est survenue. Réessaie dans un instant."
        for (const char of response) {
          options.onChunk(char)
        }
        options.onComplete?.({ status: "error" })
      })

      const user = setup()
      render(<ChatInterface />)

      const textarea = screen.getByLabelText("Message à envoyer")
      await user.type(textarea, "Provoque une erreur")
      await user.keyboard("{Enter}")

      await waitFor(
        () => {
          expect(screen.getByTestId("message-bubble-error")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it("supprime le sessionId du localStorage et démarre une nouvelle session si le fetch échoue", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-invalid")

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")))

      render(<ChatInterface />)

      await waitFor(
        () => {
          expect(localStorage.getItem("dam_ia_chat_session_id")).toBeNull()
        },
        { timeout: 2000 },
      )
    })

    it("supprime le sessionId si la réponse du serveur n'est pas ok", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-404")

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }))

      render(<ChatInterface />)

      await waitFor(
        () => {
          expect(localStorage.getItem("dam_ia_chat_session_id")).toBeNull()
        },
        { timeout: 2000 },
      )
    })

    it("supprime le sessionId si la session ne contient aucun message", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-empty")

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ messages: [] }),
        }),
      )

      render(<ChatInterface />)

      await waitFor(
        () => {
          expect(localStorage.getItem("dam_ia_chat_session_id")).toBeNull()
        },
        { timeout: 2000 },
      )
    })

    it("affiche un loader à la place des messages pendant le chargement de la session", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-loader-test")

      vi.stubGlobal(
        "fetch",
        vi.fn(() => new Promise(() => {})),
      )

      render(<ChatInterface />)

      expect(screen.getByTestId("session-loader")).toBeInTheDocument()
      expect(screen.queryByText(/Product Builder & enthousiaste IA/i)).not.toBeInTheDocument()
      expect(screen.queryByTestId("suggestions")).not.toBeInTheDocument()
    })

    it("appelle la bonne URL de session au montage", async () => {
      localStorage.setItem("dam_ia_chat_session_id", "session-check-url")

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      })
      vi.stubGlobal("fetch", mockFetch)

      render(<ChatInterface />)

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith("/api/chat/session/session-check-url")
        },
        { timeout: 2000 },
      )
    })
  })

  describe("Persistance des suggestions (localStorage)", () => {
    it("sauvegarde la suggestion cliquée dans localStorage", async () => {
      const user = setup()
      render(<ChatInterface />)

      await user.click(screen.getByText("Quelles sont tes compétences ?"))

      await waitFor(
        () => {
          const stored = JSON.parse(localStorage.getItem("dam_ia_used_suggestions") ?? "[]") as string[]
          expect(stored).toContain("Quelles sont tes compétences ?")
        },
        { timeout: 2000 },
      )
    })

    it("ne ré-affiche pas une suggestion déjà cliquée au rechargement", () => {
      localStorage.setItem("dam_ia_used_suggestions", JSON.stringify(["Quelles sont tes compétences ?"]))

      render(<ChatInterface />)

      expect(screen.queryByText("Quelles sont tes compétences ?")).not.toBeInTheDocument()
      expect(screen.getByText("Parle-moi de tes soft skills")).toBeInTheDocument()
      expect(screen.getByText("Quel est ton parcours ?")).toBeInTheDocument()
    })

    it("affiche toujours une nouvelle suggestion absente du localStorage", () => {
      localStorage.setItem("dam_ia_used_suggestions", JSON.stringify(["Quelles sont tes compétences ?", "Parle-moi de tes soft skills"]))

      render(<ChatInterface />)

      expect(screen.queryByText("Quelles sont tes compétences ?")).not.toBeInTheDocument()
      expect(screen.queryByText("Parle-moi de tes soft skills")).not.toBeInTheDocument()
      expect(screen.getByText("Quel est ton parcours ?")).toBeInTheDocument()
    })

    it("masque le bloc suggestions si toutes sont dans localStorage", () => {
      localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(SUGGESTIONS))

      render(<ChatInterface />)

      expect(screen.queryByTestId("suggestions")).not.toBeInTheDocument()
    })

    it("accumule plusieurs suggestions cliquées dans localStorage", async () => {
      const user = setup()
      render(<ChatInterface />)

      await user.click(screen.getByText("Quelles sont tes compétences ?"))
      await waitFor(
        () => {
          expect(screen.getByText("Parle-moi de tes soft skills")).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await user.click(screen.getByText("Parle-moi de tes soft skills"))

      await waitFor(
        () => {
          const stored = JSON.parse(localStorage.getItem("dam_ia_used_suggestions") ?? "[]") as string[]
          expect(stored).toContain("Quelles sont tes compétences ?")
          expect(stored).toContain("Parle-moi de tes soft skills")
        },
        { timeout: 3000 },
      )
    })
  })

  describe("Réinitialisation de la conversation", () => {
    it("n'affiche pas le bouton de réinitialisation tant qu'aucun message n'a été envoyé", () => {
      render(<ChatInterface />)
      expect(screen.queryByRole("button", { name: /réinitialiser la conversation/i })).not.toBeInTheDocument()
    })

    it("affiche le bouton de réinitialisation après l'envoi d'un message", async () => {
      const user = setup()
      render(<ChatInterface />)
      await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
      await user.click(screen.getByRole("button", { name: "Envoyer"}))

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /réinitialiser la conversation/i })).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it("demande confirmation avant de réinitialiser et ne réinitialise pas si on annule", async () => {
      const user = setup()
      render(<ChatInterface />)
      await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
      await user.click(screen.getByRole("button", { name: "Envoyer"}))

      await waitFor(
        () => {
          expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )

      await user.click(screen.getByRole("button", { name: /réinitialiser la conversation/i }))

      // La modale de confirmation s'affiche
      expect(screen.getByText("Réinitialiser la conversation ?")).toBeInTheDocument()

      // Annuler ne réinitialise rien
      await user.click(screen.getByRole("button", { name: "Annuler" }))

      await waitFor(() => {
        expect(screen.queryByText("Réinitialiser la conversation ?")).not.toBeInTheDocument()
      })
      expect(screen.getByText("Bonjour")).toBeInTheDocument()
      expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
    })

    it("réinitialise les messages au message de bienvenue uniquement après confirmation", async () => {
      const user = setup()
      render(<ChatInterface />)
      await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
      await user.click(screen.getByRole("button", { name: "Envoyer"}))

      await waitFor(
        () => {
          expect(screen.getByText("Réponse mockée de l'assistant.")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )

      await user.click(screen.getByRole("button", { name: /réinitialiser la conversation/i }))
      await user.click(screen.getByRole("button", { name: "Réinitialiser" }))

      expect(screen.queryByText("Bonjour")).not.toBeInTheDocument()
      expect(screen.queryByText("Réponse mockée de l'assistant.")).not.toBeInTheDocument()
      expect(screen.getByTestId("markdown-content")).toHaveTextContent(/Product Builder & enthousiaste IA/i)
      expect(screen.getAllByTestId("message-bubble")).toHaveLength(1)
    })

    it("supprime le sessionId du localStorage lors de la réinitialisation", async () => {
      mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
        options.onChunk("Réponse.")
        options.onComplete?.({ sessionId: "session-to-reset" })
      })

      const user = setup()
      render(<ChatInterface />)
      await user.type(screen.getByLabelText(/message à envoyer/i), "Bonjour")
      await user.click(screen.getByRole("button", { name: "Envoyer"}))

      await waitFor(
        () => {
          expect(localStorage.getItem("dam_ia_chat_session_id")).toBe("session-to-reset")
        },
        { timeout: 2000 },
      )

      await user.click(screen.getByRole("button", { name: /réinitialiser la conversation/i }))
      await user.click(screen.getByRole("button", { name: "Réinitialiser" }))

      expect(localStorage.getItem("dam_ia_chat_session_id")).toBeNull()
    })

    it("rend de nouveau disponibles les suggestions et vide leur localStorage", async () => {
      const user = setup()
      render(<ChatInterface />)

      // Utilise une suggestion (la retire et la persiste)
      await user.click(screen.getByText("Quelles sont tes compétences ?"))
      await waitFor(
        () => {
          const stored = JSON.parse(localStorage.getItem("dam_ia_used_suggestions") ?? "[]") as string[]
          expect(stored).toContain("Quelles sont tes compétences ?")
        },
        { timeout: 2000 },
      )

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /réinitialiser la conversation/i })).toBeInTheDocument()
        },
        { timeout: 2000 },
      )

      await user.click(screen.getByRole("button", { name: /réinitialiser la conversation/i }))
      await user.click(screen.getByRole("button", { name: "Réinitialiser" }))

      // Toutes les suggestions sont de nouveau visibles
      expect(screen.getByText("Quelles sont tes compétences ?")).toBeInTheDocument()
      expect(screen.getByText("Parle-moi de tes soft skills")).toBeInTheDocument()
      expect(screen.getByText("Quel est ton parcours ?")).toBeInTheDocument()
      // Le localStorage des suggestions utilisées est vidé
      expect(localStorage.getItem("dam_ia_used_suggestions")).toBeNull()
    })
  })

  it("ne remet pas le focus sur le textarea sur un appareil tactile (onError)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const originalMatchMedia = window.matchMedia
    window.matchMedia = (query: string) =>
      ({
        matches: query === "(pointer: coarse)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList

    mockStreamChat.mockImplementation(async (_message: string, options: IStreamChatOptions) => {
      options.onError?.(new Error("Erreur réseau"))
    })

    const user = setup()
    render(<ChatInterface />)
    const textarea = screen.getByLabelText(/message à envoyer/i) as HTMLTextAreaElement
    const focusSpy = vi.spyOn(textarea, "focus")

    await user.type(textarea, "Test")
    await user.click(screen.getByRole("button", { name: "Envoyer"}))

    await waitFor(
      () => {
        expect(screen.getByText(/Désolé, une erreur est survenue/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    expect(focusSpy).not.toHaveBeenCalled()
    focusSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    window.matchMedia = originalMatchMedia
  })
})

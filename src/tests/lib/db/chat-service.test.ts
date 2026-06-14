import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock du module db avant l'import du service
const mockInsert = vi.fn()
const mockValues = vi.fn()
const mockReturning = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return {
        values: (...vArgs: unknown[]) => {
          mockValues(...vArgs)
          return {
            returning: (...rArgs: unknown[]) => {
              mockReturning(...rArgs)
              return mockReturning()
            },
          }
        },
      }
    },
  },
}))

import { createSession, saveMessage, saveFeedback } from "@/lib/db/chat-service"

describe("chat-service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createSession", () => {
    it("doit retourner l'ID de la session créée", async () => {
      mockReturning.mockResolvedValue([{ id: "session-123" }])

      const id = await createSession()

      expect(id).toBe("session-123")
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe("saveMessage", () => {
    it("doit retourner l'ID du message créé", async () => {
      mockReturning.mockResolvedValue([{ id: "msg-456" }])

      const id = await saveMessage("session-123", "user", "Bonjour")

      expect(id).toBe("msg-456")
      expect(mockValues).toHaveBeenCalledWith({
        sessionId: "session-123",
        role: "user",
        content: "Bonjour",
      })
    })

    it("doit accepter le rôle assistant", async () => {
      mockReturning.mockResolvedValue([{ id: "msg-789" }])

      const id = await saveMessage("session-123", "assistant", "Salut !")

      expect(id).toBe("msg-789")
      expect(mockValues).toHaveBeenCalledWith({
        sessionId: "session-123",
        role: "assistant",
        content: "Salut !",
      })
    })
  })

  describe("saveFeedback", () => {
    it("doit retourner l'ID du feedback créé", async () => {
      mockReturning.mockResolvedValue([{ id: "fb-001" }])

      const id = await saveFeedback("msg-456", 5, "Super réponse")

      expect(id).toBe("fb-001")
      expect(mockValues).toHaveBeenCalledWith({
        messageId: "msg-456",
        rating: 5,
        comment: "Super réponse",
      })
    })

    it("doit gérer l'absence de commentaire", async () => {
      mockReturning.mockResolvedValue([{ id: "fb-002" }])

      const id = await saveFeedback("msg-456", 3)

      expect(id).toBe("fb-002")
      expect(mockValues).toHaveBeenCalledWith({
        messageId: "msg-456",
        rating: 3,
        comment: null,
      })
    })
  })
})

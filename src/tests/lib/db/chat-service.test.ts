import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock du module db avant l'import du service
const mockInsert = vi.fn()
const mockValues = vi.fn()
const mockReturning = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()

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
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs)
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs)
              return {
                orderBy: (...oArgs: unknown[]) => {
                  mockOrderBy(...oArgs)
                  return mockOrderBy()
                },
              }
            },
          }
        },
      }
    },
  },
}))

import { createSession, saveMessage, saveFeedback, getSessionMessages } from "@/lib/db/chat-service"

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
        sources: null,
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
        sources: null,
      })
    })

    it("doit persister les sources RAG fournies", async () => {
      mockReturning.mockResolvedValue([{ id: "msg-999" }])
      const sources = [{ label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" }]

      const id = await saveMessage("session-123", "assistant", "Avec sources", sources)

      expect(id).toBe("msg-999")
      expect(mockValues).toHaveBeenCalledWith({
        sessionId: "session-123",
        role: "assistant",
        content: "Avec sources",
        sources,
      })
    })
  })

  describe("getSessionMessages", () => {
    it("doit retourner les messages d'une session triés par date", async () => {
      const now = new Date()
      const mockMessages = [
        { id: "msg-1", role: "user", content: "Bonjour", sources: null, createdAt: now },
        { id: "msg-2", role: "assistant", content: "Salut !", sources: [{ label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" }], createdAt: now },
      ]
      mockOrderBy.mockResolvedValue(mockMessages)

      const result = await getSessionMessages("session-123")

      expect(result).toEqual(mockMessages)
      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalled()
      expect(mockWhere).toHaveBeenCalled()
      expect(mockOrderBy).toHaveBeenCalled()
    })

    it("doit retourner un tableau vide si la session n'a pas de messages", async () => {
      mockOrderBy.mockResolvedValue([])

      const result = await getSessionMessages("session-vide")

      expect(result).toEqual([])
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

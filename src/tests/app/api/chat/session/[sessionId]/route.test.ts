import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetSessionMessages = vi.fn()

vi.mock("@/lib/db/chat-service", () => ({
  getSessionMessages: (...args: unknown[]) => mockGetSessionMessages(...args),
}))

import { GET } from "@/app/api/chat/session/[sessionId]/route"

beforeEach(() => {
  vi.clearAllMocks()
})

const VALID_SESSION_ID = "123e4567-e89b-12d3-a456-426614174000"

describe("GET /api/chat/session/[sessionId]", () => {
  it("retourne les messages de la session avec statut 200", async () => {
    const now = new Date()
    const mockMessages = [
      { id: "msg-1", role: "user", content: "Bonjour", sources: null, createdAt: now },
      { id: "msg-2", role: "assistant", content: "Salut !", sources: [{ label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" }], createdAt: now },
    ]
    mockGetSessionMessages.mockResolvedValue(mockMessages)

    const request = new NextRequest(`http://localhost/api/chat/session/${VALID_SESSION_ID}`)
    const params = Promise.resolve({ sessionId: VALID_SESSION_ID })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Date est sérialisée en ISO string par Response.json()
    expect(data.messages).toEqual(mockMessages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })))
    expect(mockGetSessionMessages).toHaveBeenCalledWith(VALID_SESSION_ID)
  })

  it("retourne un tableau vide si la session n'a pas de messages", async () => {
    mockGetSessionMessages.mockResolvedValue([])

    const request = new NextRequest(`http://localhost/api/chat/session/${VALID_SESSION_ID}`)
    const params = Promise.resolve({ sessionId: VALID_SESSION_ID })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.messages).toEqual([])
  })

  it("retourne 400 et n'interroge pas la DB si le sessionId n'est pas un UUID", async () => {
    const request = new NextRequest("http://localhost/api/chat/session/session-abc")
    const params = Promise.resolve({ sessionId: "session-abc" })

    const response = await GET(request, { params })

    expect(response.status).toBe(400)
    expect(mockGetSessionMessages).not.toHaveBeenCalled()
  })

  it("retourne un statut 500 si getSessionMessages lance une erreur", async () => {
    mockGetSessionMessages.mockRejectedValue(new Error("DB error"))

    const request = new NextRequest(`http://localhost/api/chat/session/${VALID_SESSION_ID}`)
    const params = Promise.resolve({ sessionId: VALID_SESSION_ID })

    const response = await GET(request, { params })

    expect(response.status).toBe(500)
  })
})

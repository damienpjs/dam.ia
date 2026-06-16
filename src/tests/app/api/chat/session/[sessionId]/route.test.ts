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

describe("GET /api/chat/session/[sessionId]", () => {
  it("retourne les messages de la session avec statut 200", async () => {
    const now = new Date()
    const mockMessages = [
      { id: "msg-1", role: "user", content: "Bonjour", createdAt: now },
      { id: "msg-2", role: "assistant", content: "Salut !", createdAt: now },
    ]
    mockGetSessionMessages.mockResolvedValue(mockMessages)

    const request = new NextRequest("http://localhost/api/chat/session/session-abc")
    const params = Promise.resolve({ sessionId: "session-abc" })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Date est sérialisée en ISO string par Response.json()
    expect(data.messages).toEqual(mockMessages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })))
    expect(mockGetSessionMessages).toHaveBeenCalledWith("session-abc")
  })

  it("retourne un tableau vide si la session n'a pas de messages", async () => {
    mockGetSessionMessages.mockResolvedValue([])

    const request = new NextRequest("http://localhost/api/chat/session/session-vide")
    const params = Promise.resolve({ sessionId: "session-vide" })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.messages).toEqual([])
  })

  it("retourne un statut 500 si getSessionMessages lance une erreur", async () => {
    mockGetSessionMessages.mockRejectedValue(new Error("DB error"))

    const request = new NextRequest("http://localhost/api/chat/session/session-err")
    const params = Promise.resolve({ sessionId: "session-err" })

    const response = await GET(request, { params })

    expect(response.status).toBe(500)
  })
})

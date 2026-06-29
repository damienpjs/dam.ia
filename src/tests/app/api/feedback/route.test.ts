import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock du chat-service
vi.mock("@/lib/db/chat-service", () => ({
  saveFeedback: vi.fn(),
}))

import { POST } from "@/app/api/feedback/route"
import { saveFeedback } from "@/lib/db/chat-service"
import { NextRequest } from "next/server"

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const VALID_MESSAGE_ID = "123e4567-e89b-12d3-a456-426614174000"

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("doit créer un feedback et retourner 201", async () => {
    vi.mocked(saveFeedback).mockResolvedValue("fb-001")

    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 5, comment: "Très bien" }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe("fb-001")
    expect(saveFeedback).toHaveBeenCalledWith(VALID_MESSAGE_ID, 5, "Très bien")
  })

  it("doit accepter un feedback sans commentaire", async () => {
    vi.mocked(saveFeedback).mockResolvedValue("fb-002")

    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 3 }))

    expect(response.status).toBe(201)
    expect(saveFeedback).toHaveBeenCalledWith(VALID_MESSAGE_ID, 3, undefined)
  })

  it("doit retourner 400 si messageId manquant", async () => {
    const response = await POST(createRequest({ rating: 5 }))

    expect(response.status).toBe(400)
    expect(saveFeedback).not.toHaveBeenCalled()
  })

  it("doit retourner 400 si messageId n'est pas un UUID", async () => {
    const response = await POST(createRequest({ messageId: "msg-123", rating: 5 }))

    expect(response.status).toBe(400)
    expect(saveFeedback).not.toHaveBeenCalled()
  })

  it("doit retourner 400 si rating invalide", async () => {
    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 0 }))

    expect(response.status).toBe(400)
    expect(saveFeedback).not.toHaveBeenCalled()
  })

  it("doit retourner 400 si rating supérieur à 5", async () => {
    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 6 }))

    expect(response.status).toBe(400)
    expect(saveFeedback).not.toHaveBeenCalled()
  })

  it("doit retourner 400 si le commentaire dépasse la longueur maximale", async () => {
    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 4, comment: "a".repeat(2001) }))

    expect(response.status).toBe(400)
    expect(saveFeedback).not.toHaveBeenCalled()
  })

  it("doit retourner 400 si le commentaire n'est pas une chaîne", async () => {
    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 4, comment: 42 }))

    expect(response.status).toBe(400)
    expect(saveFeedback).not.toHaveBeenCalled()
  })

  it("doit retourner 500 si la DB échoue", async () => {
    vi.mocked(saveFeedback).mockRejectedValue(new Error("DB connection failed"))

    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 4 }))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe("Impossible d'enregistrer le feedback")
  })

  it("doit retourner 500 et gérer les erreurs non-Error", async () => {
    vi.mocked(saveFeedback).mockRejectedValue("string error")

    const response = await POST(createRequest({ messageId: VALID_MESSAGE_ID, rating: 4 }))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe("Impossible d'enregistrer le feedback")
  })
})

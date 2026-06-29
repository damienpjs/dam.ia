import { describe, it, expect, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { getAllowedOrigins, isAllowedOrigin, corsHeaders, preflightResponse } from "@/lib/cors"
import { PRODUCTION_ORIGIN } from "@/constants/cors"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

function requestWith(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/chat", { method: "POST", headers })
}

describe("getAllowedOrigins", () => {
  it("retourne le domaine de production par défaut", () => {
    delete process.env.ALLOWED_ORIGINS
    expect(getAllowedOrigins()).toEqual([PRODUCTION_ORIGIN])
  })

  it("parse la variable d'env ALLOWED_ORIGINS (CSV)", () => {
    process.env.ALLOWED_ORIGINS = "https://a.com, https://b.com ,"
    expect(getAllowedOrigins()).toEqual(["https://a.com", "https://b.com"])
  })
})

describe("isAllowedOrigin", () => {
  it("autorise une origine same-origin (hôte == Host)", () => {
    const request = requestWith({ origin: "http://localhost:3000", host: "localhost:3000" })
    expect(isAllowedOrigin("http://localhost:3000", request)).toBe(true)
  })

  it("autorise une origine de l'allowlist explicite", () => {
    process.env.ALLOWED_ORIGINS = "https://partenaire.com"
    const request = requestWith({ host: "localhost:3000" })
    expect(isAllowedOrigin("https://partenaire.com", request)).toBe(true)
  })

  it("rejette une origine cross-site inconnue", () => {
    const request = requestWith({ host: "localhost:3000" })
    expect(isAllowedOrigin("https://evil.com", request)).toBe(false)
  })

  it("rejette une origine malformée", () => {
    const request = requestWith({ host: "localhost:3000" })
    expect(isAllowedOrigin("pas-une-url", request)).toBe(false)
  })
})

describe("corsHeaders", () => {
  it("reflète l'origine et expose les méthodes autorisées", () => {
    const headers = corsHeaders("https://a.com")
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://a.com")
    expect(headers["Access-Control-Allow-Methods"]).toContain("POST")
    expect(headers.Vary).toBe("Origin")
  })
})

describe("preflightResponse", () => {
  it("retourne 204 + en-têtes CORS pour une origine autorisée", () => {
    const request = requestWith({ origin: "http://localhost:3000", host: "localhost:3000" })
    const response = preflightResponse(request)
    expect(response.status).toBe(204)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000")
  })

  it("retourne 403 pour une origine non autorisée", () => {
    const request = requestWith({ origin: "https://evil.com", host: "localhost:3000" })
    expect(preflightResponse(request).status).toBe(403)
  })

  it("retourne 403 en l'absence d'origine", () => {
    const request = requestWith({ host: "localhost:3000" })
    expect(preflightResponse(request).status).toBe(403)
  })
})

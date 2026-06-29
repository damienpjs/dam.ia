import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractTextFromHtml, fetchWebPage, scrapeWebSource, type IWebSource } from "@/lib/rag/web-scraper"

describe("extractTextFromHtml", () => {
  it("supprime les balises HTML et retourne le texte brut", () => {
    const html = "<html><body><h1>Titre</h1><p>Contenu du paragraphe.</p></body></html>"
    const text = extractTextFromHtml(html)
    expect(text).toContain("Titre")
    expect(text).toContain("Contenu du paragraphe.")
    expect(text).not.toContain("<h1>")
    expect(text).not.toContain("<p>")
  })

  it("supprime les scripts et styles", () => {
    const html = '<html><head><style>body { color: red; }</style></head><body><script>alert("x")</script><p>Visible</p></body></html>'
    const text = extractTextFromHtml(html)
    expect(text).toContain("Visible")
    expect(text).not.toContain("alert")
    expect(text).not.toContain("color: red")
  })

  it("supprime les blocs noscript", () => {
    const html = "<body><noscript>JS requis</noscript><p>Contenu</p></body>"
    const text = extractTextFromHtml(html)
    expect(text).toContain("Contenu")
    expect(text).not.toContain("JS requis")
  })

  it("décode les entités HTML courantes", () => {
    const html = "<p>A &amp; B &lt; C &gt; D &quot;E&quot; &#39;F&#39; &nbsp;G</p>"
    const text = extractTextFromHtml(html)
    expect(text).toContain("A & B < C > D \"E\" 'F' G")
  })

  it("nettoie les espaces multiples", () => {
    const html = "<p>  Mot1    Mot2     Mot3  </p>"
    const text = extractTextFromHtml(html)
    expect(text).toBe("Mot1 Mot2 Mot3")
  })

  it("retourne une chaîne vide pour du HTML sans contenu textuel", () => {
    const html = "<html><head><style>x</style></head><body><script>y</script></body></html>"
    const text = extractTextFromHtml(html)
    expect(text).toBe("")
  })
})

describe("fetchWebPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne le texte extrait d'une page HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>Hello World</p></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    )

    const text = await fetchWebPage("https://example.com")
    expect(text).toContain("Hello World")
  })

  it("throw pour une réponse HTTP non-200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("Not Found", { status: 404 }))

    await expect(fetchWebPage("https://example.com/404")).rejects.toThrow("HTTP 404")
  })
})

describe("scrapeWebSource", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const source: IWebSource = {
    id: "test-site",
    url: "https://example.com",
    label: "Test Site",
  }

  it("retourne des chunks avec les bonnes métadonnées", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>Contenu de la page de test.</p></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    )

    const chunks = await scrapeWebSource(source)

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].source).toBe("test-site")
    expect(chunks[0].metadata).toEqual({
      sourceUrl: "https://example.com",
      sourceLabel: "Test Site",
    })
  })

  it("affiche displayUrl comme sourceUrl tout en scrapant url", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>Contenu indexé depuis la page about.</p></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    )

    const sourceWithDisplay: IWebSource = {
      id: "site-perso",
      url: "https://example.com/about",
      displayUrl: "/about",
      label: "example.com",
    }

    const chunks = await scrapeWebSource(sourceWithDisplay)

    // On scrape bien l'URL réelle…
    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/about", expect.anything())
    // …mais la source affichée pointe vers displayUrl avec le label inchangé.
    expect(chunks[0].metadata).toEqual({
      sourceUrl: "/about",
      sourceLabel: "example.com",
    })
  })

  it("retourne un tableau vide si la page ne contient pas de texte", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><head><style>x</style></head><body><script>y</script></body></html>", {
        status: 200,
      }),
    )

    const chunks = await scrapeWebSource(source)
    expect(chunks).toEqual([])
  })

  it("génère des IDs déterministes pour les chunks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>Contenu déterministe.</p></body></html>", {
        status: 200,
      }),
    )

    const chunks1 = await scrapeWebSource(source)

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>Contenu déterministe.</p></body></html>", {
        status: 200,
      }),
    )

    const chunks2 = await scrapeWebSource(source)

    expect(chunks1[0].id).toBe(chunks2[0].id)
  })
})

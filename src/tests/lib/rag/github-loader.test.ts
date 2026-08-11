import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  buildGitHubHeaders,
  fetchGitHubProfile,
  fetchUserRepos,
  fetchRepoReadme,
  fetchRepoLanguages,
  formatLanguages,
  cleanReadme,
  buildProfileDocument,
  buildRepoContextHeader,
  buildRepoDocument,
  chunkGitHubProfile,
  type IGitHubProfile,
  type IGitHubRepo,
  type IGitHubSource,
} from "@/lib/rag/github-loader"

const profile: IGitHubProfile = {
  login: "damienpjs",
  name: "damienp.js",
  bio: "JavaScript Technical Lead\r\n| AI enthusiast",
  blog: "https://damienpasulj.com",
  html_url: "https://github.com/damienpjs",
  public_repos: 3,
  created_at: "2022-11-08T07:58:29Z",
}

const repo: IGitHubRepo = {
  name: "Komfy",
  html_url: "https://github.com/damienpjs/Komfy",
  description: "Mobile remote for ComfyUI",
  language: "TypeScript",
  homepage: "https://komfy.app",
  topics: ["expo", "comfyui"],
  license: { name: "MIT License" },
  fork: false,
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2026-08-05T15:30:04Z",
}

/**
 * Route les appels fetch en fonction de l'URL demandée.
 * Chaque clé est un fragment d'URL ; la première correspondance gagne.
 */
function mockGitHubRoutes(routes: Array<[string, Response | (() => Response)]>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input)
    const match = routes.find(([fragment]) => url.includes(fragment))

    if (!match) {
      throw new Error(`Route non mockée : ${url}`)
    }

    const [, response] = match
    return typeof response === "function" ? response() : response
  })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("buildGitHubHeaders", () => {
  it("retourne les en-têtes de base sans Authorization quand il n'y a pas de token", () => {
    const headers = buildGitHubHeaders()
    expect(headers.Accept).toBe("application/vnd.github+json")
    expect(headers["User-Agent"]).toBe("DamIA-Indexer/1.0")
    expect(headers["X-GitHub-Api-Version"]).toBeDefined()
    expect(headers.Authorization).toBeUndefined()
  })

  it("ajoute l'en-tête Authorization quand un token est fourni", () => {
    expect(buildGitHubHeaders("ghp_secret").Authorization).toBe("Bearer ghp_secret")
  })

  it("accepte une surcharge du type de contenu attendu", () => {
    expect(buildGitHubHeaders(undefined, "application/vnd.github.raw").Accept).toBe("application/vnd.github.raw")
  })
})

describe("fetchGitHubProfile", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne le profil public de l'utilisateur", async () => {
    mockGitHubRoutes([["/users/damienpjs", jsonResponse(profile)]])
    await expect(fetchGitHubProfile("damienpjs")).resolves.toEqual(profile)
  })

  it("throw un message explicite sur un 403 sans token (quota anonyme)", async () => {
    mockGitHubRoutes([["/users/damienpjs", new Response("rate limited", { status: 403 })]])
    await expect(fetchGitHubProfile("damienpjs")).rejects.toThrow(/GITHUB_TOKEN/)
  })

  it("throw une erreur HTTP générique sur un 403 avec token", async () => {
    mockGitHubRoutes([["/users/damienpjs", new Response("forbidden", { status: 403 })]])
    await expect(fetchGitHubProfile("damienpjs", "ghp_secret")).rejects.toThrow("HTTP 403")
  })

  it("throw sur un profil inexistant", async () => {
    mockGitHubRoutes([["/users/ghost", new Response("Not Found", { status: 404 })]])
    await expect(fetchGitHubProfile("ghost")).rejects.toThrow("HTTP 404")
  })
})

describe("fetchUserRepos", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const forked: IGitHubRepo = { ...repo, name: "forked-lib", fork: true }

  it("exclut les forks par défaut", async () => {
    mockGitHubRoutes([["/repos", jsonResponse([repo, forked])]])
    const repos = await fetchUserRepos("damienpjs")
    expect(repos.map((r) => r.name)).toEqual(["Komfy"])
  })

  it("inclut les forks quand includeForks est activé", async () => {
    mockGitHubRoutes([["/repos", jsonResponse([repo, forked])]])
    const repos = await fetchUserRepos("damienpjs", undefined, true)
    expect(repos).toHaveLength(2)
  })

  it("demande les dépôts triés par date de mise à jour", async () => {
    const spy = mockGitHubRoutes([["/repos", jsonResponse([])]])
    await fetchUserRepos("damienpjs")
    expect(String(spy.mock.calls[0][0])).toContain("sort=updated")
  })
})

describe("fetchRepoReadme", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne le markdown brut du README", async () => {
    mockGitHubRoutes([["/readme", new Response("# Komfy\n\nUne télécommande.", { status: 200 })]])
    await expect(fetchRepoReadme("damienpjs", "Komfy")).resolves.toContain("# Komfy")
  })

  it("retourne une chaîne vide quand le dépôt n'a pas de README", async () => {
    mockGitHubRoutes([["/readme", new Response("Not Found", { status: 404 })]])
    await expect(fetchRepoReadme("damienpjs", "Komfy")).resolves.toBe("")
  })

  it("throw sur les autres erreurs HTTP", async () => {
    mockGitHubRoutes([["/readme", new Response("Server Error", { status: 500 })]])
    await expect(fetchRepoReadme("damienpjs", "Komfy")).rejects.toThrow("HTTP 500")
  })

  it("demande le contenu brut plutôt que l'enveloppe JSON", async () => {
    const spy = mockGitHubRoutes([["/readme", new Response("# Titre", { status: 200 })]])
    await fetchRepoReadme("damienpjs", "Komfy")
    const init = spy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Accept).toBe("application/vnd.github.raw")
  })
})

describe("fetchRepoLanguages", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("retourne la répartition des langages", async () => {
    mockGitHubRoutes([["/languages", jsonResponse({ TypeScript: 9000, CSS: 1000 })]])
    await expect(fetchRepoLanguages("damienpjs", "Komfy")).resolves.toEqual({ TypeScript: 9000, CSS: 1000 })
  })
})

describe("formatLanguages", () => {
  it("formate les langages en pourcentages décroissants", () => {
    expect(formatLanguages({ CSS: 1000, TypeScript: 9000 })).toBe("TypeScript 90 %, CSS 10 %")
  })

  it("retourne une chaîne vide quand aucun langage n'est détecté", () => {
    expect(formatLanguages({})).toBe("")
  })

  it("retourne une chaîne vide quand le total est nul", () => {
    expect(formatLanguages({ TypeScript: 0 })).toBe("")
  })

  it("ne garde que les langages les plus représentés", () => {
    const languages = { A: 100, B: 90, C: 80, D: 70, E: 60, F: 50, G: 40 }
    expect(formatLanguages(languages).split(", ")).toHaveLength(5)
  })
})

describe("cleanReadme", () => {
  it("supprime les blocs de code", () => {
    const cleaned = cleanReadme("Intro\n\n```bash\nnpm install\n```\n\nSuite")
    expect(cleaned).toContain("Intro")
    expect(cleaned).toContain("Suite")
    expect(cleaned).not.toContain("npm install")
  })

  it("supprime les commentaires HTML et les balises", () => {
    const cleaned = cleanReadme("<!-- caché -->\n<div align='center'>Visible</div>")
    expect(cleaned).toContain("Visible")
    expect(cleaned).not.toContain("caché")
    expect(cleaned).not.toContain("<div")
  })

  it("supprime les images et les badges", () => {
    const cleaned = cleanReadme("[![build](https://img.shields.io/b.svg)](https://ci.example.com)\n\nContenu réel")
    expect(cleaned).toContain("Contenu réel")
    expect(cleaned).not.toContain("shields.io")
    expect(cleaned).not.toContain("ci.example.com")
  })

  it("préserve les liens markdown porteurs de sens", () => {
    expect(cleanReadme("Voir la [documentation](https://docs.example.com)")).toContain("[documentation](https://docs.example.com)")
  })

  it("tronque les README trop longs", () => {
    const cleaned = cleanReadme("a".repeat(20_000))
    expect(cleaned.length).toBeLessThan(20_000)
    expect(cleaned.endsWith("…")).toBe(true)
  })

  it("retourne une chaîne vide pour un README vide", () => {
    expect(cleanReadme("")).toBe("")
  })
})

describe("buildProfileDocument", () => {
  it("inclut le nom, la bio, le blog et l'URL", () => {
    const document = buildProfileDocument(profile)
    expect(document).toContain("damienp.js")
    expect(document).toContain("@damienpjs")
    expect(document).toContain("JavaScript Technical Lead | AI enthusiast")
    expect(document).toContain("https://damienpasulj.com")
    expect(document).toContain("Dépôts publics : 3")
    expect(document).toContain("2022")
    expect(document).toContain("https://github.com/damienpjs")
  })

  it("retombe sur le login et omet les champs absents", () => {
    const document = buildProfileDocument({ ...profile, name: null, bio: null, blog: null })
    expect(document).toContain("Profil GitHub de damienpjs")
    expect(document).not.toContain("Bio :")
    expect(document).not.toContain("Site web :")
  })
})

describe("buildRepoContextHeader", () => {
  it("contient le nom du projet, le langage et la date de mise à jour", () => {
    const header = buildRepoContextHeader(repo)
    expect(header).toContain("Projet GitHub: Komfy")
    expect(header).toContain("Langage: TypeScript")
    expect(header).toContain("2026")
    expect(header.startsWith("[")).toBe(true)
    expect(header.endsWith("]")).toBe(true)
  })

  it("omet le langage quand il est absent", () => {
    expect(buildRepoContextHeader({ ...repo, language: null })).not.toContain("Langage:")
  })
})

describe("buildRepoDocument", () => {
  it("assemble les métadonnées du dépôt et son README", () => {
    const document = buildRepoDocument(repo, "# Komfy\n\nUne télécommande mobile.", { TypeScript: 9000, CSS: 1000 })
    expect(document).toContain("Projet GitHub : Komfy")
    expect(document).toContain("Description : Mobile remote for ComfyUI")
    expect(document).toContain("Langages : TypeScript 90 %, CSS 10 %")
    expect(document).toContain("Thèmes : expo, comfyui")
    expect(document).toContain("Licence : MIT License")
    expect(document).toContain("Démo : https://komfy.app")
    expect(document).toContain("URL : https://github.com/damienpjs/Komfy")
    expect(document).toContain("Une télécommande mobile.")
  })

  it("retombe sur le langage principal quand la répartition est vide", () => {
    expect(buildRepoDocument(repo, "", {})).toContain("Langages : TypeScript")
  })

  it("omet la ligne des langages quand aucun n'est connu", () => {
    expect(buildRepoDocument({ ...repo, language: null }, "", {})).not.toContain("Langages :")
  })

  it("omet les champs optionnels absents", () => {
    const document = buildRepoDocument({ ...repo, description: null, topics: [], license: null, homepage: null }, "", {})
    expect(document).not.toContain("Description :")
    expect(document).not.toContain("Thèmes :")
    expect(document).not.toContain("Licence :")
    expect(document).not.toContain("Démo :")
  })

  it("gère un dépôt sans champ topics", () => {
    const { topics: _topics, ...withoutTopics } = repo
    expect(buildRepoDocument(withoutTopics, "", {})).not.toContain("Thèmes :")
  })

  it("signale les dépôts archivés", () => {
    expect(buildRepoDocument({ ...repo, archived: true }, "", {})).toContain("Statut : projet archivé")
  })

  it("omet la section README quand il n'y en a pas", () => {
    expect(buildRepoDocument(repo, "", {})).not.toContain("README :")
  })
})

describe("chunkGitHubProfile", () => {
  const source: IGitHubSource = {
    id: "github",
    username: "damienpjs",
    label: "GitHub",
  }

  function mockFullProfile(readme = "# Komfy\n\nUne télécommande mobile pour ComfyUI.") {
    return mockGitHubRoutes([
      ["/readme", () => new Response(readme, { status: 200 })],
      ["/languages", () => jsonResponse({ TypeScript: 10_000 })],
      ["/repos", () => jsonResponse([repo])],
      ["/users/damienpjs", () => jsonResponse(profile)],
    ])
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.GITHUB_TOKEN
  })

  afterEach(() => {
    delete process.env.GITHUB_TOKEN
  })

  it("produit des chunks pour le profil et pour chaque dépôt", async () => {
    mockFullProfile()
    const chunks = await chunkGitHubProfile(source)

    expect(chunks.some((c) => c.source === "github")).toBe(true)
    expect(chunks.some((c) => c.source === "github-komfy")).toBe(true)
  })

  it("pointe la source du profil vers l'URL du profil", async () => {
    mockFullProfile()
    const chunks = await chunkGitHubProfile(source)
    const profileChunk = chunks.find((c) => c.source === "github")

    expect(profileChunk?.metadata).toEqual({
      sourceUrl: "https://github.com/damienpjs",
      sourceLabel: "GitHub",
    })
  })

  it("pointe la source de chaque dépôt vers ce dépôt et non vers le profil", async () => {
    mockFullProfile()
    const chunks = await chunkGitHubProfile(source)
    const repoChunk = chunks.find((c) => c.source === "github-komfy")

    expect(repoChunk?.metadata).toEqual({
      sourceUrl: "https://github.com/damienpjs/Komfy",
      sourceLabel: "GitHub — Komfy",
    })
  })

  it("préfixe chaque chunk de dépôt d'un en-tête de contexte", async () => {
    mockFullProfile()
    const chunks = await chunkGitHubProfile(source)

    for (const chunk of chunks.filter((c) => c.source === "github-komfy")) {
      expect(chunk.text.startsWith("[Projet GitHub: Komfy")).toBe(true)
    }
  })

  it("génère des identifiants déterministes", async () => {
    mockFullProfile()
    const first = await chunkGitHubProfile(source)

    mockFullProfile()
    const second = await chunkGitHubProfile(source)

    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id))
  })

  it("utilise le token de la source pour authentifier les appels", async () => {
    const spy = mockFullProfile()
    await chunkGitHubProfile({ ...source, token: "ghp_from_source" })

    const init = spy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ghp_from_source")
  })

  it("retombe sur GITHUB_TOKEN quand la source n'en fournit pas", async () => {
    process.env.GITHUB_TOKEN = "ghp_from_env"
    const spy = mockFullProfile()
    await chunkGitHubProfile(source)

    const init = spy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ghp_from_env")
  })

  it("transmet includeForks à la récupération des dépôts", async () => {
    mockGitHubRoutes([
      ["/readme", () => new Response("", { status: 404 })],
      ["/languages", () => jsonResponse({})],
      ["/repos", () => jsonResponse([{ ...repo, name: "forked-lib", fork: true }])],
      ["/users/damienpjs", () => jsonResponse(profile)],
    ])

    const chunks = await chunkGitHubProfile({ ...source, includeForks: true })
    expect(chunks.some((c) => c.source === "github-forked-lib")).toBe(true)
  })

  it("ne produit que les chunks du profil quand l'utilisateur n'a aucun dépôt", async () => {
    mockGitHubRoutes([
      ["/repos", () => jsonResponse([])],
      ["/users/damienpjs", () => jsonResponse(profile)],
    ])

    const chunks = await chunkGitHubProfile(source)
    expect(chunks.every((c) => c.source === "github")).toBe(true)
    expect(chunks.length).toBeGreaterThan(0)
  })
})

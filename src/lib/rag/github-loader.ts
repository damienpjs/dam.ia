import type { IContentChunk } from "./types"
import { splitTextIntoChunks, generateChunkId } from "./chunker"
import { GITHUB_API_URL, GITHUB_API_VERSION, GITHUB_TIMEOUT_MS, GITHUB_REPOS_PER_PAGE, GITHUB_MAX_README_CHARS, GITHUB_MAX_LANGUAGES } from "@/constants/rag"

/**
 * Configuration d'un profil GitHub à indexer.
 *
 * On indexe l'API REST plutôt que la page HTML du profil : celle-ci ne contient
 * que de la navigation et des noms de dépôts, alors que l'API donne accès aux
 * descriptions, aux thèmes et surtout aux README — le seul endroit où se trouve
 * la vraie matière (architecture, stack, choix techniques).
 */
export interface IGitHubSource {
  /** Identifiant de la source, utilisé comme préfixe des identifiants de chunks (ex: "github") */
  id: string
  /** Login GitHub à indexer (ex: "damienpjs") */
  username: string
  /** Label affiché à l'utilisateur (ex: "GitHub") */
  label: string
  /**
   * Token d'accès personnel. Optionnel : sans token l'API est limitée à 60
   * requêtes/heure, ce qui suffit pour un profil de quelques dépôts. Si absent,
   * on retombe sur la variable d'environnement `GITHUB_TOKEN`.
   */
  token?: string
  /** Indexer aussi les dépôts forkés (défaut: false — un fork n'est pas une réalisation) */
  includeForks?: boolean
}

/**
 * Profil GitHub public (sous-ensemble utile de `GET /users/{username}`)
 */
export interface IGitHubProfile {
  login: string
  name: string | null
  bio: string | null
  blog: string | null
  html_url: string
  public_repos: number
  created_at: string
}

/**
 * Dépôt GitHub public (sous-ensemble utile de `GET /users/{username}/repos`)
 */
export interface IGitHubRepo {
  name: string
  html_url: string
  description: string | null
  language: string | null
  homepage?: string | null
  topics?: string[]
  license?: { name: string } | null
  fork: boolean
  archived?: boolean
  created_at: string
  updated_at: string
}

/**
 * Répartition des langages d'un dépôt : nom du langage → octets de code
 */
export type TGitHubLanguages = Record<string, number>

/**
 * Construit les en-têtes d'appel à l'API GitHub.
 * Le token est facultatif mais relève la limite de 60 à 5000 requêtes/heure.
 */
export function buildGitHubHeaders(token?: string, accept = "application/vnd.github+json"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "DamIA-Indexer/1.0",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

/**
 * Appelle un endpoint de l'API GitHub et retourne la réponse brute.
 * Centralise le timeout et la traduction des erreurs HTTP.
 */
async function requestGitHub(endpoint: string, token?: string, accept?: string): Promise<Response> {
  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
    headers: buildGitHubHeaders(token, accept),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  })

  // Un 403 sans token est presque toujours un dépassement de quota anonyme :
  // on le dit explicitement plutôt que de laisser un « HTTP 403 » énigmatique.
  if (response.status === 403 && !token) {
    throw new Error(`HTTP 403 pour ${endpoint} — quota anonyme de l'API GitHub atteint (60 req/h). Définir GITHUB_TOKEN pour le relever.`)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${endpoint}`)
  }

  return response
}

/**
 * Récupère le profil public d'un utilisateur GitHub.
 */
export async function fetchGitHubProfile(username: string, token?: string): Promise<IGitHubProfile> {
  const response = await requestGitHub(`/users/${username}`, token)
  return (await response.json()) as IGitHubProfile
}

/**
 * Récupère les dépôts publics d'un utilisateur, du plus récemment mis à jour au plus ancien.
 * Les forks sont exclus par défaut.
 */
export async function fetchUserRepos(username: string, token?: string, includeForks = false): Promise<IGitHubRepo[]> {
  const response = await requestGitHub(`/users/${username}/repos?per_page=${GITHUB_REPOS_PER_PAGE}&sort=updated&direction=desc`, token)
  const repos = (await response.json()) as IGitHubRepo[]

  return includeForks ? repos : repos.filter((repo) => !repo.fork)
}

/**
 * Récupère le README d'un dépôt au format markdown brut.
 * Retourne une chaîne vide si le dépôt n'en a pas (404) — cas normal, pas une erreur.
 */
export async function fetchRepoReadme(owner: string, repo: string, token?: string): Promise<string> {
  const endpoint = `/repos/${owner}/${repo}/readme`
  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
    headers: buildGitHubHeaders(token, "application/vnd.github.raw"),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  })

  if (response.status === 404) {
    return ""
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${endpoint}`)
  }

  return await response.text()
}

/**
 * Récupère la répartition des langages d'un dépôt (nom → octets de code).
 */
export async function fetchRepoLanguages(owner: string, repo: string, token?: string): Promise<TGitHubLanguages> {
  const response = await requestGitHub(`/repos/${owner}/${repo}/languages`, token)
  return (await response.json()) as TGitHubLanguages
}

/**
 * Formate la répartition des langages en pourcentages lisibles.
 * Ex: { TypeScript: 9000, CSS: 1000 } → "TypeScript 90 %, CSS 10 %"
 *
 * Retourne "" si le dépôt n'a aucun langage détecté.
 */
export function formatLanguages(languages: TGitHubLanguages): string {
  const entries = Object.entries(languages)
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)

  if (total === 0) {
    return ""
  }

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, GITHUB_MAX_LANGUAGES)
    .map(([name, bytes]) => `${name} ${Math.round((bytes / total) * 100)} %`)
    .join(", ")
}

/**
 * Nettoie un README markdown avant indexation.
 *
 * On retire ce qui pollue les embeddings sans porter de sens sur le projet :
 * blocs de code (commandes d'installation), badges, images, HTML brut. Le texte
 * est ensuite tronqué à GITHUB_MAX_README_CHARS pour qu'un projet très documenté
 * ne monopolise pas les résultats de la recherche vectorielle.
 */
export function cleanReadme(markdown: string): string {
  const cleaned = markdown
    // Les blocs de code d'abord : ils peuvent contenir du HTML qui fausserait les passes suivantes
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Un badge est une image dans un lien : une fois l'image retirée, il reste un lien vide
    .replace(/\[\s*\]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (cleaned.length <= GITHUB_MAX_README_CHARS) {
    return cleaned
  }

  return `${cleaned.slice(0, GITHUB_MAX_README_CHARS).trimEnd()}…`
}

/**
 * Formate une date ISO en mois + année en français (ex: "novembre 2022").
 */
function formatMonthYear(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })
}

/**
 * Construit le document texte décrivant le profil GitHub lui-même.
 */
export function buildProfileDocument(profile: IGitHubProfile): string {
  const lines = [`Profil GitHub de ${profile.name ?? profile.login} (@${profile.login})`]

  if (profile.bio) {
    lines.push(`Bio : ${profile.bio.replace(/\s+/g, " ").trim()}`)
  }
  if (profile.blog) {
    lines.push(`Site web : ${profile.blog}`)
  }

  lines.push(`Dépôts publics : ${profile.public_repos}`)
  lines.push(`Compte créé en ${formatMonthYear(profile.created_at)}`)
  lines.push(`URL : ${profile.html_url}`)

  return lines.join("\n")
}

/**
 * Construit un en-tête de contexte réinjecté en tête de chaque chunk d'un dépôt.
 *
 * Même logique que `buildChunkContextHeader` pour les expériences : une fois
 * découpé, un chunk de README ne dit plus de quel projet il parle. L'en-tête est
 * embeddé ET montré au LLM, ce qui améliore le recall (le nom du projet entre
 * dans le vecteur) et la précision (le LLM ne mélange pas deux projets).
 */
export function buildRepoContextHeader(repo: IGitHubRepo): string {
  const parts = [`Projet GitHub: ${repo.name}`]

  if (repo.language) {
    parts.push(`Langage: ${repo.language}`)
  }

  parts.push(`Mis à jour: ${formatMonthYear(repo.updated_at)}`)

  return `[${parts.join(" | ")}]`
}

/**
 * Assemble un dépôt, son README et ses langages en un document texte indexable.
 */
export function buildRepoDocument(repo: IGitHubRepo, readme: string, languages: TGitHubLanguages): string {
  const lines = [`Projet GitHub : ${repo.name}`]

  if (repo.description) {
    lines.push(`Description : ${repo.description}`)
  }

  // La répartition réelle prime sur le langage principal déclaré par GitHub.
  const formattedLanguages = formatLanguages(languages)
  if (formattedLanguages) {
    lines.push(`Langages : ${formattedLanguages}`)
  } else if (repo.language) {
    lines.push(`Langages : ${repo.language}`)
  }

  if (repo.topics && repo.topics.length > 0) {
    lines.push(`Thèmes : ${repo.topics.join(", ")}`)
  }
  if (repo.license?.name) {
    lines.push(`Licence : ${repo.license.name}`)
  }
  if (repo.homepage) {
    lines.push(`Démo : ${repo.homepage}`)
  }
  if (repo.archived) {
    lines.push("Statut : projet archivé")
  }

  lines.push(`Créé en ${formatMonthYear(repo.created_at)}, dernière mise à jour en ${formatMonthYear(repo.updated_at)}`)
  lines.push(`URL : ${repo.html_url}`)

  const cleanedReadme = cleanReadme(readme)
  if (cleanedReadme) {
    lines.push("", "README :", cleanedReadme)
  }

  return lines.join("\n")
}

/**
 * Charge un profil GitHub et ses dépôts, puis les transforme en chunks indexables.
 *
 * Chaque dépôt devient une source citable indépendamment : `sourceUrl` pointe
 * vers le dépôt concerné (et non vers le profil), pour que les bulles de
 * conversation renvoient l'utilisateur directement au bon projet.
 *
 * Les appels sont séquentiels pour rester sous les quotas de l'API GitHub.
 */
export async function chunkGitHubProfile(source: IGitHubSource): Promise<IContentChunk[]> {
  const token = source.token ?? process.env.GITHUB_TOKEN
  const profile = await fetchGitHubProfile(source.username, token)
  const repos = await fetchUserRepos(source.username, token, source.includeForks)

  const chunks: IContentChunk[] = []

  const profileMetadata: Record<string, unknown> = {
    sourceUrl: profile.html_url,
    sourceLabel: source.label,
  }

  for (const text of splitTextIntoChunks(buildProfileDocument(profile))) {
    chunks.push({
      id: generateChunkId(source.id, text),
      source: source.id,
      text,
      metadata: profileMetadata,
    })
  }

  for (const repo of repos) {
    const readme = await fetchRepoReadme(source.username, repo.name, token)
    const languages = await fetchRepoLanguages(source.username, repo.name, token)

    const repoSource = `${source.id}-${repo.name.toLowerCase()}`
    const header = buildRepoContextHeader(repo)
    const metadata: Record<string, unknown> = {
      sourceUrl: repo.html_url,
      sourceLabel: `${source.label} — ${repo.name}`,
    }

    for (const text of splitTextIntoChunks(buildRepoDocument(repo, readme, languages))) {
      const contextualText = `${header}\n${text}`
      chunks.push({
        id: generateChunkId(repoSource, contextualText),
        source: repoSource,
        text: contextualText,
        metadata,
      })
    }
  }

  return chunks
}

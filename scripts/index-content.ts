import { chunkAllContent } from "../src/lib/rag/chunker"
import { chunkAllPdfs } from "../src/lib/rag/pdf-loader"
import { embedTexts } from "../src/lib/rag/embeddings"
import { createQdrantClient, ensureCollection, indexChunks } from "../src/lib/rag/qdrant"
import { scrapeWebSource, type IWebSource } from "../src/lib/rag/web-scraper"
import type { IContentChunk } from "../src/lib/rag/types"
import fs from "fs"
import path from "path"

/**
 * Charge les sources web depuis content/sources.json (si le fichier existe).
 */
function loadWebSources(): IWebSource[] {
  const sourcesPath = path.join(process.cwd(), "content", "sources.json")
  if (!fs.existsSync(sourcesPath)) {
    return []
  }
  return JSON.parse(fs.readFileSync(sourcesPath, "utf-8")) as IWebSource[]
}

/**
 * Script d'indexation du contenu markdown, PDF et sources web dans Qdrant.
 *
 * Usage: npx tsx scripts/index-content.ts
 *
 * Étapes :
 * 1. Charge et chunke tous les fichiers markdown de /content
 * 2. Charge et chunke tous les fichiers PDF de /content
 * 3. Scrape et chunke les sources web de content/sources.json
 * 4. Génère les embeddings via Gemini text-embedding-004
 * 5. Indexe les chunks + vecteurs dans Qdrant
 */
async function main() {
  console.log("🔄 Indexation du contenu dans Qdrant...\n")

  // 1. Chunking des fichiers markdown
  console.log("📄 Chargement et découpage des documents markdown...")
  const mdChunks = chunkAllContent()
  console.log(`   → ${mdChunks.length} chunks créés depuis les fichiers .md\n`)

  for (const chunk of mdChunks) {
    console.log(`   [${chunk.source}] ${chunk.text.slice(0, 60)}...`)
  }

  // 2. Chunking des fichiers PDF
  console.log("📑 Chargement et découpage des fichiers PDF...")
  const pdfChunks = await chunkAllPdfs()
  console.log(`   → ${pdfChunks.length} chunks créés depuis les fichiers .pdf\n`)

  for (const chunk of pdfChunks) {
    console.log(`   [${chunk.source}] ${chunk.text.slice(0, 60)}...`)
  }

  // 3. Scraping des sources web
  const webSources = loadWebSources()
  const webChunks: IContentChunk[] = []

  if (webSources.length > 0) {
    console.log(`\n🌐 Scraping de ${webSources.length} source(s) web...`)
    for (const source of webSources) {
      try {
        console.log(`   → ${source.label} (${source.url})...`)
        const chunks = await scrapeWebSource(source)
        webChunks.push(...chunks)
        console.log(`     ✅ ${chunks.length} chunks extraits`)
      } catch (error) {
        console.warn(`     ⚠️  Échec du scraping: ${error instanceof Error ? error.message : error}`)
      }
    }
    console.log(`   → ${webChunks.length} chunks web au total\n`)
  }

  const allChunks = [...mdChunks, ...pdfChunks, ...webChunks]

  if (allChunks.length === 0) {
    console.log("⚠️  Aucun contenu trouvé. Abandon.")
    process.exit(0)
  }

  // 3. Embeddings
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY est requis pour générer les embeddings.")
    process.exit(1)
  }

  console.log("🧠 Génération des embeddings via Gemini...")
  const texts = allChunks.map((c) => c.text)
  const embeddings = await embedTexts(texts, apiKey)
  console.log(`   → ${embeddings.length} embeddings générés (${embeddings[0].length} dimensions)\n`)

  // 4. Indexation Qdrant
  console.log("📦 Indexation dans Qdrant...")
  const client = createQdrantClient()
  await ensureCollection(client)
  await indexChunks(client, allChunks, embeddings)
  console.log(`   → ${allChunks.length} chunks indexés dans Qdrant (${mdChunks.length} md + ${pdfChunks.length} pdf + ${webChunks.length} web)\n`)

  console.log("✅ Indexation terminée avec succès !")
}

main().catch((error) => {
  console.error("❌ Erreur lors de l'indexation:", error)
  process.exit(1)
})

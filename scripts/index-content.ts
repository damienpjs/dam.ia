import { chunkAllContent } from "../src/lib/rag/chunker"
import { embedTexts } from "../src/lib/rag/embeddings"
import { createQdrantClient, ensureCollection, indexChunks } from "../src/lib/rag/qdrant"

/**
 * Script d'indexation du contenu markdown dans Qdrant.
 *
 * Usage: npx tsx scripts/index-content.ts
 *
 * Étapes :
 * 1. Charge et chunke tous les fichiers markdown de /content
 * 2. Génère les embeddings via Gemini text-embedding-004
 * 3. Indexe les chunks + vecteurs dans Qdrant
 */
async function main() {
  console.log("🔄 Indexation du contenu dans Qdrant...\n")

  // 1. Chunking
  console.log("📄 Chargement et découpage des documents...")
  const chunks = chunkAllContent()
  console.log(`   → ${chunks.length} chunks créés\n`)

  if (chunks.length === 0) {
    console.log("⚠️  Aucun document trouvé dans /content. Abandon.")
    process.exit(0)
  }

  for (const chunk of chunks) {
    console.log(`   [${chunk.source}] ${chunk.text.slice(0, 60)}...`)
  }

  // 2. Embeddings
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY est requis pour générer les embeddings.")
    process.exit(1)
  }

  console.log("\n🧠 Génération des embeddings via Gemini...")
  const texts = chunks.map((c) => c.text)
  const embeddings = await embedTexts(texts, apiKey)
  console.log(`   → ${embeddings.length} embeddings générés (${embeddings[0].length} dimensions)\n`)

  // 3. Indexation Qdrant
  console.log("📦 Indexation dans Qdrant...")
  const client = createQdrantClient()
  await ensureCollection(client)
  await indexChunks(client, chunks, embeddings)
  console.log(`   → ${chunks.length} chunks indexés dans Qdrant\n`)

  console.log("✅ Indexation terminée avec succès !")
}

main().catch((error) => {
  console.error("❌ Erreur lors de l'indexation:", error)
  process.exit(1)
})

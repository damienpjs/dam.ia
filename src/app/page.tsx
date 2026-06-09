import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/features/animated-background"
import Link from "next/link"

export default function Home() {
  return (
    <>
      <AnimatedBackground />
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <main className="flex flex-col items-center gap-8 text-center">
          {/* Titre */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Salut, je suis <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">Damien</span>
            </h1>
            <p className="mx-auto max-w-md text-lg text-zinc-400">Lead Tech JS — Discute avec moi pour en savoir plus sur mon parcours et mes projets.</p>
          </div>

          {/* CTA */}
          <Link href="/chat">
            <Button size="lg" className="mt-4 bg-gradient-to-r from-violet-600 to-orange-500 text-lg text-white shadow-lg shadow-violet-900/30 hover:from-violet-700 hover:to-orange-600">
              Commencer la conversation
            </Button>
          </Link>

          {/* Tech stack badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-zinc-400">
            {["Next.js", "TypeScript", "OpenAI", "Qdrant"].map((tech) => (
              <span key={tech} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
                {tech}
              </span>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

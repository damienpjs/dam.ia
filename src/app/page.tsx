"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/features/animated-background"

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <AnimatedBackground />

      {/* Accueil */}
      <div aria-hidden={chatOpen} className={`flex min-h-screen flex-col items-center justify-center px-4 transition-all duration-500 ease-in-out ${chatOpen ? "pointer-events-none -translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}>
        <main className="flex flex-col items-center gap-8 text-center">
          {/* Titre */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Salut, je suis <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">Damien</span>
            </h1>
            <p className="mx-auto max-w-md text-lg text-zinc-400">Lead Tech JS — Discute avec moi pour en savoir plus sur mon parcours et mes projets.</p>
          </div>

          {/* CTA */}
          <Button size="lg" onClick={() => setChatOpen(true)} className="mt-4 bg-gradient-to-r from-violet-600 to-orange-500 text-lg text-white shadow-lg shadow-violet-900/30 hover:from-violet-700 hover:to-orange-600">
            Commencer la conversation
          </Button>

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

      {/* Chat — slide in depuis le bas */}
      <div aria-hidden={!chatOpen} className={`fixed inset-0 flex flex-col transition-all duration-500 ease-out ${chatOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}>
        {/* Header */}
        <header className="border-b border-white/10 bg-background/60 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <button onClick={() => setChatOpen(false)} className="bg-clip-text text-sm font-semibold text-white">
              dam.ia
            </button>
          </div>
        </header>

        {/* Zone de chat */}
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="text-center">
            <p className="mb-4 text-zinc-400">Le chat sera bientôt disponible !</p>
            <p className="text-sm text-zinc-500">Phase 2 : Interface Chat UI</p>
          </div>
        </main>

        {/* Input */}
        <footer className="border-t border-white/10 bg-background/60 p-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input type="text" placeholder="Écris ton message..." disabled className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 backdrop-blur-sm" />
            <Button disabled className="bg-gradient-to-r from-violet-600 to-orange-500 text-white shadow-lg shadow-violet-900/30 hover:from-violet-700 hover:to-orange-600 disabled:opacity-50">
              Envoyer
            </Button>
          </div>
        </footer>
      </div>
    </>
  )
}

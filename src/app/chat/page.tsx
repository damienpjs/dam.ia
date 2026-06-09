"use client"

import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/features/animated-background"
import Link from "next/link"

export default function ChatPage() {
  return (
    <>
      <AnimatedBackground />
      <div className="relative flex min-h-screen flex-col">
        {/* Header */}
        <header className="border-b border-white/10 bg-background/60 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link href="/" className=" bg-clip-text text-sm font-semibold text-white">
              dam.ia
            </Link>
          </div>
        </header>

        {/* Chat area */}
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="text-center">
            <p className="mb-4 text-zinc-400">Le chat sera bientôt disponible !</p>
            <p className="text-sm text-zinc-500">Phase 2 : Interface Chat UI</p>
          </div>
        </main>

        {/* Input placeholder */}
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

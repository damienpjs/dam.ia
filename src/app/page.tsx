"use client"

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { HeroScene } from "@/components/features/hero-scene"
import { ChatInterface } from "@/components/features/chat-interface"
import { MessageBubble } from "@/components/features/message-bubble"
import { ProviderStatus } from "@/components/features/provider-status"
import { TechBadges } from "@/components/features/tech-badges"
import { SiteNav } from "@/components/ui/site-nav"
import { useLocale } from "@/lib/locale-context"
import { createWelcomeMessage, MORPH_DURATION_MS, MESSAGES_TOP_PADDING } from "@/constants/chat"

type TPhase = "landing" | "opening" | "chat"

interface ICloneState {
  rect: DOMRect
  offsetY: number
  morph: boolean
}

export default function Home() {
  const { t } = useLocale()
  const [phase, setPhase] = useState<TPhase>("landing")
  const [clone, setClone] = useState<ICloneState | null>(null)

  const welcomeMessage = useMemo(() => createWelcomeMessage(t.chat.welcome), [t.chat.welcome])

  const heroRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chatOpen = phase !== "landing"

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = null
  }, [])

  // Fin du morph : la bulle clone disparaît, le vrai message d'accueil prend le relais
  const finishMorph = useCallback(() => {
    clearFallback()
    setClone(null)
    setPhase("chat")
  }, [clearFallback])

  // Clic sur la bulle d'accueil : on capture sa position avant de monter le chat
  const openChat = useCallback(() => {
    if (phase !== "landing") return
    const rect = heroRef.current?.getBoundingClientRect()
    setClone(rect && rect.width > 0 ? { rect, offsetY: 0, morph: false } : null)
    setPhase("opening")
  }, [phase])

  const closeChat = useCallback(() => {
    clearFallback()
    setClone(null)
    setPhase("landing")
  }, [clearFallback])

  // Une fois le chat (et son header) montés, on lance le glissement de la bulle vers le haut
  useLayoutEffect(() => {
    if (phase !== "opening") return

    const headerRect = headerRef.current?.getBoundingClientRect()
    if (!clone || !headerRect) {
      finishMorph()
      return
    }

    const offsetY = headerRect.bottom + MESSAGES_TOP_PADDING - clone.rect.top

    const raf = requestAnimationFrame(() => setClone((prev) => (prev ? { ...prev, offsetY, morph: true } : prev)))
    // Filet de sécurité si transitionend ne se déclenche pas
    fallbackTimerRef.current = setTimeout(finishMorph, MORPH_DURATION_MS + 120)

    return () => cancelAnimationFrame(raf)
    // On ne relance qu'au changement de phase (clone est défini de façon synchrone avant le passage en "opening")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finishMorph])

  const showClone = phase === "opening" && clone !== null

  return (
    <>
      {/* Les bulles de réplique du personnage sont masquées quand la conversation est ouverte */}
      <HeroScene bubblesEnabled={!chatOpen} />

      {/* Accueil — pointer-events-none sur le conteneur pour laisser le clic-glissé
          atteindre la scène 3D derrière ; réactivé sur les éléments interactifs. */}
      <div aria-hidden={chatOpen} className={`pointer-events-none flex min-h-screen flex-col items-center justify-center px-4 transition-all duration-500 ease-in-out ${chatOpen ? "-translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}>
        {/* Navigation : coin supérieur droit, hors du flux central. Elle
            s'estompe avec la landing — le header du chat prend le relais avec
            les mêmes entrées, d'où un simple fondu croisé à l'ouverture. */}
        <SiteNav current="home" className="fixed right-4 top-4 z-40" />

        <main className="flex w-full flex-col items-center gap-8 text-center">
          {/* Accroche : police mono pour l'esprit code/LLM, terme en dégradé animé */}
          <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.landing.greeting}
            <span className="text-gradient-animated">{t.landing.greetingHighlight}</span>
          </h1>

          {/* Bulle d'accueil = premier message de la conversation, cliquable */}
          <button type="button" onClick={openChat} aria-label={t.landing.startConversationAria} className="group pointer-events-auto flex w-full max-w-3xl cursor-pointer flex-col gap-2 px-3 text-left sm:px-4">
            <div ref={heroRef} className={`animate-hero-float transition-transform duration-300 group-hover:-translate-y-1 ${phase === "landing" ? "opacity-100" : "opacity-0"}`}>
              <MessageBubble message={welcomeMessage} showActions={false} />
            </div>
            <p className="pl-11 text-sm text-zinc-500 transition-colors group-hover:text-coral">
              {t.landing.startConversation}
              <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </p>
          </button>

          {/* Étiquettes des technos maîtrisées (avec logos + « voir X + ») */}
          <TechBadges />

          {/* Lien discret vers la page about */}
          <Link href="/about" className="pointer-events-auto font-mono text-xs text-zinc-600 transition-colors duration-300 hover:text-coral">
            {t.landing.aboutLink}
            <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </main>
      </div>

      {/* Chat — fondu pur : la bulle d'accueil assure le mouvement via le morph */}
      <div aria-hidden={!chatOpen} className={`fixed inset-0 flex flex-col overflow-x-hidden transition-opacity duration-500 ease-out ${chatOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {/* Header */}
        <header ref={headerRef} className="border-b border-white/10 bg-background/60 px-4 py-3 backdrop-blur-md">
          <SiteNav
            current="home"
            className="mx-auto max-w-3xl"
            brand={
              <button onClick={closeChat} className="bg-clip-text text-sm font-semibold text-white">
                Damien Pasulj
              </button>
            }
          >
            <ProviderStatus />
          </SiteNav>
        </header>

        {/* Zone de chat */}
        {chatOpen && <ChatInterface messagesVisible={phase === "chat"} />}
      </div>

      {/* Bulle clone qui glisse de la landing vers le haut du chat */}
      {showClone && clone && (
        <div
          data-testid="welcome-clone"
          aria-hidden="true"
          onTransitionEnd={finishMorph}
          style={{
            position: "fixed",
            top: clone.rect.top,
            left: clone.rect.left,
            width: clone.rect.width,
            zIndex: 50,
            pointerEvents: "none",
            transform: clone.morph ? `translateY(${clone.offsetY}px)` : "translateY(0)",
            transition: clone.morph ? `transform ${MORPH_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none",
          }}
        >
          <MessageBubble message={welcomeMessage} showActions={false} />
        </div>
      )}
    </>
  )
}

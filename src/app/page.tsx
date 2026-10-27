"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { HeroScene } from "@/components/features/hero-scene"
import { ChatInterface } from "@/components/features/chat-interface"
import { ReadmeCard } from "@/components/features/readme-card"
import { NameBlock } from "@/components/ui/name-block"
import { SiteNav } from "@/components/ui/site-nav"
import { useLocale } from "@/lib/locale-context"
import { trackEvent } from "@/lib/analytics"
import { MORPH_DURATION_MS, MESSAGES_TOP_PADDING } from "@/constants/chat"
import { CV, CV_BYTES, GITHUB, LINKEDIN, type IProfileLink } from "@/constants/profile"

type TPhase = "landing" | "opening" | "chat"

interface ICloneState {
  rect: DOMRect
  offsetY: number
  morph: boolean
}

/** Liens du pied de l'accueil : le CV d'abord, puis les profils. */
const FOOTER_LINKS: IProfileLink[] = [CV, GITHUB, LINKEDIN]

export default function Home() {
  const { t } = useLocale()
  const [phase, setPhase] = useState<TPhase>("landing")
  const [clone, setClone] = useState<ICloneState | null>(null)
  const [turns, setTurns] = useState(0)

  const heroRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Nombre de messages échangés, remonté par le chat : il qualifie la fermeture
  // (repli immédiat ou sortie après conversation).
  const turnsRef = useRef(0)

  const chatOpen = phase !== "landing"

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = null
  }, [])

  // Fin du morph : le clone disparaît, le vrai message d'accueil prend le relais
  const finishMorph = useCallback(() => {
    clearFallback()
    setClone(null)
    setPhase("chat")
  }, [clearFallback])

  // Clic sur le README : on capture sa position avant de monter le chat
  const openChat = useCallback(() => {
    if (phase !== "landing") return
    trackEvent("chat_opened")
    const rect = heroRef.current?.getBoundingClientRect()
    setClone(rect && rect.width > 0 ? { rect, offsetY: 0, morph: false } : null)
    setPhase("opening")
  }, [phase])

  const closeChat = useCallback(() => {
    trackEvent("chat_closed", { turns: turnsRef.current })
    clearFallback()
    setClone(null)
    setPhase("landing")
  }, [clearFallback])

  // Une fois le chat (et son header) montés, on lance le glissement du README vers le haut
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

  const handleTurnsChange = useCallback((count: number) => {
    turnsRef.current = count
    setTurns(count)
  }, [])

  const showClone = phase === "opening" && clone !== null

  return (
    <>
      {/* Le personnage passe à droite du panneau quand la conversation s'ouvre ;
          ses répliques se taisent pendant qu'on parle à son double. */}
      <HeroScene bubblesEnabled={!chatOpen} layout={chatOpen ? "chat" : "landing"} />

      {/* Une seule barre pour la landing et le chat, fixée en haut à droite :
          elle reste au-dessus de la scène quand le panneau s'ouvre à gauche. */}
      <SiteNav current="home" analyticsFrom={chatOpen ? "chat" : "landing"} className="fixed top-2 right-5 z-40 lg:top-3.5 lg:right-16" />

      {/* Accueil : pointer-events-none sur le conteneur pour laisser le clic-glissé
          atteindre la scène 3D ; réactivé sur les éléments interactifs. */}
      <div aria-hidden={chatOpen} inert={chatOpen} className={`pointer-events-none flex min-h-dvh flex-col px-5 pt-[76px] pb-20 transition-all duration-500 ease-in-out lg:px-16 lg:pt-[136px] ${chatOpen ? "-translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}>
        <main className="flex w-full max-w-[644px] flex-col">
          <NameBlock className="text-[60px] lg:text-[128px]" />
          <p className="mt-4 text-[14px] font-medium text-ink lg:mt-7 lg:text-[22px]">{t.landing.role}</p>

          {/* Le README est le premier message de la conversation : un clic l'ouvre */}
          <button type="button" onClick={openChat} aria-label={t.landing.startConversationAria} className="group pointer-events-auto mt-6 flex w-full cursor-pointer flex-col text-left lg:mt-12">
            <div ref={heroRef} className={`w-full transition-colors ${phase === "landing" ? "opacity-100" : "opacity-0"}`}>
              <ReadmeCard content={t.chat.welcome} className="group-hover:border-teal-ink" />
            </div>
            <span className="flex h-12 w-full items-center justify-between border-x border-b border-rule bg-paper px-4 text-[14px] font-medium text-teal-ink transition-colors group-hover:border-teal-ink lg:px-5 lg:text-[15px]">
              <span>
                <span aria-hidden="true" className="mr-[1ch] inline-block transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
                {t.landing.startConversation}
              </span>
              <span aria-hidden="true" className="hidden text-body lg:inline">
                ↲
              </span>
            </span>
          </button>
        </main>

        <footer className="pointer-events-auto fixed inset-x-0 bottom-0 flex items-baseline justify-between gap-6 bg-paper px-5 py-3 text-[12px] lg:inset-x-16 lg:bottom-6 lg:bg-transparent lg:px-0 lg:py-0 lg:text-[13px]">
          <p className="flex flex-wrap items-baseline gap-x-7 gap-y-1">
            {FOOTER_LINKS.map((link) => (
              <span key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("profile_link_clicked", { link: link.label })}
                  className="file-name py-2 hover:text-ink"
                >
                  {link.label}
                </a>
                {link === CV && <span className="hidden text-coral-ink lg:inline"> {t.common.fileSize(CV_BYTES)}</span>}
              </span>
            ))}
          </p>
          <p className="hidden text-[12px] text-body lg:block">{t.landing.orbitHint}</p>
        </footer>
      </div>

      {/* Conversation : un panneau papier à gauche, la scène reste visible à droite */}
      <div aria-hidden={!chatOpen} inert={!chatOpen} className={`fixed inset-0 flex transition-opacity duration-500 ease-out ${chatOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <section aria-label={t.chat.conversationDir} className="flex h-full w-full flex-col border-rule bg-paper lg:w-[58.333%] lg:border-r">
          <header ref={headerRef} className="flex h-[60px] shrink-0 items-center justify-between border-b border-rule px-5 lg:h-[72px] lg:pr-12 lg:pl-16">
            <button type="button" onClick={closeChat} className="cursor-pointer py-3 text-[16px] font-bold tracking-[-0.03em] text-ink lg:text-[18px]">
              damien pasulj
              <span aria-hidden="true" className="ml-[3px] inline-block size-[5px] bg-dot lg:size-1.5" />
            </button>
            <p className="hidden text-[13px] lg:block">
              <span className="font-medium text-ink">{t.chat.conversationDir}</span>
              {" "}
              <span className="text-coral-ink">{t.chat.messageCount(turns)}</span>
            </p>
          </header>

          {chatOpen && <ChatInterface messagesVisible={phase === "chat"} onTurnsChange={handleTurnsChange} />}
        </section>
      </div>

      {/* README clone qui glisse de la landing vers le haut du chat */}
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
          <ReadmeCard content={t.chat.welcome} />
        </div>
      )}
    </>
  )
}

"use client"

import Image from "next/image"
import Link from "next/link"
import { Timeline } from "@/components/features/timeline"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useLocale } from "@/lib/locale-context"

/** Libellé de section : mono, capitales, discret — rythme l'éditorial. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-coral/70">{children}</p>
}

/**
 * Contenu éditorial de la page « à propos ».
 *
 * Composant client : tout son texte vient du dictionnaire de la langue courante.
 * Les métadonnées SEO restent côté serveur, dans `src/app/about/page.tsx`.
 */
export function AboutContent() {
  const { t } = useLocale()

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col">
      {/* Retour vers l'accueil / le chat, et sélecteur de langue */}
      <nav className="mb-16 flex items-center justify-between gap-4">
        <Link href="/" className="group inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-coral">
          <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">←</span>
          Damien Pasulj
        </Link>
        <LanguageSwitcher />
      </nav>

      {/* En-tête éditorial */}
      <header className="mb-20">
        <div className="flex items-start gap-8">
          <div className="flex-1">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-teal/80">{t.about.eyebrow}</p>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              {t.about.titleLead}
              <span className="text-gradient-animated">{t.about.titleHighlight}</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{t.about.intro}</p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Image src="/photo-damien.jpg" alt="Damien Pasulj" width={160} height={160} className="rounded-2xl object-cover" priority />
          </div>
        </div>
      </header>

      {/* Introduction / narration */}
      <section className="mb-20">
        <SectionLabel>{t.about.storyLabel}</SectionLabel>
        <div className="space-y-5 text-base leading-relaxed text-foreground/90">
          {t.about.story.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* Parcours — timeline (de la plus ancienne à la plus récente) */}
      <section className="mb-20">
        <SectionLabel>{t.about.careerLabel}</SectionLabel>
        <Timeline entries={[...t.about.timeline].reverse()} />
      </section>

      {/* Compétences */}
      <section className="mb-20">
        <SectionLabel>{t.about.skillsLabel}</SectionLabel>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
          {t.about.skillGroups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{group.label}</h2>
              <ul className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li key={item} className="rounded-full border border-coral/20 bg-coral/5 px-2.5 py-0.5 text-[12px] text-coral/80">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* En dehors du code */}
      <section className="mb-20">
        <SectionLabel>{t.about.beyondCodeLabel}</SectionLabel>
        <p className="mb-6 text-base leading-relaxed text-foreground/90">{t.about.beyondCodeIntro}</p>
        <ul className="flex flex-wrap gap-2">
          {t.about.interests.map((interest) => (
            <li key={interest} className="rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-sm text-teal/90">
              {interest}
            </li>
          ))}
        </ul>
      </section>

      {/* Philosophie */}
      <section className="mb-20">
        <SectionLabel>{t.about.philosophyLabel}</SectionLabel>
        <p className="text-base leading-relaxed text-foreground/90">{t.about.philosophy}</p>
      </section>

      {/* Appel à l'action vers le chat */}
      <footer className="border-t border-border pt-10">
        <p className="text-base text-muted-foreground">{t.about.ctaQuestion}</p>
        <Link href="/" className="group mt-3 inline-flex items-center gap-2 font-heading text-lg font-semibold text-coral transition-colors hover:text-coral-deep">
          {t.about.ctaLink}
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </footer>
    </article>
  )
}

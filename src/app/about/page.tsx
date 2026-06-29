import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Timeline } from "@/components/features/timeline"

export const metadata: Metadata = {
  title: "À propos",
  description: "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS. Parcours, compétences et passions de Damien Pasulj.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "profile",
    locale: "fr_FR",
    url: "https://damienpasulj.com/about",
    siteName: "Damien Pasulj",
    title: "À propos — Damien Pasulj",
    description: "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS. Parcours, compétences et passions de Damien Pasulj.",
    images: [
      {
        url: "/photo-damien.jpg",
        width: 120,
        height: 120,
        alt: "Damien Pasulj",
      },
    ],
    firstName: "Damien",
    lastName: "Pasulj",
  },
  twitter: {
    card: "summary",
    title: "À propos — Damien Pasulj",
    description: "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS. Parcours, compétences et passions de Damien Pasulj.",
    images: ["/photo-damien.jpg"],
  },
}

/** Une étape du parcours professionnel ou de formation. */
interface ITimelineEntry {
  period: string
  role: string
  org: string
  description: string
  stack?: string[]
  current?: boolean
}

/** Un groupe de compétences affiché en colonne. */
interface ISkillGroup {
  label: string
  items: string[]
}

const TIMELINE: ITimelineEntry[] = [
  {
    period: "2024 — présent",
    role: "Lead React / TypeScript / Next.js",
    org: "Apizee",
    description: "Lead technique sur le cœur de produit, définition de l'architecture front-end et des bonnes pratiques, mise en place de pipelines GitLab CI/CD et encadrement de l'équipe.",
    stack: ["React", "TypeScript", "Next.js", "GitLab CI/CD"],
    current: true,
  },
  {
    period: "2022 — 2024",
    role: "Lead refonte du cœur de produit",
    org: "elloha",
    description: "Pilotage de la refonte complète du produit en React, TypeScript et Next.js. Migration progressive depuis l'ancienne stack ASP.NET/C# et montée en compétences de l'équipe.",
    stack: ["React", "TypeScript", "Next.js"],
  },
  {
    period: "2017 — 2022",
    role: "Développeur front-end",
    org: "elloha",
    description: "Développement et maintenance de la web application principale en ASP.NET/C#. Acquisition d'une expertise solide sur les problématiques métier du secteur touristique.",
    stack: ["ASP.NET", "C#"],
  },
  {
    period: "2014 — 2017",
    role: "Développeur web",
    org: "elloha",
    description: "Création de sites web sous le CMS DotNetNuke pour des destinations touristiques majeures — collioure.com, tourismegard.com, morbihan.com, et bien d'autres.",
    stack: ["DotNetNuke", "Front-end web"],
  },
  {
    period: "2012 — 2014",
    role: "Formation UI/UX & développement web",
    org: "L'IDEM — École Supérieure des Métiers Créatifs et Numériques",
    description: "Une première année dédiée au design d'interface et à l'expérience utilisateur, une seconde au développement web. La double compétence qui irrigue encore tout mon travail.",
  },
]

const SKILL_GROUPS: ISkillGroup[] = [
  { label: "Stack principale", items: ["React", "TypeScript", "Next.js", "Node.js"] },
  { label: "DevOps", items: ["GitLab CI/CD", "Git", "Architecture front-end"] },
  { label: "IA & RAG", items: ["LLM (Claude, OpenAI, Gemini)", "RAG", "Embeddings", "Qdrant"] },
  { label: "Design & identité visuelle", items: ["UI/UX", "Photoshop", "Illustrator", "InDesign", "After Effects", "Premiere Pro"] },
  { label: "Historique", items: ["ASP.NET / C# (5+ ans)", "DotNetNuke"] },
  { label: "Soft skills", items: ["Organisation", "Travail d'équipe", "Good vibes", "Créativité"] },
]

const INTERESTS: string[] = ["Voyages", "Sport", "Philosophie", "Dessin"]

/** Libellé de section : mono, capitales, discret — rythme l'éditorial. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-coral/70">{children}</p>
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Damien Pasulj",
  url: "https://damienpasulj.com",
  sameAs: ["https://www.linkedin.com/in/damien-pasulj-700928ba/"],
  jobTitle: "Product Builder & Lead React / TypeScript / Next.js",
  description: "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS. Plus de onze ans d'expérience en front-end et en full-stack.",
  image: "https://damienpasulj.com/photo-damien.jpg",
  worksFor: {
    "@type": "Organization",
    name: "Apizee",
  },
  knowsAbout: ["React", "TypeScript", "Next.js", "Node.js", "Intelligence artificielle", "RAG", "Qdrant", "GitLab CI/CD"],
  alumniOf: {
    "@type": "EducationalOrganization",
    name: "L'IDEM — École Supérieure des Métiers Créatifs et Numériques",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Amélie-les-Bains",
    addressRegion: "Pyrénées-Orientales",
    addressCountry: "FR",
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full px-6 py-16 sm:px-8 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto flex w-full max-w-2xl flex-col">
        {/* Retour vers l'accueil / le chat */}
        <nav className="mb-16">
          <Link href="/" className="group inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-coral">
            <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">←</span>
            Damien Pasulj
          </Link>
        </nav>

        {/* En-tête éditorial */}
        <header className="mb-20">
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-teal/80">À propos</p>
              <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                Product Builder &amp; <span className="text-gradient-animated">enthousiaste IA</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Je m&apos;appelle Damien Pasulj. Je conçois et construis des produits web, avec plus de onze ans d&apos;expérience en front-end et en full-stack, ancré sur un solide socle de Technical Lead JavaScript — avec en filigrane une
                sensibilité esthète forgée à l&apos;école de design.
              </p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Image src="/photo-damien.jpg" alt="Damien Pasulj" width={120} height={120} className="rounded-2xl object-cover grayscale transition-all duration-500 hover:grayscale-0" priority />
            </div>
          </div>
        </header>

        {/* Introduction / narration */}
        <section className="mb-20">
          <SectionLabel>Le fil rouge</SectionLabel>
          <div className="space-y-5 text-base leading-relaxed text-foreground/90">
            <p>
              Tout a commencé à l&apos;IDEM, une école de design où j&apos;étudiais l&apos;ergonomie, l&apos;apparence et l&apos;identité visuelle des sites. Ce qui fait qu&apos;un site fonctionne — ou pas — d&apos;un point de vue marketing.
              Passionné d&apos;interfaces et de technologies depuis toujours, j&apos;ai aussi un côté esthète : j&apos;aime concevoir des choses, initialement inertes, et leur donner vie sur le web.
            </p>
            <p>
              Mais la surface ne suffisait pas. Je voulais comprendre l&apos;envers du décor — comment on passe d&apos;une maquette à un site en ligne. Cette curiosité m&apos;a conduit à mêler une année de design d&apos;interface à une année de
              développement : une double sensibilité UI/UX et technique qui irrigue encore tout mon travail.
            </p>
            <p>
              Pendant dix ans chez elloha, j&apos;ai grandi avec le produit : des premiers sites touristiques sous CMS jusqu&apos;à la refonte complète du cœur de l&apos;application en React, TypeScript et Next.js, que j&apos;ai eu la chance de mener
              en tant que lead. Aujourd&apos;hui, chez Apizee, je continue sur cette voie — architecture front-end, CI/CD et accompagnement d&apos;équipe.
            </p>
            <p>En parallèle, l&apos;IA générative est devenue un terrain de jeu et d&apos;exploration : LLM, RAG, embeddings. Ce site en est d&apos;ailleurs une démonstration — mon « double IA » répond à votre place pour parler de mon parcours.</p>
          </div>
        </section>

        {/* Parcours — timeline */}
        <section className="mb-20">
          <SectionLabel>Parcours</SectionLabel>
          <Timeline entries={[...TIMELINE].reverse()} />
        </section>

        {/* Compétences */}
        <section className="mb-20">
          <SectionLabel>Compétences</SectionLabel>
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
            {SKILL_GROUPS.map((group) => (
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
          <SectionLabel>En dehors du code</SectionLabel>
          <p className="mb-6 text-base leading-relaxed text-foreground/90">
            Basé dans les Pyrénées-Orientales, je travaille en full remote. Français langue maternelle, anglais courant. En dehors de l&apos;écran, je nourris ma curiosité autrement&nbsp;.
          </p>
          <ul className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <li key={interest} className="rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-sm text-teal/90">
                {interest}
              </li>
            ))}
          </ul>
        </section>

        {/* Philosophie */}
        <section className="mb-20">
          <SectionLabel>Philosophie</SectionLabel>
          <p className="text-base leading-relaxed text-foreground/90">
            Quelle que soit la mission, l&apos;objectif reste le même : trouver le meilleur compromis entre élégance, rapidité et durabilité. Rester léger, ne pas accumuler de dette technique, choisir les pratiques les mieux adaptées au projet — et
            livrer quelque chose dont on est fier.
          </p>
        </section>

        {/* Appel à l'action vers le chat */}
        <footer className="border-t border-border pt-10">
          <p className="text-base text-muted-foreground">Envie d&apos;en savoir plus sur mon parcours, mes projets ou mes passions&nbsp;?</p>
          <Link href="/" className="group mt-3 inline-flex items-center gap-2 font-heading text-lg font-semibold text-coral transition-colors hover:text-coral-deep">
            Discute avec mon double IA
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </footer>
      </article>
    </div>
  )
}

import type { Metadata } from "next"
import { AboutContent } from "@/components/features/about-content"

/**
 * Page « à propos ».
 *
 * Composant serveur réduit aux métadonnées et aux données structurées : le
 * contenu éditorial, traduisible, vit dans `AboutContent` (composant client).
 * Le SEO reste en français : le site n'expose qu'une URL par page, le sélecteur
 * « FR / EN » ne changeant que l'affichage côté navigateur.
 */
export const metadata: Metadata = {
  title: "À propos",
  description: "Lead Tech JavaScript, en transition vers l'IA appliquée. Parcours, projets et passions de Damien Pasulj.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "profile",
    locale: "fr_FR",
    url: "https://damienpasulj.com/about",
    siteName: "Damien Pasulj",
    title: "À propos | Damien Pasulj",
    description: "Lead Tech JavaScript, en transition vers l'IA appliquée. Parcours, projets et passions de Damien Pasulj.",
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
    title: "À propos | Damien Pasulj",
    description: "Lead Tech JavaScript, en transition vers l'IA appliquée. Parcours, projets et passions de Damien Pasulj.",
    images: ["/photo-damien.jpg"],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Damien Pasulj",
  url: "https://damienpasulj.com",
  sameAs: ["https://www.linkedin.com/in/damien-pasulj-700928ba/"],
  jobTitle: "Lead Tech JavaScript · IA appliquée",
  description: "Lead Tech JavaScript, en transition vers l'IA appliquée. Douze ans d'expérience en front-end et en full-stack.",
  image: "https://damienpasulj.com/photo-damien.jpg",
  worksFor: {
    "@type": "Organization",
    name: "Apizee",
  },
  knowsAbout: ["React", "TypeScript", "Next.js", "Node.js", "Intelligence artificielle", "RAG", "Qdrant", "GitLab CI/CD"],
  alumniOf: {
    "@type": "EducationalOrganization",
    name: "L'IDEM, École Supérieure des Métiers Créatifs et Numériques",
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
    <div className="min-h-screen w-full px-5 pt-2 pb-12 lg:px-24 lg:pt-6 lg:pb-[72px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AboutContent />
    </div>
  )
}

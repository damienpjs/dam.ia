import type { Metadata } from "next"
import { ProjectsContent } from "@/components/features/projects-content"
import { DICTIONARIES } from "@/constants/dictionary"

/**
 * Page « projets ».
 *
 * Composant serveur réduit aux métadonnées et aux données structurées : le
 * contenu éditorial, traduisible, vit dans `ProjectsContent` (composant client).
 * Le SEO reste en français, comme « à propos » : une seule URL par page.
 */
const DESCRIPTION = "Projets personnels de Damien Pasulj : hodl-on-a-minute, un jeu de prédiction du bitcoin à 60 secondes, et Komfy, une télécommande mobile pour ComfyUI."

const OG_IMAGE = {
  url: "/projects/hodl-on-a-minute.png",
  width: 2880,
  height: 1440,
  alt: "Écran d’accueil de hodl-on-a-minute",
}

export const metadata: Metadata = {
  title: "Projets",
  description: DESCRIPTION,
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://damienpasulj.com/projects",
    siteName: "Damien Pasulj",
    title: "Projets | Damien Pasulj",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Projets | Damien Pasulj",
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Projets de Damien Pasulj",
  itemListElement: DICTIONARIES.fr.projects.entries.map((project, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "SoftwareApplication",
      name: project.name,
      description: project.summary,
      url: project.href,
      author: { "@type": "Person", name: "Damien Pasulj", url: "https://damienpasulj.com" },
    },
  })),
}

export default function ProjectsPage() {
  return (
    <div className="min-h-screen w-full px-5 pt-2 pb-12 lg:px-24 lg:pt-6 lg:pb-[72px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProjectsContent />
    </div>
  )
}

import type { Metadata, Viewport } from "next"
import { GoogleAnalytics } from "@next/third-parties/google"
import localFont from "next/font/local"
import { DEFAULT_LOCALE } from "@/constants/i18n"
import { LocaleProvider } from "@/lib/locale-context"
import "./globals.css"

// Sans identifiant de mesure, aucun script d'analytics n'est chargé : le
// développement local, les tests et les prévisualisations Vercel restent muets.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

// IBM Plex Mono, la police du CV, en trois graisses. Auto-hébergée et sous-
// ensemblée (latin, latin étendu, flèches, coche, blocs) : le sous-ensemble
// « latin » de Google Fonts n'a pas la flèche →, omniprésente dans l'interface.
const plexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-mono-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-bold.woff2", weight: "700", style: "normal" },
  ],
})

const TITLE = "Damien Pasulj | Lead Tech JavaScript · IA appliquée"
const DESCRIPTION = "Lead Tech JavaScript, en transition vers l'IA appliquée. Discute avec mon double IA pour en savoir plus sur mon parcours et mes projets."

export const metadata: Metadata = {
  metadataBase: new URL("https://damienpasulj.com"),
  title: {
    default: TITLE,
    template: "%s | Damien Pasulj",
  },
  description: DESCRIPTION,
  authors: [{ name: "Damien Pasulj", url: "https://damienpasulj.com" }],
  creator: "Damien Pasulj",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://damienpasulj.com",
    siteName: "Damien Pasulj",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/photo-damien.jpg",
        width: 120,
        height: 120,
        alt: "Damien Pasulj",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/photo-damien.jpg"],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#eef0ec",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // `lang` reflète la langue du rendu serveur ; le LocaleProvider le réaligne
    // côté client sur la langue mémorisée par le visiteur.
    <html lang={DEFAULT_LOCALE} className={`${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-body">
        <LocaleProvider>{children}</LocaleProvider>
        {/* Grain du papier, par-dessus tout : purement décoratif, il laisse
            passer les clics et sort de l'arbre d'accessibilité. */}
        <div aria-hidden="true" className="paper-grain pointer-events-none fixed inset-0 z-[60]" />
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  )
}

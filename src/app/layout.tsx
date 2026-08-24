import type { Metadata, Viewport } from "next"
import { GoogleAnalytics } from "@next/third-parties/google"
import { Plus_Jakarta_Sans, Geist, Geist_Mono } from "next/font/google"
import { DEFAULT_LOCALE } from "@/constants/i18n"
import { LocaleProvider } from "@/lib/locale-context"
import "./globals.css"

// Sans identifiant de mesure, aucun script d'analytics n'est chargé : le
// développement local, les tests et les prévisualisations Vercel restent muets.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
})

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://damienpasulj.com"),
  title: {
    default: "Damien Pasulj — Product Builder & enthousiaste IA",
    template: "%s — Damien Pasulj",
  },
  description:
    "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS — Discute avec mon double IA pour en savoir plus sur mon parcours et mes projets.",
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
    title: "Damien Pasulj — Product Builder & enthousiaste IA",
    description:
      "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS — Discute avec mon double IA pour en savoir plus sur mon parcours et mes projets.",
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
    title: "Damien Pasulj — Product Builder & enthousiaste IA",
    description:
      "Product Builder & enthousiaste IA, ancré sur un solide socle en Technical Lead JS — Discute avec mon double IA pour en savoir plus sur mon parcours et mes projets.",
    images: ["/photo-damien.jpg"],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // `lang` reflète la langue du rendu serveur ; le LocaleProvider le réaligne
    // côté client sur la langue mémorisée par le visiteur.
    <html lang={DEFAULT_LOCALE} className={`${plusJakartaSans.variable} ${geist.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  )
}

import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

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
  title: "damienpasulj(); - Lead Tech JS, Builder, Technologiste",
  description: "Lead Tech JS — Discute avec l'IA de Damien pour en savoir plus sur son parcours et ses projets.",
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
    <html lang="fr" className={`${plusJakartaSans.variable} ${geist.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">{children}</body>
    </html>
  )
}

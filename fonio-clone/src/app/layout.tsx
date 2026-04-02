import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Chargement optimisé de la police Inter via next/font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Métadonnées globales de l'application
export const metadata: Metadata = {
  title: {
    default: 'VoxyPhone - Téléphonie Cloud & Agents Vocaux IA',
    template: '%s | VoxyPhone',
  },
  description: 'Plateforme SaaS de téléphonie cloud avec numéros virtuels, appels, SMS et agents vocaux IA propulsés par RetellAI.',
  keywords: ['téléphonie cloud', 'agent vocal IA', 'SaaS', 'VoxyPhone', 'RetellAI', 'Telnyx'],
}

// Configuration viewport séparée (Next.js 15+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

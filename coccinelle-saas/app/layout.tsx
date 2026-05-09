import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coccinelle.ai — Agent vocal IA pour PME francaises",
  description: "La relation client des grands groupes, sans SVI, multicanal, a partir de 79 euros/mois. Votre agent vocal repond 24h/24, prend les RDV et confirme par SMS.",
  keywords: "agent vocal IA, PME francaise, relation client, sans SVI, multicanal, rendez-vous automatique",
  alternates: {
    canonical: "https://coccinelle.ai",
  },
  openGraph: {
    title: "Coccinelle.ai — Agent vocal IA pour PME francaises",
    description: "La relation client des grands groupes, sans SVI, multicanal, a partir de 79 euros/mois.",
    url: "https://coccinelle.ai",
    siteName: "Coccinelle.ai",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://coccinelle.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "Coccinelle.ai - Agent vocal IA pour PME",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coccinelle.ai - Agent vocal IA pour PME francaises",
    description: "La relation client des grands groupes, sans SVI, multicanal, a partir de 79 euros/mois. Votre agent vocal repond 24h/24, prend les RDV et confirme par SMS.",
    images: ["https://coccinelle.ai/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

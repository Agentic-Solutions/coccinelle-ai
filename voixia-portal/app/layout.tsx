import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoixIA — Console",
  description: "Créez et pilotez vos agents vocaux IA.",
};

// Applique le thème sauvegardé avant le premier paint (évite le flash clair→sombre).
const themeScript = `(function(){try{var t=localStorage.getItem('voixia-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Polices Inter + JetBrains Mono — mêmes que la landing VoixIA */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

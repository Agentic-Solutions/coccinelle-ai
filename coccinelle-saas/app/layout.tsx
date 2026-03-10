import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coccinelle AI - Assistant vocal intelligent 24/7",
  description: "Call center IA et relation client omnicanale. Gérez vos appels, SMS, WhatsApp et emails avec Sara, votre assistante virtuelle intelligente.",
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

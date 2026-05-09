import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VoixIA — Infrastructure vocale IA pour professionnels',
  description: 'API de voix conversationnelle, telephonie SIP integree, 20 voix francaises natives. Deployez un agent vocal IA en 5 minutes. Par Coccinelle.ai.',
  keywords: 'voix IA, API vocale, agent vocal, SIP, infrastructure vocale, intelligence artificielle, voix francaise',
  openGraph: {
    title: 'VoixIA — Infrastructure vocale IA pour professionnels',
    description: 'API de voix conversationnelle, telephonie SIP integree, 20 voix francaises natives. Deployez un agent vocal IA en 5 minutes.',
    url: 'https://coccinelle.ai/voixia',
    siteName: 'VoixIA by Coccinelle.ai',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function VoixIALayout({ children }: { children: React.ReactNode }) {
  return children;
}

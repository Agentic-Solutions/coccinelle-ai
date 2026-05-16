import type { Metadata } from 'next';
import {
  Shield,
  Calendar,
  FileSearch,
  Phone,
  MessageSquare,
  Lock,
} from 'lucide-react';
import SectorPageLayout, {
  type SectorPageData,
} from '@/components/sector/SectorPageLayout';

export const metadata: Metadata = {
  title: 'Notaire : zéro appel manqué, zéro client perdu | Coccinelle.ai',
  description:
    'Coccinelle répond à vos clients 24h/24. Ventes, successions, donations — chaque demande orientée vers le bon clerc automatiquement.',
  alternates: { canonical: 'https://coccinelle.ai/secteurs/notaire' },
  openGraph: {
    title: 'Notaire : zéro appel manqué, zéro client perdu | Coccinelle.ai',
    description:
      'Coccinelle répond à vos clients 24h/24. Ventes, successions, donations — chaque demande orientée vers le bon clerc.',
    url: 'https://coccinelle.ai/secteurs/notaire',
    siteName: 'Coccinelle.ai',
    locale: 'fr_FR',
    type: 'website',
  },
};

const DATA: SectorPageData = {
  sectorKey: 'notaire',
  sectorName: 'Notaire',
  heroTitle:
    'Votre client attend des nouvelles de son dossier depuis 3 jours. Il mérite une réponse maintenant.',
  heroSubtitle:
    'Coccinelle informe vos clients, prend les rendez-vous et oriente les demandes vers le bon clerc — pendant que vous signez.',
  heroBadges: ['Ventes', 'Successions', 'Donations'],
  scenario1: {
    label: 'Client · Vente',
    callerName: 'Marie Dubois',
    callerPhone: '06 45 67 89 01',
    messages: [
      {
        role: 'client',
        text: 'Bonjour, où en est mon compromis de vente ? Je signe dans 3 jours',
        delay: 0,
      },
      {
        role: 'assistant',
        text: "Bonjour Madame Dubois. Votre dossier est en cours de finalisation. Les fonds ont été reçus et l'acte est prêt pour la signature du 17 mai.",
        delay: 1500,
      },
      {
        role: 'client',
        text: 'Parfait, je dois apporter quoi comme documents ?',
        delay: 3000,
      },
      {
        role: 'assistant',
        text: "Votre pièce d'identité et le RIB pour le virement du solde. Je vous envoie un récapitulatif par SMS.",
        delay: 4500,
      },
    ],
    badges: [
      { text: 'Dossier localisé — Vente 17/05', delay: 6000 },
      { text: 'SMS récapitulatif envoyé', delay: 6500 },
      { text: "Clerc notifié de l'appel", delay: 7000 },
    ],
  },
  scenario2: {
    label: 'Client · Succession',
    callerName: 'Paul Renard',
    callerPhone: '06 56 78 90 12',
    messages: [
      {
        role: 'client',
        text: 'Mon père est décédé il y a 3 jours, je ne sais pas quoi faire',
        delay: 0,
      },
      {
        role: 'assistant',
        text: 'Bonjour Monsieur Renard, je suis sincèrement désolée pour votre perte. Je peux vous mettre en relation avec notre clerc spécialisé en successions.',
        delay: 1500,
      },
      {
        role: 'client',
        text: "Oui s'il vous plaît, c'est urgent",
        delay: 3000,
      },
      {
        role: 'assistant',
        text: 'Je prends rendez-vous pour vous avec Sophie, notre clerc successions, dès demain matin à 9h. Vous recevrez une confirmation par SMS.',
        delay: 4500,
      },
    ],
    badges: [
      { text: 'RDV succession — Demain 9h00', delay: 6000 },
      { text: 'Sophie (Successions) notifiée', delay: 6500 },
      { text: 'SMS de confirmation envoyé', delay: 7000 },
    ],
  },
  painTitle: 'Vos clients rappellent. Et finissent par aller ailleurs.',
  painStats: [
    {
      value: '8x',
      label: 'rappels en moyenne',
      description:
        'Un client rappelle 8 fois avant d\u2019obtenir une réponse sur son dossier. Source : Notaires de France',
    },
    {
      value: '40%',
      label: 'du temps en standard',
      description:
        'Vos clercs passent 40% de leur temps à répondre au téléphone.',
    },
    {
      value: '1 client sur 3',
      label: 'part sans rappeler',
      description:
        'Si la ligne est occupée, il appelle une autre étude.',
    },
  ],
  features: [
    {
      icon: Shield,
      title: 'Discrétion garantie',
      description:
        'RGPD natif, hébergé en France, données jamais partagées',
    },
    {
      icon: Calendar,
      title: 'RDV avec le bon clerc',
      description:
        'Vente, succession, donation — chaque demande vers le bon interlocuteur',
    },
    {
      icon: FileSearch,
      title: 'Informe sur les dossiers',
      description:
        'Statut de vente, documents à fournir, délais — depuis votre KB',
    },
    {
      icon: Phone,
      title: 'Disponible 24h/24',
      description: 'Même le dimanche, même en plein acte',
    },
    {
      icon: MessageSquare,
      title: 'SMS de confirmation',
      description: 'Chaque RDV confirmé automatiquement',
    },
    {
      icon: Lock,
      title: 'Données souveraines EU',
      description: 'Hébergé en France, conforme RGPD',
    },
  ],
  ctaTitle: 'Prêt à ne plus rater un seul appel ?',
  ctaSubtitle:
    '2 places Fondateur disponibles pour les études notariales. 2 mois gratuits + -20% à vie.',
  ctaButton: 'Devenir Membre Fondateur',
  ctaNote: 'Configuration en 3 minutes. Sans engagement.',
};

export default function NotairePage() {
  return <SectorPageLayout data={DATA} />;
}

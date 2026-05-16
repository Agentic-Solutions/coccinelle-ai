import type { Metadata } from 'next';
import {
  Scale,
  FileSearch,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Lock,
} from 'lucide-react';
import SectorPageLayout, {
  type SectorPageData,
} from '@/components/sector/SectorPageLayout';

export const metadata: Metadata = {
  title: 'Avocat : votre cabinet joignable 24h/24 | Coccinelle.ai',
  description:
    'Coccinelle répond à vos clients, informe sur les dossiers et gère les urgences juridiques — pendant que vous plaidez.',
  alternates: { canonical: 'https://coccinelle.ai/secteurs/avocat' },
  openGraph: {
    title: 'Avocat : votre cabinet joignable 24h/24 | Coccinelle.ai',
    description:
      'Coccinelle répond à vos clients, informe sur les dossiers et gère les urgences juridiques.',
    url: 'https://coccinelle.ai/secteurs/avocat',
    siteName: 'Coccinelle.ai',
    locale: 'fr_FR',
    type: 'website',
  },
};

const DATA: SectorPageData = {
  sectorKey: 'avocat',
  sectorName: 'Avocat',
  heroTitle:
    'Vos clients ont une audience demain. Ils ont besoin d\u2019être rassurés maintenant.',
  heroSubtitle:
    'Coccinelle informe vos clients sur leurs dossiers, prend les rendez-vous et gère les urgences juridiques 24h/24.',
  heroBadges: ['Suivi dossiers', 'Urgences juridiques', 'RDV consultation'],
  scenario1: {
    label: 'Client · Suivi dossier',
    callerName: 'Claire Moreau',
    callerPhone: '06 89 01 23 45',
    messages: [
      {
        role: 'client',
        text: "Bonjour, j'ai une audience dans 2 jours, où en est mon dossier ?",
        delay: 0,
      },
      {
        role: 'assistant',
        text: "Bonjour Madame Moreau. Votre dossier de divorce est prêt. Maître Dupont a déposé les conclusions le 10 mai. L'audience est confirmée au 16 mai à 14h.",
        delay: 1500,
      },
      {
        role: 'client',
        text: 'Je dois apporter des documents ?',
        delay: 3000,
      },
      {
        role: 'assistant',
        text: "Votre pièce d'identité et les 3 derniers bulletins de salaire. Je vous envoie un récapitulatif par SMS avec l'adresse du tribunal.",
        delay: 4500,
      },
    ],
    badges: [
      { text: 'Dossier consulté — Audience 16/05', delay: 6000 },
      { text: 'SMS récapitulatif envoyé', delay: 6500 },
      { text: "Maître Dupont notifié de l'appel", delay: 7000 },
    ],
  },
  scenario2: {
    label: 'Client · Urgence',
    callerName: 'Thomas Bernard',
    callerPhone: '06 90 12 34 56',
    messages: [
      {
        role: 'client',
        text: "J'ai reçu une convocation au commissariat pour demain matin, j'ai besoin d'un avocat urgent",
        delay: 0,
      },
      {
        role: 'assistant',
        text: "Bonjour Monsieur Bernard. Je comprends l'urgence. Je contacte immédiatement Maître Dupont disponible pour les gardes à vue.",
        delay: 1500,
      },
      {
        role: 'client',
        text: "Merci, c'est pour 9h",
        delay: 3000,
      },
      {
        role: 'assistant',
        text: 'Maître Dupont est disponible. Il vous rappelle dans les 15 minutes pour préparer votre audition.',
        delay: 4500,
      },
    ],
    badges: [
      { text: 'Urgence GAV détectée', delay: 6000 },
      { text: 'Maître Dupont alerté', delay: 6500 },
      { text: 'Rappel planifié — 15 min', delay: 7000 },
    ],
  },
  painTitle: 'Vos clients vous cherchent. Ils ne vous trouvent pas.',
  painStats: [
    {
      value: '6x',
      label: 'rappels avant réponse',
      description:
        'Un client rappelle en moyenne 6 fois avant d\u2019obtenir une réponse. Source : Barreau de Paris 2024',
    },
    {
      value: '45 min',
      label: 'perdues par audience',
      description:
        'À gérer les appels avant et après chaque audience.',
    },
    {
      value: '1 client sur 4',
      label: 'change de cabinet',
      description:
        'Si le cabinet est trop difficile à joindre.',
    },
  ],
  features: [
    {
      icon: Scale,
      title: 'Discrétion absolue',
      description:
        'RGPD natif, données hébergées en France',
    },
    {
      icon: FileSearch,
      title: 'Informe sur les dossiers',
      description:
        'Audiences, délais, documents — depuis votre KB cabinet',
    },
    {
      icon: AlertTriangle,
      title: 'Urgences juridiques',
      description:
        "GAV, convocations — détecte et alerte l'avocat de permanence",
    },
    {
      icon: Calendar,
      title: 'RDV de consultation',
      description:
        'Selon la spécialité et la disponibilité',
    },
    {
      icon: MessageSquare,
      title: 'Clients rassurés',
      description:
        'Un client informé ne rappelle pas toutes les heures',
    },
    {
      icon: Lock,
      title: 'Secret professionnel respecté',
      description:
        'Architecture souveraine EU, zéro données aux USA',
    },
  ],
  ctaTitle: 'Prêt à ne plus rater un seul appel ?',
  ctaSubtitle:
    "2 places Fondateur disponibles pour les cabinets d'avocats. 2 mois gratuits + -20% à vie.",
  ctaButton: 'Devenir Membre Fondateur',
  ctaNote: 'Configuration en 3 minutes. Sans engagement.',
};

export default function AvocatPage() {
  return <SectorPageLayout data={DATA} />;
}

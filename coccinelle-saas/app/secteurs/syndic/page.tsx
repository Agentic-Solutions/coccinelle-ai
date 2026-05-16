import type { Metadata } from 'next';
import {
  Phone,
  AlertTriangle,
  FileText,
  Users,
  MessageSquare,
  BarChart2,
} from 'lucide-react';
import SectorPageLayout, {
  type SectorPageData,
} from '@/components/sector/SectorPageLayout';

export const metadata: Metadata = {
  title: 'Syndic : votre standard ne sature plus | Coccinelle.ai',
  description:
    'Coccinelle répond à vos locataires et propriétaires 24h/24. Sinistres, charges, AG — chaque demande est qualifiée et affectée au bon gestionnaire automatiquement.',
  keywords:
    'syndic IA, standard copropriété, assistant vocal syndic, gestion sinistre automatique',
  alternates: { canonical: 'https://coccinelle.ai/secteurs/syndic' },
  openGraph: {
    title: 'Syndic : votre standard ne sature plus | Coccinelle.ai',
    description:
      'Coccinelle répond à vos locataires et propriétaires 24h/24. Sinistres, charges, AG — chaque demande qualifiée automatiquement.',
    url: 'https://coccinelle.ai/secteurs/syndic',
    siteName: 'Coccinelle.ai',
    locale: 'fr_FR',
    type: 'website',
  },
};

const DATA: SectorPageData = {
  sectorKey: 'syndic',
  sectorName: 'Syndic',
  heroTitle:
    'Vos copropriétaires ont une urgence à 22h. Votre cabinet leur répond immédiatement.',
  heroSubtitle:
    'Coccinelle répond à vos locataires et propriétaires 24h/24. Chaque demande qualifiée et affectée au bon gestionnaire.',
  heroBadges: ['Locataires', 'Propriétaires', 'Urgences 24h/24'],
  scenario1: {
    label: 'Locataire · Sinistre',
    callerName: 'Jean-Pierre Lambert',
    callerPhone: '06 23 45 67 89',
    messages: [
      {
        role: 'client',
        text: "Bonjour, j'ai une fuite d'eau dans ma salle de bain depuis ce matin",
        delay: 0,
      },
      {
        role: 'assistant',
        text: "Bonjour Jean-Pierre. Je comprends l'urgence. Votre appartement est bien au 12 rue des Lilas, appartement 3B ?",
        delay: 1500,
      },
      {
        role: 'client',
        text: "Oui c'est urgent, ça coule dans le plafond du voisin",
        delay: 3000,
      },
      {
        role: 'assistant',
        text: "Je crée immédiatement un ticket sinistre prioritaire et j'alerte Marie, votre responsable sinistres. Elle vous rappelle dans l'heure.",
        delay: 4500,
      },
    ],
    badges: [
      { text: 'Ticket sinistre créé — Priorité haute', delay: 6000 },
      { text: 'Marie (Sinistres) notifiée par SMS', delay: 6500 },
      { text: 'Voisin du dessous prévenu', delay: 7000 },
    ],
  },
  scenario2: {
    label: 'Propriétaire · Contestation',
    callerName: 'Robert Martin',
    callerPhone: '06 34 56 78 90',
    messages: [
      {
        role: 'client',
        text: "J'ai reçu une facture de 340\u20ac pour le ravalement, je ne suis pas d'accord",
        delay: 0,
      },
      {
        role: 'assistant',
        text: 'Bonjour Monsieur Martin. La facture FAC-2026-0892 correspond aux travaux votés en AG du 15 mars. Votre quote-part est calculée sur vos tantièmes.',
        delay: 1500,
      },
      {
        role: 'client',
        text: "Je maintiens ma contestation, je veux parler à quelqu'un",
        delay: 3000,
      },
      {
        role: 'assistant',
        text: 'Je comprends. Je transmets votre contestation à Pierre, notre gestionnaire comptable, avec tous les éléments du dossier.',
        delay: 4500,
      },
    ],
    badges: [
      { text: 'Dossier FAC-2026-0892 identifié', delay: 6000 },
      { text: 'Pierre (Comptable) alerté', delay: 6500 },
      { text: 'Email récapitulatif envoyé', delay: 7000 },
    ],
  },
  painTitle: 'Votre standard déborde. Vos copropriétaires le savent.',
  painStats: [
    {
      value: '47%',
      label: 'des appels concernent des urgences',
      description:
        'Sinistres, pannes, dégâts — impossibles à ignorer. Source : UNIS 2025',
    },
    {
      value: '12 min',
      label: "d'attente moyenne",
      description:
        'Avant de raccrocher frustré. Et rappeler encore et encore.',
    },
    {
      value: '1 ETP',
      label: 'pour répondre au téléphone',
      description:
        "Un gestionnaire passe 30% de son temps à décrocher. C'est fini.",
    },
  ],
  features: [
    {
      icon: Phone,
      title: 'Répond 24h/24',
      description:
        'Locataires et propriétaires toujours pris en charge',
    },
    {
      icon: AlertTriangle,
      title: 'Sinistres en priorité',
      description:
        "Détecte l'urgence et alerte le bon gestionnaire",
    },
    {
      icon: FileText,
      title: 'Qualifie chaque demande',
      description:
        'Sinistre, charges, AG, travaux — tout est catégorisé',
    },
    {
      icon: Users,
      title: 'Affecte au bon gestionnaire',
      description:
        'Marie pour les sinistres, Pierre pour la compta...',
    },
    {
      icon: MessageSquare,
      title: 'SMS de suivi automatique',
      description:
        'Locataire et propriétaire informés à chaque étape',
    },
    {
      icon: BarChart2,
      title: 'Tableau de bord en temps réel',
      description: 'Toutes les demandes visibles et traçables',
    },
  ],
  ctaTitle: 'Prêt à désengorger votre standard ?',
  ctaSubtitle:
    '2 places Fondateur disponibles pour les syndics. 2 mois gratuits + -20% à vie.',
  ctaButton: 'Devenir Membre Fondateur',
  ctaNote: 'Configuration en 3 minutes. Sans engagement.',
};

export default function SyndicPage() {
  return <SectorPageLayout data={DATA} />;
}

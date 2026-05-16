import type { Metadata } from 'next';
import {
  AlertTriangle,
  Calendar,
  FileText,
  Shield,
  Users,
  Phone,
} from 'lucide-react';
import SectorPageLayout, {
  type SectorPageData,
} from '@/components/sector/SectorPageLayout';

export const metadata: Metadata = {
  title: 'Médecin : vos patients toujours pris en charge | Coccinelle.ai',
  description:
    'Coccinelle répond à vos patients 24h/24. Urgences orientées, RDV pris, ordonnances gérées — votre secrétaire se concentre sur l\u2019essentiel.',
  alternates: { canonical: 'https://coccinelle.ai/secteurs/medecin' },
  openGraph: {
    title: 'Médecin : vos patients toujours pris en charge | Coccinelle.ai',
    description:
      'Coccinelle répond à vos patients 24h/24. Urgences orientées, RDV pris, ordonnances gérées.',
    url: 'https://coccinelle.ai/secteurs/medecin',
    siteName: 'Coccinelle.ai',
    locale: 'fr_FR',
    type: 'website',
  },
};

const DATA: SectorPageData = {
  sectorKey: 'medecin',
  sectorName: 'Médecin',
  heroTitle:
    'Votre patient ne peut pas attendre demain matin. Votre cabinet lui répond 24h/24.',
  heroSubtitle:
    'Coccinelle qualifie les urgences, prend les rendez-vous et désencombre votre secrétaire — pendant que vous consultez.',
  heroBadges: ['Urgences', 'Rendez-vous', 'Renouvellements'],
  scenario1: {
    label: 'Patient · Urgence',
    callerName: 'Sophie Laurent',
    callerPhone: '06 67 89 01 23',
    messages: [
      {
        role: 'client',
        text: "Bonjour, j'ai une douleur thoracique depuis 1 heure, c'est de plus en plus fort",
        delay: 0,
      },
      {
        role: 'assistant',
        text: 'Bonjour Madame Laurent. Une douleur thoracique intense nécessite une attention immédiate. Appelez le 15 ou le 112 maintenant. Je préviens le cabinet en parallèle.',
        delay: 1500,
      },
      {
        role: 'client',
        text: "D'accord merci",
        delay: 3000,
      },
      {
        role: 'assistant',
        text: 'Les secours ont été alertés. Le Dr Martin est aussi prévenu. Restez en ligne si possible.',
        delay: 4500,
      },
    ],
    badges: [
      { text: 'SAMU 15 orienté', delay: 6000 },
      { text: 'Dr Martin alerté en urgence', delay: 6500 },
      { text: 'Fiche patient créée', delay: 7000 },
    ],
  },
  scenario2: {
    label: 'Patient · Renouvellement',
    callerName: 'Marc Thomas',
    callerPhone: '06 78 90 12 34',
    messages: [
      {
        role: 'client',
        text: "Bonjour je voudrais renouveler mon ordonnance pour l'hypertension",
        delay: 0,
      },
      {
        role: 'assistant',
        text: 'Bonjour Monsieur Thomas. Je vérifie votre dernière consultation. Votre ordonnance date du 15 février, le renouvellement est possible.',
        delay: 1500,
      },
      {
        role: 'client',
        text: 'Super, je peux avoir un rendez-vous rapidement ?',
        delay: 3000,
      },
      {
        role: 'assistant',
        text: 'Le Dr Martin est disponible jeudi à 11h ou vendredi à 9h30. Quelle date vous convient ?',
        delay: 4500,
      },
    ],
    badges: [
      { text: 'RDV jeudi 11h confirmé', delay: 6000 },
      { text: 'SMS de confirmation envoyé', delay: 6500 },
      { text: 'Dossier patient mis à jour', delay: 7000 },
    ],
  },
  painTitle: 'Vos patients n\u2019arrivent plus à vous joindre.',
  painStats: [
    {
      value: '23 appels',
      label: 'par jour en moyenne',
      description:
        'Un cabinet généraliste reçoit 23 appels/jour. Votre secrétaire ne peut pas tout gérer.',
    },
    {
      value: '1 patient sur 4',
      label: 'va aux urgences inutilement',
      description:
        'Faute de pouvoir joindre le cabinet. Source : DREES 2024',
    },
    {
      value: '2h/jour',
      label: 'perdues au téléphone',
      description:
        'Votre secrétaire mérite mieux que décrocher en boucle.',
    },
  ],
  features: [
    {
      icon: AlertTriangle,
      title: 'Triage des urgences',
      description:
        'Coccinelle détecte les symptômes urgents et oriente vers le 15',
    },
    {
      icon: Calendar,
      title: 'RDV intelligent',
      description:
        'Selon la disponibilité et le type de consultation',
    },
    {
      icon: FileText,
      title: 'Renouvellements gérés',
      description:
        'Ordonnances, arrêts de travail — Coccinelle vérifie et prend RDV',
    },
    {
      icon: Shield,
      title: 'Données médicales protégées',
      description: 'RGPD natif, hébergé en France',
    },
    {
      icon: Users,
      title: 'Secrétaire désencombrée',
      description:
        'Elle se concentre sur les patients présents au cabinet',
    },
    {
      icon: Phone,
      title: 'Disponible entre les consultations',
      description: 'Jamais de sonnerie sans réponse',
    },
  ],
  ctaTitle: 'Prêt à soulager votre standard ?',
  ctaSubtitle:
    '2 places Fondateur disponibles pour les médecins généralistes. 2 mois gratuits + -20% à vie.',
  ctaButton: 'Devenir Membre Fondateur',
  ctaNote: 'Configuration en 3 minutes. Sans engagement.',
};

export default function MedecinPage() {
  return <SectorPageLayout data={DATA} />;
}

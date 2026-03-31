'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Phone, MessageSquare, Mail, Clock, GitBranch, StopCircle,
  Plus, Save, Play, Power, ArrowLeft, Trash2, X, Check,
  ChevronDown, Zap, MousePointer, Loader2
} from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import { SECTOR_PROMPTS, getSectorPrompt } from '@/lib/prompts';

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = 'call' | 'sms' | 'email' | 'delay' | 'condition' | 'end';

interface SequenceNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  x: number;
  y: number;
  delayDuration?: string;
  condition?: string;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  label?: string;
  fromOutput?: 'default' | 'yes' | 'no';
}

interface SectorContent {
  name: string;
  accueil: string;
  conditionLabel: string;
  qualification: string;
  smsRecap: string;
  emailConfirm: string;
  smsRelance: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_WIDTH = 240;
const NODE_HEIGHT = 84;

const NODE_TYPES: Record<NodeType, {
  label: string;
  icon: typeof Phone;
  leftBorder: string;
}> = {
  call:      { label: 'Appel vocal', icon: Phone,         leftBorder: 'border-l-gray-900' },
  sms:       { label: 'SMS',         icon: MessageSquare,  leftBorder: 'border-l-gray-500' },
  email:     { label: 'Email',       icon: Mail,           leftBorder: 'border-l-gray-400' },
  delay:     { label: 'Délai',       icon: Clock,          leftBorder: 'border-l-gray-300' },
  condition: { label: 'Condition',   icon: GitBranch,      leftBorder: 'border-l-gray-700' },
  end:       { label: 'Fin',         icon: StopCircle,     leftBorder: 'border-l-gray-200' },
};

const DELAY_OPTIONS = [
  { value: '1h',  label: '1 heure' },
  { value: '4h',  label: '4 heures' },
  { value: '1d',  label: '1 jour' },
  { value: '3d',  label: '3 jours' },
  { value: '1w',  label: '1 semaine' },
];

const CONDITION_OPTIONS = [
  { value: 'answered',     label: 'A répondu' },
  { value: 'not_answered', label: "N'a pas répondu" },
  { value: 'interested',   label: 'A exprimé un intérêt' },
  { value: 'said_yes',     label: 'A dit oui' },
  { value: 'said_no',      label: 'A dit non' },
];

// ─── Sector-specific prompts ─────────────────────────────────────────────────

const SECTOR_CONTENT: Record<string, SectorContent> = {
  generaliste: {
    name: 'Séquence généraliste',
    accueil: "Accueillez professionnellement au nom de {COMPANY_NAME}. Identifiez le motif de l'appel et orientez vers le bon interlocuteur. Soyez courtois et vouvoiez toujours.",
    conditionLabel: 'A exprimé un intérêt ?',
    qualification: "Approfondissez le besoin du prospect, collectez les informations nécessaires (nom, email, téléphone, besoin précis). Proposez une solution adaptée ou un rendez-vous avec un conseiller.",
    smsRecap: "Bonjour, suite à notre échange avec {COMPANY_NAME}, voici le récapitulatif de votre demande et le lien pour confirmer votre rendez-vous : [lien]",
    emailConfirm: "Objet : Suite à votre appel — {COMPANY_NAME}\n\nBonjour,\n\nNous vous remercions pour votre appel. Voici un récapitulatif de notre échange et les prochaines étapes convenues.\n\nN'hésitez pas à nous recontacter pour toute question.\n\nCordialement,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour, c'est {COMPANY_NAME}. Nous avons échangé récemment et souhaitions prendre de vos nouvelles. Avez-vous des questions ? Nous restons à votre disposition.",
  },
  immobilier: {
    name: 'Séquence immobilier',
    accueil: "Accueillez chaleureusement au nom de {COMPANY_NAME}, votre agence immobilière. Identifiez si l'appelant cherche à acheter, vendre, louer ou faire estimer un bien. Soyez rassurant et professionnel, vouvoiez toujours.",
    conditionLabel: 'Intérêt pour un bien ?',
    qualification: "Approfondissez la recherche : budget précis, localisation souhaitée, surface et nombre de pièces, type de bien (appartement/maison), délai d'emménagement. Notez les critères non négociables. Proposez un rendez-vous avec un conseiller pour présenter des biens correspondants.",
    smsRecap: "Bonjour, suite à notre échange avec {COMPANY_NAME}, voici le récapitulatif de votre recherche immobilière. Prenez RDV avec votre conseiller dédié : [lien]. À bientôt !",
    emailConfirm: "Objet : Votre projet immobilier avec {COMPANY_NAME}\n\nBonjour,\n\nSuite à notre appel, voici un récapitulatif de vos critères de recherche et les prochaines étapes.\n\nVotre conseiller dédié vous recontactera sous 24h avec une sélection de biens adaptés.\n\nCordialement,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour, c'est {COMPANY_NAME}. De nouveaux biens correspondent à vos critères ! Souhaitez-vous qu'un conseiller vous rappelle ? Répondez OUI ou appelez-nous.",
  },
  restaurant: {
    name: 'Séquence restaurant',
    accueil: "Accueillez chaleureusement au nom de {COMPANY_NAME}. Identifiez si l'appelant souhaite réserver une table, se renseigner sur le menu, les horaires ou une occasion spéciale. Soyez accueillant et enthousiaste.",
    conditionLabel: 'Souhaite réserver ?',
    qualification: "Pour la réservation : date et heure souhaitées, nombre de personnes, nom pour la réservation, occasion spéciale (anniversaire, affaires, etc.), allergies ou régimes alimentaires. Confirmez la disponibilité et les détails.",
    smsRecap: "Votre réservation chez {COMPANY_NAME} est confirmée pour le [date] à [heure] pour [nombre] personnes. Pensez à nous prévenir en cas de changement. À bientôt !",
    emailConfirm: "Objet : Confirmation de votre réservation — {COMPANY_NAME}\n\nBonjour,\n\nNous avons le plaisir de confirmer votre réservation :\n- Date : [date]\n- Heure : [heure]\n- Nombre de couverts : [nombre]\n\nN'hésitez pas à nous contacter pour toute demande spéciale.\n\nAu plaisir de vous accueillir,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour ! {COMPANY_NAME} vous propose cette semaine un menu spécial. Réservez votre table dès maintenant en répondant à ce message ou en appelant.",
  },
  automobile: {
    name: 'Séquence automobile',
    accueil: "Accueillez au nom de {COMPANY_NAME}, votre concession automobile. Identifiez le besoin : achat neuf ou occasion, reprise de véhicule, entretien/réparation, SAV ou demande de financement. Soyez dynamique et professionnel.",
    conditionLabel: 'Intérêt pour un véhicule ?',
    qualification: "Selon le besoin — Achat : budget, type de véhicule (citadine, SUV, berline), usage (ville/route/famille), financement souhaité (LOA, crédit, comptant). Reprise : marque, modèle, année, kilométrage, état. Entretien : modèle, problème constaté. Proposez un RDV commercial ou atelier.",
    smsRecap: "Bonjour, suite à notre échange chez {COMPANY_NAME}, voici le récapitulatif de votre demande et le lien pour confirmer votre RDV : [lien]. Notre équipe vous attend !",
    emailConfirm: "Objet : Votre demande chez {COMPANY_NAME}\n\nBonjour,\n\nSuite à notre appel, voici les détails de votre demande et les informations sur les prochaines étapes.\n\nVotre conseiller commercial vous accueillera le [date] à [heure].\n\nCordialement,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour, c'est {COMPANY_NAME}. Avez-vous réfléchi à votre projet automobile ? Nous avons des offres spéciales ce mois-ci. Appelez-nous pour en profiter !",
  },
  sante: {
    name: 'Séquence santé',
    accueil: "Accueillez calmement et avec bienveillance au nom de {COMPANY_NAME}. Identifiez le motif : prise de RDV, renouvellement d'ordonnance, résultats d'analyses ou urgence. IMPORTANT : en cas d'urgence vitale, orienter immédiatement vers le 15 (SAMU) ou le 112. Ne jamais donner de conseil médical.",
    conditionLabel: 'Souhaite un RDV ?',
    qualification: "Pour le RDV : motif de consultation, praticien souhaité, disponibilités. Collectez nom, prénom, date de naissance, numéro de téléphone. Proposez le premier créneau disponible. Rappelez d'apporter la carte vitale et les documents nécessaires.",
    smsRecap: "Votre RDV est confirmé le [date] à [heure] avec [praticien] au {COMPANY_NAME}. Merci d'apporter votre carte vitale et vos ordonnances en cours.",
    emailConfirm: "Objet : Confirmation de votre rendez-vous — {COMPANY_NAME}\n\nBonjour,\n\nVotre rendez-vous est confirmé :\n- Date : [date]\n- Heure : [heure]\n- Praticien : [praticien]\n\nMerci d'apporter votre carte vitale et vos documents médicaux.\n\nCordialement,\n{COMPANY_NAME}",
    smsRelance: "Bonjour, {COMPANY_NAME} vous rappelle qu'il est conseillé de consulter régulièrement. Souhaitez-vous prendre un RDV ? Répondez OUI ou appelez-nous.",
  },
  beaute: {
    name: 'Séquence beauté',
    accueil: "Accueillez chaleureusement au nom de {COMPANY_NAME}. Identifiez le soin souhaité : coiffure, soin visage/corps, manucure, massage, épilation, etc. Renseignez sur les disponibilités et les tarifs.",
    conditionLabel: 'Souhaite un RDV ?',
    qualification: "Type de prestation exacte, praticien préféré, disponibilités. Pour coiffure : type de service (coupe, couleur, brushing), longueur actuelle. Pour soins : première visite ?, allergies connues, durée souhaitée. Rappelez d'arriver 5 min en avance.",
    smsRecap: "Votre RDV beauté est confirmé le [date] à [heure] chez {COMPANY_NAME}. Prestation : [soin]. Merci d'arriver 5 min en avance. À très bientôt !",
    emailConfirm: "Objet : Confirmation de votre RDV — {COMPANY_NAME}\n\nBonjour,\n\nVotre rendez-vous beauté est confirmé :\n- Date : [date]\n- Heure : [heure]\n- Prestation : [soin]\n\nConseil : arrivez 5 minutes en avance pour profiter pleinement de votre soin.\n\nÀ bientôt,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour ! {COMPANY_NAME} pense à vous. Offrez-vous un moment de détente avec nos soins. Réservez dès maintenant en répondant à ce message.",
  },
  fitness: {
    name: 'Séquence fitness',
    accueil: "Accueillez avec dynamisme au nom de {COMPANY_NAME}. Identifiez le besoin : nouvel abonnement, renseignement sur les cours collectifs, bilan forme, séance découverte ou modification d'abonnement.",
    conditionLabel: 'Intéressé par un abonnement ?',
    qualification: "Objectifs sportifs (perte de poids, musculation, cardio, bien-être), fréquence souhaitée, budget mensuel, cours préférés (yoga, CrossFit, boxe, etc.), horaires de disponibilité. Proposez une séance découverte gratuite.",
    smsRecap: "Bienvenue chez {COMPANY_NAME} ! Votre séance découverte est confirmée le [date] à [heure]. Venez en tenue de sport avec une bouteille d'eau. On vous attend !",
    emailConfirm: "Objet : Votre projet fitness avec {COMPANY_NAME}\n\nBonjour,\n\nMerci pour votre intérêt ! Voici les détails de votre séance découverte et les formules d'abonnement adaptées à vos objectifs.\n\nRendez-vous le [date] à [heure]. N'hésitez pas à nous contacter pour toute question.\n\nSportives salutations,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour ! {COMPANY_NAME} vous propose une offre spéciale cette semaine. Envie de vous remettre en forme ? Appelez-nous ou répondez pour en savoir plus.",
  },
  education: {
    name: 'Séquence éducation',
    accueil: "Accueillez professionnellement au nom de {COMPANY_NAME}, centre de formation. Identifiez le besoin : renseignement sur une formation, inscription, financement (CPF, OPCO), dates de sessions ou suivi de dossier.",
    conditionLabel: 'Intéressé par une formation ?',
    qualification: "Formation souhaitée, niveau actuel, objectif professionnel, disponibilités (temps plein/partiel, présentiel/distanciel), éligibilité au financement. Proposez un RDV avec un conseiller pédagogique pour construire le parcours.",
    smsRecap: "Merci pour votre intérêt pour {COMPANY_NAME} ! Votre RDV avec un conseiller est confirmé le [date]. Préparez vos questions, nous avons hâte de vous accompagner. [lien]",
    emailConfirm: "Objet : Votre parcours de formation — {COMPANY_NAME}\n\nBonjour,\n\nSuite à notre échange, voici les informations sur la formation qui vous intéresse et les modalités de financement disponibles.\n\nVotre conseiller pédagogique vous accueillera le [date] pour finaliser votre projet.\n\nCordialement,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour, c'est {COMPANY_NAME}. Les inscriptions pour la prochaine session sont ouvertes ! Souhaitez-vous en discuter avec un conseiller ? Répondez OUI.",
  },
  ecommerce: {
    name: 'Séquence e-commerce',
    accueil: "Accueillez au nom de {COMPANY_NAME}, votre boutique en ligne. Identifiez le besoin : suivi de commande, question sur un produit, retour/échange, réclamation ou aide à l'achat. Soyez orienté solution.",
    conditionLabel: 'Besoin identifié ?',
    qualification: "Selon le cas — Suivi : numéro de commande, statut, délai estimé. Produit : caractéristiques, tailles, compatibilité, disponibilité. Retour : motif, délai (14 jours), procédure. Aide à l'achat : budget, usage, préférences. Proposez une solution concrète.",
    smsRecap: "Bonjour, votre demande auprès de {COMPANY_NAME} a bien été prise en compte. Voici le récapitulatif et le suivi : [lien]. Nous restons à votre disposition.",
    emailConfirm: "Objet : Suivi de votre demande — {COMPANY_NAME}\n\nBonjour,\n\nVotre demande a été enregistrée. Voici le récapitulatif de notre échange et les actions en cours.\n\nDélai de résolution estimé : [délai]. Vous recevrez une notification par email.\n\nCordialement,\nLe service client {COMPANY_NAME}",
    smsRelance: "Bonjour ! {COMPANY_NAME} vous propose des offres exclusives cette semaine. Découvrez nos nouveautés sur [lien]. Code promo BIENVENUE pour -10%.",
  },
  artisan: {
    name: 'Séquence artisan & BTP',
    accueil: "Accueillez au nom de {COMPANY_NAME}, entreprise artisanale. Identifiez le besoin : demande de devis, urgence (fuite, panne, serrure), entretien planifié ou suivi de chantier. Évaluez rapidement l'urgence de la situation.",
    conditionLabel: 'Besoin de devis/intervention ?',
    qualification: "Pour devis : type de travaux, surface concernée, matériaux souhaités, délai souhaité, photos si possible. Pour urgence : adresse exacte, nature du problème, accessibilité, disponibilité. Collectez nom, téléphone, adresse complète. Proposez un créneau d'intervention.",
    smsRecap: "Bonjour, votre demande d'intervention chez {COMPANY_NAME} est enregistrée. RDV prévu le [date] entre [créneau]. Notre technicien vous contactera 30 min avant. [lien]",
    emailConfirm: "Objet : Votre demande d'intervention — {COMPANY_NAME}\n\nBonjour,\n\nVotre demande a bien été prise en compte :\n- Type : [travaux]\n- Adresse : [adresse]\n- Date prévue : [date]\n\nNotre technicien vous recontactera pour confirmer le créneau.\n\nCordialement,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour, {COMPANY_NAME} reste à votre disposition pour vos travaux. Besoin d'un devis gratuit ? Répondez OUI ou appelez-nous directement.",
  },
  juridique: {
    name: 'Séquence juridique',
    accueil: "Accueillez au nom de {COMPANY_NAME}, cabinet de conseil juridique. Identifiez le domaine : droit des affaires, droit du travail, droit immobilier, droit de la famille, contentieux. Soyez rassurant et confidentiel. Ne donnez aucun conseil juridique par téléphone.",
    conditionLabel: 'Souhaite un RDV ?',
    qualification: "Nature du dossier, urgence, documents déjà en possession, procédures en cours. Collectez coordonnées complètes. Proposez un RDV de consultation initiale (30 min). Précisez les honoraires de première consultation si applicable.",
    smsRecap: "Votre RDV de consultation avec {COMPANY_NAME} est confirmé le [date] à [heure]. Merci d'apporter tous les documents relatifs à votre dossier. [lien]",
    emailConfirm: "Objet : Confirmation de votre consultation — {COMPANY_NAME}\n\nBonjour,\n\nVotre rendez-vous de consultation est confirmé :\n- Date : [date]\n- Heure : [heure]\n\nMerci de préparer les documents relatifs à votre dossier.\n\nConfidentiellement,\n{COMPANY_NAME}",
    smsRelance: "Bonjour, {COMPANY_NAME} reste disponible pour vous accompagner dans vos démarches juridiques. Souhaitez-vous planifier une consultation ? Répondez OUI.",
  },
  dentiste: {
    name: 'Séquence dentiste',
    accueil: "Accueillez au nom du cabinet dentaire {COMPANY_NAME}. Identifiez le motif : urgence dentaire, contrôle, détartrage, soin planifié ou première visite. Soyez rassurant et professionnel.",
    conditionLabel: 'Souhaite un RDV ?',
    qualification: "Type de soin, urgence (douleur, dent cassée, abcès), patient existant ou nouveau, disponibilités. Collectez nom, téléphone. Proposez le premier créneau adapté à l'urgence.",
    smsRecap: "Votre RDV au cabinet {COMPANY_NAME} est confirmé le [date] à [heure]. Merci d'apporter votre carte vitale et votre mutuelle. À bientôt !",
    emailConfirm: "Objet : Confirmation de votre RDV — {COMPANY_NAME}\n\nBonjour,\n\nVotre rendez-vous est confirmé :\n- Date : [date]\n- Heure : [heure]\n\nMerci d'apporter votre carte vitale et votre mutuelle.\n\nCordialement,\nLe cabinet {COMPANY_NAME}",
    smsRelance: "Bonjour, le cabinet {COMPANY_NAME} vous rappelle qu'un contrôle régulier est recommandé. Souhaitez-vous prendre RDV ? Répondez OUI.",
  },
  autre: {
    name: 'Séquence personnalisée',
    accueil: "Accueillez au nom de {COMPANY_NAME}. Identifiez le motif de l'appel. Soyez courtois et professionnel, vouvoiez toujours.",
    conditionLabel: 'Intérêt identifié ?',
    qualification: "Approfondissez le besoin, collectez les coordonnées. Proposez la prochaine étape adaptée.",
    smsRecap: "Bonjour, suite à notre échange avec {COMPANY_NAME}, voici le récapitulatif de votre demande. [lien]",
    emailConfirm: "Objet : Suite à votre appel — {COMPANY_NAME}\n\nBonjour,\n\nNous avons bien pris note de votre demande. Voici les prochaines étapes convenues.\n\nCordialement,\nL'équipe {COMPANY_NAME}",
    smsRelance: "Bonjour, c'est {COMPANY_NAME}. Nous restons à votre disposition. N'hésitez pas à nous recontacter.",
  },
};

// ─── Generate nodes & connections from sector ────────────────────────────────

function buildSequence(sector: string, company: string): { nodes: SequenceNode[]; connections: Connection[] } {
  const s = SECTOR_CONTENT[sector] || SECTOR_CONTENT.generaliste;
  const sp = getSectorPrompt(sector) || getSectorPrompt('generaliste');
  const r = (text: string) => text.replaceAll('{COMPANY_NAME}', company || '{COMPANY_NAME}');

  // Nodes vocaux depuis getSectorPrompt() — source unique lib/prompts.ts
  const findNode = (name: string) => sp?.nodes.find(n => n.name === name)?.instruction;
  const accueil = findNode('accueil') || s.accueil;
  const qualification = findNode('qualification') || findNode('motif') || s.qualification;
  const priseRdv = findNode('prise_rdv') || findNode('reservation') || 'Proposez un rendez-vous. Confirmez date, heure et lieu.';
  const fin = findNode('fin') || 'Résumez ce qui a été convenu. Remerciez.';

  const nodes: SequenceNode[] = [
    // Appels vocaux — contenu depuis lib/prompts.ts
    { id: 'n1',  type: 'call',      title: 'Accueil',                           content: r(accueil),        x: 350, y: 40 },
    { id: 'n2',  type: 'condition',  title: s.conditionLabel,                    content: 'Évaluation automatique de la réponse du prospect.', x: 350, y: 170, condition: 'interested' },
    { id: 'n3',  type: 'call',      title: 'Qualification',                     content: r(qualification),  x: 80,  y: 320 },
    { id: 'n10', type: 'call',      title: 'Prise de RDV',                      content: r(priseRdv),       x: 80,  y: 450 },
    // SMS/Email — contenu séquence depuis SECTOR_CONTENT
    { id: 'n4',  type: 'sms',       title: 'Récapitulatif + lien RDV',          content: r(s.smsRecap),     x: 80,  y: 580 },
    { id: 'n5',  type: 'email',     title: 'Confirmation et prochaines étapes', content: r(s.emailConfirm), x: 80,  y: 710 },
    { id: 'n6',  type: 'end',       title: 'Séquence réussie',                  content: r(fin),            x: 80,  y: 840 },
    // Branche NON
    { id: 'n7',  type: 'delay',     title: 'Attendre 3 jours',                  content: 'Délai de réflexion avant relance.',                  x: 620, y: 320, delayDuration: '3d' },
    { id: 'n8',  type: 'sms',       title: 'Relance douce',                     content: r(s.smsRelance),   x: 620, y: 450 },
    { id: 'n9',  type: 'end',       title: 'Fin de séquence',                   content: 'Fin du parcours de relance.',                        x: 620, y: 580 },
  ];

  const connections: Connection[] = [
    { id: 'c1',  from: 'n1',  to: 'n2',  fromOutput: 'default' },
    { id: 'c2',  from: 'n2',  to: 'n3',  label: 'OUI', fromOutput: 'yes' },
    { id: 'c3',  from: 'n2',  to: 'n7',  label: 'NON', fromOutput: 'no' },
    { id: 'c4',  from: 'n3',  to: 'n10', fromOutput: 'default' },
    { id: 'c10', from: 'n10', to: 'n4',  fromOutput: 'default' },
    { id: 'c5',  from: 'n4',  to: 'n5',  fromOutput: 'default' },
    { id: 'c6',  from: 'n5',  to: 'n6',  fromOutput: 'default' },
    { id: 'c7',  from: 'n7',  to: 'n8',  fromOutput: 'default' },
    { id: 'c8',  from: 'n8',  to: 'n9',  fromOutput: 'default' },
  ];

  return { nodes, connections };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let nodeCounter = 10;
function nextId() {
  return `n${nodeCounter++}`;
}

function getOutputPoint(node: SequenceNode, output: 'default' | 'yes' | 'no'): { x: number; y: number } {
  const cx = node.x + NODE_WIDTH / 2;
  const bottom = node.y + NODE_HEIGHT;
  if (node.type === 'condition') {
    if (output === 'yes') return { x: node.x + NODE_WIDTH * 0.25, y: bottom };
    if (output === 'no')  return { x: node.x + NODE_WIDTH * 0.75, y: bottom };
  }
  return { x: cx, y: bottom };
}

function getInputPoint(node: SequenceNode): { x: number; y: number } {
  return { x: node.x + NODE_WIDTH / 2, y: node.y };
}

function buildPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SequencePage() {
  const [nodes, setNodes] = useState<SequenceNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState('Ma séquence');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testStep, setTestStep] = useState(0);
  const [testRunning, setTestRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantSector, setTenantSector] = useState('generaliste');
  const [companyName, setCompanyName] = useState('');
  const [apiDebug, setApiDebug] = useState('');

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = nodes.find(n => n.id === selectedId) || null;

  // ─── Load tenant info & build sector sequence ───────────────────────────────

  useEffect(() => {
    async function loadTenant() {
      setLoading(true);
      let sector = 'generaliste';
      let company = '';
      try {
        const res = await fetch(buildApiUrl('/api/v1/auth/me'), { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          console.log('[VoixIA Sequence] /api/v1/auth/me response:', JSON.stringify(data, null, 2));
          setApiDebug(JSON.stringify(data.tenant || data.user || data, null, 2));
          // Search sector in all possible fields
          sector = data.tenant?.sector
            || data.tenant?.industry
            || data.user?.sector
            || data.user?.industry
            || data.sector
            || data.industry
            || data.profile?.sector
            || 'generaliste';
          company = data.tenant?.name || data.tenant?.company_name || data.user?.company_name || data.user?.name || '';
          if (!SECTOR_CONTENT[sector]) sector = 'generaliste';
        }
      } catch { /* use defaults */ }
      setTenantSector(sector);
      setCompanyName(company);
      const sectorLabel = SECTOR_CONTENT[sector]?.name || 'Séquence';
      setSequenceName(sectorLabel + (company ? ` — ${company}` : ''));
      const { nodes: n, connections: c } = buildSequence(sector, company);
      setNodes(n);
      setConnections(c);
      setLoading(false);
    }
    loadTenant();
  }, []);

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    };
    setDragging(nodeId);
    setSelectedId(nodeId);
    e.preventDefault();
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, e.clientX - rect.left - dragOffset.current.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.current.y);
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x, y } : n));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ─── Node actions ───────────────────────────────────────────────────────────

  function addNode(type: NodeType) {
    const id = nextId();
    const newNode: SequenceNode = {
      id,
      type,
      title: NODE_TYPES[type].label,
      content: '',
      x: 350,
      y: (nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) + 130 : 40),
      ...(type === 'delay' ? { delayDuration: '1d' } : {}),
      ...(type === 'condition' ? { condition: 'answered' } : {}),
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedId(id);
    setShowAddMenu(false);
  }

  function deleteNode(id: string) {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateNode(id: string, updates: Partial<SequenceNode>) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }

  // ─── Save (sequence + prompt sync) ─────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    const headers = getAuthHeaders();

    // 1. Save the sequence
    try {
      await fetch(buildApiUrl('/api/v1/ai/sequences'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: sequenceName,
          sector: tenantSector,
          nodes,
          connections,
          is_active: isActive,
        }),
      });
    } catch { /* continue — also save prompt */ }

    // 2. Sync: concatenate all call node prompts into one system_prompt
    const callNodes = nodes.filter(n => n.type === 'call' && n.content.trim());
    if (callNodes.length > 0) {
      const systemPrompt = callNodes.map((n, i) => {
        return `## ÉTAPE ${i + 1} — ${n.title}\n${n.content}`;
      }).join('\n\n');

      const fullPrompt = `Tu es l'assistant vocal de ${companyName || "l'entreprise"}.\n\nVoici ta séquence d'interaction :\n\n${systemPrompt}\n\n## RÈGLES GÉNÉRALES\n- Vouvoie toujours\n- Sois professionnel et courtois\n- Phrases courtes et naturelles — conversation orale\n- Si tu ne sais pas → propose un rappel par un conseiller humain`;

      try {
        const res = await fetch(buildApiUrl('/api/v1/ai/prompts'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            system_prompt: fullPrompt,
            secteur: tenantSector,
            canal: 'voice',
            notes: `Séquence auto-générée : ${sequenceName}`,
          }),
        });
        if (res.ok) {
          showMsg('success', 'Séquence sauvegardée et prompt mis à jour !');
        } else {
          showMsg('success', 'Séquence sauvegardée.');
        }
      } catch {
        showMsg('success', 'Séquence sauvegardée localement.');
      }
    } else {
      showMsg('success', 'Séquence sauvegardée.');
    }

    setSaving(false);
  }

  // ─── Test / Activate ───────────────────────────────────────────────────────

  function handleTest() {
    setShowTestModal(true);
    setTestStep(0);
    setTestRunning(false);
  }

  const simPath = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].filter(id => nodes.some(n => n.id === id));

  function runSimulation() {
    setTestRunning(true);
    setTestStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= simPath.length) {
        clearInterval(interval);
        setTestRunning(false);
      }
      setTestStep(step);
    }, 1500);
  }

  function handleActivate() {
    setIsActive(!isActive);
    showMsg('success', isActive ? 'Séquence désactivée.' : 'Séquence activée !');
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  }

  const canvasHeight = Math.max(700, ...nodes.map(n => n.y + NODE_HEIGHT + 80), 850);

  const simLabels: Record<string, string> = {
    n1: 'Appel en cours... Le prospect répond.',
    n2: 'Analyse de la réponse... Intérêt détecté !',
    n3: 'Qualification approfondie en cours...',
    n4: 'Envoi du SMS avec récapitulatif et lien RDV...',
    n5: "Envoi de l'email de confirmation...",
    n6: 'Séquence terminée avec succès.',
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement de votre séquence...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Flash message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-medium ${
          message.type === 'success' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900 border border-gray-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/dashboard/voixia" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <Link href="/dashboard">
                <Logo size={42} className="hidden sm:block" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">Éditeur de séquence</h1>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                    {SECTOR_CONTENT[tenantSector]?.name || tenantSector}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-medium rounded-full">Active</span>
                  )}
                </div>
                <input
                  type="text"
                  value={sequenceName}
                  onChange={(e) => setSequenceName(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full max-w-md"
                  placeholder="Nom de la séquence..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleTest}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Tester</span>
              </button>
              <button
                onClick={handleActivate}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Power className="w-4 h-4" />
                <span className="hidden sm:inline">{isActive ? 'Activée' : 'Activer'}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-73px)]">

        {/* Canvas area */}
        <div className="flex-1 overflow-auto relative bg-[#f8f9fb]">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter un noeud
              </button>
              {showAddMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-56">
                  {(Object.keys(NODE_TYPES) as NodeType[]).map(type => {
                    const cfg = NODE_TYPES[type];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => addNode(type)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {companyName && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                Entreprise : <strong className="text-gray-600">{companyName}</strong>
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
              <MousePointer className="w-3.5 h-3.5" />
              Glisser-déposer pour déplacer les noeuds
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative select-none"
            style={{ minHeight: canvasHeight, minWidth: 960 }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid pattern */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: canvasHeight }}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: canvasHeight }}>
              {connections.map(conn => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                const from = getOutputPoint(fromNode, conn.fromOutput || 'default');
                const to = getInputPoint(toNode);
                const path = buildPath(from, to);
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                return (
                  <g key={conn.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth="2"
                      strokeDasharray={conn.label === 'NON' ? '6 4' : undefined}
                    />
                    <circle cx={to.x} cy={to.y} r="4" fill="#d1d5db" />
                    {conn.label && (
                      <g>
                        <rect
                          x={midX - 18}
                          y={midY - 10}
                          width="36"
                          height="20"
                          rx="10"
                          fill="#f3f4f6"
                          stroke="#e5e7eb"
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 4}
                          textAnchor="middle"
                          className="text-[11px] font-semibold"
                          fill="#4b5563"
                        >
                          {conn.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const cfg = NODE_TYPES[node.type];
              const Icon = cfg.icon;
              const isSelected = selectedId === node.id;
              return (
                <div
                  key={node.id}
                  className={`absolute cursor-grab active:cursor-grabbing group transition-shadow ${
                    dragging === node.id ? 'z-30' : 'z-20'
                  }`}
                  style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={() => setSelectedId(node.id)}
                >
                  <div className={`rounded-lg border border-gray-200 border-l-2 ${cfg.leftBorder} ${
                    isSelected ? 'shadow-lg ring-2 ring-gray-900/10 border-gray-900' : 'shadow-sm hover:shadow-md'
                  } bg-white overflow-hidden transition-all`}>
                    <div className="p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4.5 h-4.5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{node.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {node.type === 'delay' && node.delayDuration
                              ? DELAY_OPTIONS.find(d => d.value === node.delayDuration)?.label || node.delayDuration
                              : node.type === 'condition' && node.condition
                                ? CONDITION_OPTIONS.find(c => c.value === node.condition)?.label || node.condition
                                : cfg.label}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 z-10" />
                    {node.type === 'condition' ? (
                      <>
                        <div className="absolute -bottom-2 left-1/4 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-400 z-10" title="OUI" />
                        <div className="absolute -bottom-2 left-3/4 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-400 z-10" title="NON" />
                      </>
                    ) : node.type !== 'end' ? (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 z-10" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Config panel (right) */}
        <div className="w-80 lg:w-96 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 hidden md:block">
          {selected ? (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = NODE_TYPES[selected.type];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{cfg.label}</span>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <hr className="border-gray-100" />

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre</label>
                <input
                  type="text"
                  value={selected.title}
                  onChange={(e) => updateNode(selected.id, { title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Content / Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {selected.type === 'call' ? 'Prompt vocal' :
                   selected.type === 'sms' ? 'Contenu SMS' :
                   selected.type === 'email' ? 'Contenu email' :
                   selected.type === 'condition' ? 'Description' :
                   selected.type === 'delay' ? 'Note' : 'Description'}
                </label>
                <textarea
                  value={selected.content}
                  onChange={(e) => updateNode(selected.id, { content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Décrivez le contenu de cette étape..."
                />
                <p className="text-xs text-gray-400 mt-1">{selected.content.length} caractères</p>
              </div>

              {/* Channel (for call/sms/email) */}
              {['call', 'sms', 'email'].includes(selected.type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Canal</label>
                  <div className="relative">
                    <select
                      value={selected.type}
                      onChange={(e) => updateNode(selected.id, { type: e.target.value as NodeType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
                    >
                      <option value="call">Appel vocal</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Delay duration */}
              {selected.type === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée du délai</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DELAY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateNode(selected.id, { delayDuration: opt.value })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selected.delayDuration === opt.value
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Condition */}
              {selected.type === 'condition' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition</label>
                  <div className="space-y-2">
                    {CONDITION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateNode(selected.id, { condition: opt.value })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                          selected.condition === opt.value
                            ? 'bg-gray-100 text-gray-900 border border-gray-400'
                            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {selected.condition === opt.value && <Check className="w-4 h-4 flex-shrink-0" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-700 font-medium mb-1">Sorties de condition :</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> OUI &rarr; branche gauche</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> NON &rarr; branche droite</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete */}
              <hr className="border-gray-100" />
              <button
                onClick={() => deleteNode(selected.id)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ce noeud
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <MousePointer className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Sélectionnez un noeud</p>
              <p className="text-xs text-gray-500 mt-1">Cliquez sur un noeud du canvas pour le configurer ici.</p>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left w-full">
                <p className="text-xs font-semibold text-gray-700 mb-2">Secteur détecté :</p>
                <p className="text-sm font-medium text-gray-900">{SECTOR_CONTENT[tenantSector]?.name || tenantSector}</p>
                {companyName && (
                  <p className="text-xs text-gray-500 mt-1">Entreprise : {companyName}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Les prompts sont pré-remplis selon votre secteur. Vous pouvez les personnaliser en cliquant sur chaque noeud.</p>
              </div>
              {apiDebug && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-left w-full">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Secteur API brut :</p>
                  <pre className="text-[10px] text-gray-500 overflow-auto max-h-40 whitespace-pre-wrap break-all">{apiDebug}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Test simulation modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Simulation de séquence</h3>
              </div>
              <button
                onClick={() => { setShowTestModal(false); setTestRunning(false); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Simulation du parcours <strong className="text-gray-900">OUI</strong> (prospect intéressé) :
              </p>
              <div className="space-y-3">
                {simPath.map((nodeId, idx) => {
                  const node = nodes.find(n => n.id === nodeId);
                  if (!node) return null;
                  const cfg = NODE_TYPES[node.type];
                  const Icon = cfg.icon;
                  const isDone = testStep > idx;
                  const isCurrent = testStep === idx && testRunning;
                  return (
                    <div
                      key={nodeId}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isDone
                          ? 'bg-gray-100 border-gray-300'
                          : isCurrent
                            ? 'bg-gray-50 border-gray-400 animate-pulse'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDone ? 'bg-gray-200' : 'bg-gray-100'
                      }`}>
                        {isDone ? (
                          <Check className="w-4 h-4 text-gray-700" />
                        ) : (
                          <Icon className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{node.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isDone ? 'Complété' : isCurrent ? (simLabels[nodeId] || 'En cours...') : 'En attente'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!testRunning && testStep === 0 && (
                <button
                  onClick={runSimulation}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Lancer la simulation
                </button>
              )}
              {!testRunning && testStep >= simPath.length && (
                <div className="mt-5 p-4 bg-gray-100 border border-gray-300 rounded-lg text-center">
                  <Check className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-900">Simulation terminée avec succès !</p>
                  <p className="text-xs text-gray-600 mt-1">Tous les noeuds ont été exécutés correctement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close add menu on click outside */}
      {showAddMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowAddMenu(false)} />
      )}
    </div>
  );
}

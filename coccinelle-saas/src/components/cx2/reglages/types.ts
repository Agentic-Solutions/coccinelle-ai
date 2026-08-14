/**
 * Modèle de la page Réglages (chantier NAVIGATION, 14/08/2026).
 *
 * Une ligne de réglage se décrit en donnée, pas en JSX : c'est ce qui permet à
 * la recherche de balayer les 15 réglages sans dupliquer leurs libellés, et à
 * la page de rester lisible malgré quatre sections.
 *
 * RÈGLE : une ligne n'existe que si le réglage existe VRAIMENT côté serveur —
 * c'est-à-dire s'il est écrit ET LU. Une colonne que personne ne relit est un
 * interrupteur peint sur le mur.
 *
 * Douze lignes de la maquette ont été écartées à ce titre :
 *
 *   • Sept n'avaient ni colonne ni route : jours de fermeture, durée de RDV par
 *     défaut, langue, nom d'expéditeur, réponse automatique aux e-mails,
 *     messages le dimanche, délai de rappel paramétrable.
 *
 *   • Cinq avaient une route d'écriture mais AUCUN lecteur, ce qui est le piège
 *     le plus coûteux — le réglage s'enregistre, l'interface confirme, et rien
 *     ne change :
 *       – `notification_preferences` (email_after_call, sms_reminder_j1,
 *         weekly_summary, quota_alerts) : écrite par PUT /settings/notifications,
 *         relue par personne dans tout le backend. Le rappel J-1, en
 *         particulier, part d'un cron en dur (`0 17 * * *`) qui ne consulte
 *         jamais cette table : décocher la case n'aurait rien arrêté.
 *       – `users.weekly_report_enabled` : lue par
 *         POST /reports/weekly/cron… que rien ne déclenche. Le seul cron déclaré
 *         dans wrangler.toml est le rappel J-1. Le récapitulatif hebdomadaire
 *         n'est donc jamais envoyé, quel que soit l'état de la case.
 *
 * Toutes sont au backlog, le rappel J-1 paramétrable en tête (3–4 j).
 */

export type ChampEditable =
  | { type: 'texte'; cle: string; placeholder?: string }
  | { type: 'choix'; cle: string; options: { valeur: string; libelle: string }[] }
  /** Deux champs, l'actuel et le nouveau — `PUT /settings/account` exige les deux. */
  | { type: 'motdepasse'; cle: string };

export interface LigneReglage {
  id: string;
  label: string;
  /** Une phrase courte sous le label. Vide si le label se suffit. */
  aide?: string;
  /** Valeur affichée en lecture. */
  valeur: string;
  /** Absent = ligne en lecture seule (elle se règle ailleurs, ou pas encore). */
  edition?: ChampEditable;
  /** Ce vers quoi on envoie quand le réglage vit sur une autre page. */
  lien?: { href: string; libelle: string };
  /** Mots supplémentaires pour la recherche (synonymes du client). */
  motsCles?: string[];
}

export interface SectionReglages {
  id: string;
  titre: string;
  aide: string;
  lignes: LigneReglage[];
}

/**
 * Les pages du produit, indexées par la recherche AU MÊME TITRE que les
 * réglages. C'est la contrepartie explicite du retrait du mode Avancé : ~40
 * pages ne sont plus dans aucun menu, et c'est ici qu'on les retrouve.
 */
export interface PageIndexee {
  titre: string;
  href: string;
  motsCles: string[];
}

export const PAGES_INDEXEES: PageIndexee[] = [
  { titre: 'Appels reçus', href: '/dashboard/analytics/calls', motsCles: ['appels', 'journal', 'historique'] },
  { titre: 'Transcriptions d\'appels', href: '/dashboard/analytics/transcripts', motsCles: ['transcript', 'verbatim', 'ce qui a été dit'] },
  { titre: 'Statistiques', href: '/dashboard/analytics', motsCles: ['analytics', 'chiffres', 'rapport'] },
  { titre: 'Tendances', href: '/dashboard/analytics/insights', motsCles: ['insights', 'recommandations'] },
  { titre: 'Exporter mes données', href: '/dashboard/analytics/export', motsCles: ['export', 'tableur', 'csv', 'télécharger'] },
  { titre: 'Messages reçus', href: '/dashboard/conversations', motsCles: ['conversations', 'boîte de réception', 'inbox'] },
  { titre: 'Tâches', href: '/dashboard/tasks', motsCles: ['tâches', 'à faire', 'rappels'] },
  { titre: 'Rendez-vous', href: '/dashboard/rdv', motsCles: ['agenda', 'planning', 'rdv'] },
  { titre: 'Disponibilités', href: '/dashboard/availability', motsCles: ['créneaux', 'horaires de rendez-vous'] },
  { titre: 'Types de rendez-vous', href: '/dashboard/appointment-types', motsCles: ['durée', 'prestation rdv'] },
  { titre: 'Mon équipe', href: '/dashboard/teams', motsCles: ['équipe', 'collaborateurs', 'utilisateurs', 'droits'] },
  { titre: 'Base de connaissances', href: '/dashboard/knowledge', motsCles: ['informations', 'documents', 'fiches'] },
  { titre: 'Questions fréquentes', href: '/dashboard/knowledge/faq', motsCles: ['faq', 'questions'] },
  { titre: 'Prestations et tarifs', href: '/dashboard/services', motsCles: ['tarifs', 'prix', 'prestations', 'services'] },
  { titre: 'SMS', href: '/dashboard/channels/sms', motsCles: ['sms', 'messages écrits'] },
  { titre: 'E-mail', href: '/dashboard/channels/email', motsCles: ['email', 'mail', 'boîte'] },
  { titre: 'WhatsApp', href: '/dashboard/channels/whatsapp', motsCles: ['whatsapp'] },
  { titre: 'Mes numéros', href: '/dashboard/channels/numbers', motsCles: ['numéro', 'ligne', 'téléphone'] },
  { titre: 'Messages automatiques', href: '/dashboard/proactive', motsCles: ['proactif', 'relances', 'rappels automatiques'] },
  { titre: 'Séquences d\'appel', href: '/dashboard/agents/nodes', motsCles: ['séquence', 'scénario'] },
  { titre: 'Réglages avancés de l\'assistant', href: '/dashboard/agents/configuration', motsCles: ['prompt', 'llm', 'versions', 'voix'] },
  { titre: 'Facturation', href: '/dashboard/billing', motsCles: ['abonnement', 'plan', 'paiement'] },
  { titre: 'Factures', href: '/dashboard/billing/invoices', motsCles: ['factures', 'documents comptables'] },
  { titre: 'Consommation', href: '/dashboard/billing/usage', motsCles: ['consommation', 'minutes', 'quota'] },
  { titre: 'Intégrations', href: '/dashboard/integrations', motsCles: ['connecter', 'outils'] },
  { titre: 'Aide', href: '/dashboard/support', motsCles: ['aide', 'support', 'contact'] },
];

/** Compare sans accents ni casse — « telephone » doit trouver « téléphone ». */
export function plier(texte: string): string {
  return String(texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Navigation du dashboard — SOURCE UNIQUE (Chantier CX 1, 28/07/2026).
 *
 * Deux affichages, une seule définition :
 *   - 'simple'   : liste plate, 6 entrées, pas d'accordéon. Défaut des nouveaux
 *                  inscrits. Les testeurs (garagistes) se perdaient dans 15+ menus.
 *   - 'advanced' : les 6 groupes historiques.
 *
 * Le mode Simple MASQUE des entrées de la sidebar, il ne BLOQUE aucune route :
 * /dashboard/teams reste accessible en direct (la checklist y renvoie).
 * Pas de garde de routage = pas de cul-de-sac.
 */

import {
  LayoutDashboard, Phone, Users, Hash, Bot,
  MessageSquare, MessageCircle, Mail,
  Calendar, BookOpen, HelpCircle, Package, Briefcase,
  GitBranch, CheckSquare,
  BarChart3, ScrollText, Download, Bell, TrendingUp,
  Clock, LifeBuoy,
} from 'lucide-react';

export type UiMode = 'simple' | 'advanced';

export interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Mode Simple — liste plate, sans en-tête de groupe. */
export const SIMPLE_NAV: NavItem[] = [
  { name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
  // Chantier CX-2 (13/08/2026) — les deux pages « conversation ».
  // « Mon assistant » ne pointe plus sur agents/configuration : cette page
  // reste accessible en direct et en mode Avancé, elle n'est que masquée
  // (le mode Simple masque, il ne bloque pas — règle posée par CX-1).
  // « Sa connaissance » et non « Ce qu'il sait » : le pronom obligerait à
  // deviner le référent. La page, elle, garde son titre complet
  // (« Ce que sait votre assistant ») — un intitulé de menu et un titre de
  // page n'ont pas le même travail à faire.
  { name: 'Mon assistant', href: '/dashboard/assistant', icon: Bot },
  { name: 'Sa connaissance', href: '/dashboard/savoir', icon: BookOpen },
  { name: 'Appels', href: '/dashboard/analytics/calls', icon: Phone },
  // /dashboard/appointments n'est qu'un redirect() vers /dashboard/rdv — donc une
  // page d'erreur en export statique (règle i.16bis). On vise la vraie page.
  { name: 'Rendez-vous', href: '/dashboard/rdv', icon: Calendar },
  { name: 'Clients', href: '/dashboard/crm/prospects', icon: Users },
  { name: 'Aide', href: '/dashboard/support', icon: LifeBuoy },
];

/** Mode Avancé — sidebar historique, 6 groupes accordéon. */
export const ADVANCED_NAV: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Appels', href: '/dashboard/analytics/calls', icon: Phone },
      { name: 'Contacts', href: '/dashboard/crm/prospects', icon: Users },
      { name: 'Tâches', href: '/dashboard/tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Communication',
    items: [
      { name: 'Numéros', href: '/dashboard/channels/numbers', icon: Hash },
      { name: 'SMS', href: '/dashboard/channels/sms', icon: MessageSquare },
      { name: 'WhatsApp', href: '/dashboard/channels/whatsapp', icon: MessageCircle },
      { name: 'Email', href: '/dashboard/channels/email', icon: Mail },
      // « Messagerie vocale » retirée le 13/08/2026 (chantier MÉNAGE, lot 3).
      // La page faisait 16 lignes et annonçait « arrive prochainement ». Vérifié
      // avant retrait : aucune route backend, aucun webhook Twilio
      // d'enregistrement, aucune table D1. Le flux n'a jamais existé — et la
      // fonction est déjà rendue ailleurs, en mieux : hors horaires l'agent
      // prend le message et l'enregistre par create_task ; transfert
      // impossible, il propose un rappel (create_prospect + SMS).
      { name: 'Notifications proactives', href: '/dashboard/proactive', icon: Bell },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Base de connaissances', href: '/dashboard/knowledge', icon: BookOpen },
      { name: 'FAQ', href: '/dashboard/knowledge/faq', icon: HelpCircle },
      { name: 'Produits & Services', href: '/dashboard/knowledge/products', icon: Package },
    ],
  },
  {
    label: 'Agenda',
    items: [
      // Idem mode Simple : /dashboard/appointments est un redirect() cassé.
      { name: 'Rendez-vous', href: '/dashboard/rdv', icon: Calendar },
      { name: 'Disponibilités', href: '/dashboard/availability', icon: Clock },
      { name: 'Prestations', href: '/dashboard/services', icon: Briefcase },
      { name: 'Equipe', href: '/dashboard/teams', icon: Users },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { name: 'Agents IA', href: '/dashboard/agents/configuration', icon: Bot },
      { name: 'Séquences', href: '/dashboard/agents/nodes', icon: GitBranch },
      // « IVR / SVI » et « Files d'attente » retirées le 13/08/2026 (lot 3) :
      // deux pages de 16 lignes, « arrive prochainement », sans route ni table
      // derrière. Une entrée de menu qui ne mène à rien coûte plus cher qu'une
      // entrée absente — le client cherche la fonction, la trouve, et découvre
      // qu'elle n'existe pas.
    ],
  },
  {
    label: 'Rapports',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { name: 'Insights', href: '/dashboard/analytics/insights', icon: TrendingUp },
      { name: 'Transcripts', href: '/dashboard/analytics/transcripts', icon: ScrollText },
      { name: 'Export', href: '/dashboard/analytics/export', icon: Download },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function getActiveGroupLabel(pathname: string): string | null {
  for (const group of ADVANCED_NAV) {
    if (group.items.some((item) => isActive(pathname, item.href))) {
      return group.label;
    }
  }
  return null;
}

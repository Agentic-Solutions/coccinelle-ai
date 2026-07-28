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
  MessageSquare, MessageCircle, Mail, Voicemail,
  Calendar, BookOpen, HelpCircle, Package, Briefcase,
  GitBranch, ListTree, Users2, CheckSquare,
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
  { name: 'Mon assistant', href: '/dashboard/agents/configuration', icon: Bot },
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
      { name: 'Messagerie vocale', href: '/dashboard/channels/voicemail', icon: Voicemail },
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
      { name: 'IVR / SVI', href: '/dashboard/channels/ivr', icon: ListTree },
      { name: "Files d'attente", href: '/dashboard/channels/queues', icon: Users2 },
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

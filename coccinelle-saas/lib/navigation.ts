/**
 * Navigation du dashboard — SOURCE UNIQUE (chantier NAVIGATION, 14/08/2026).
 *
 * TROIS entrées, et rien d'autre. Plus de mode Simple/Avancé : une seule
 * navigation pour tous.
 *
 * Pourquoi la bascule disparaît : deux navigations, c'est deux choses à
 * maintenir et une source de divergence — l'utilisateur qui bascule ne
 * comprend pas ce qu'il gagne, et celui qui ne bascule jamais ignore la moitié
 * du produit. CX-1 avait créé ce partage pour cacher 15 menus ; ce chantier
 * supprime les 15 menus, donc le partage n'a plus d'objet.
 *
 * Ce qui sort du menu n'est pas bloqué : les ~40 pages hors navigation restent
 * atteignables par un lien depuis leur destination (« Tout voir », onglets,
 * sous-pages) et par la RECHERCHE de Réglages, qui indexe les pages autant que
 * les réglages. C'est la contrepartie explicite du retrait du mode Avancé.
 */

import {
  BarChart3, Mic, Users, Settings, LifeBuoy,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: typeof BarChart3;
}

/** Les trois destinations. Un libellé tient sur une ligne dans 256 px. */
export const NAV: NavItem[] = [
  { name: 'Mon activité', href: '/dashboard', icon: BarChart3 },
  { name: 'Mon assistant', href: '/dashboard/assistant', icon: Mic },
  { name: 'Mes clients', href: '/dashboard/crm/prospects', icon: Users },
];

/**
 * Pied de barre. « Aide » ne figure pas dans la maquette : elle est ajoutée
 * ici (décision du 14/08) parce que la laisser sans point d'entrée la rendrait
 * introuvable — pour l'utilisateur qui en a le plus besoin.
 */
export const NAV_PIED: NavItem[] = [
  { name: 'Réglages', href: '/dashboard/settings', icon: Settings },
  { name: 'Aide', href: '/dashboard/support', icon: LifeBuoy },
];

/**
 * Une entrée est active sur sa page ET sur ses sous-pages, à une exception
 * près : « Mon activité » pointe sur la racine, qui préfixe tout le dashboard.
 * Sans ce cas particulier, les trois entrées seraient actives en permanence.
 */
export function isActive(pathname: string, href: string): boolean {
  const propre = pathname.replace(/\/$/, '') || '/dashboard';
  if (href === '/dashboard') return propre === '/dashboard';
  return propre === href || propre.startsWith(href + '/');
}

/**
 * Les pages qui vivent SOUS une destination sans y figurer en menu. Sert à
 * garder l'entrée allumée quand on navigue dedans — sinon l'utilisateur perd
 * son repère dès qu'il ouvre « Tout voir ».
 */
const RATTACHEMENTS: Record<string, string[]> = {
  '/dashboard': [
    '/dashboard/analytics', '/dashboard/conversations', '/dashboard/tasks',
    '/dashboard/channels/inbox',
  ],
  '/dashboard/assistant': [
    '/dashboard/savoir', '/dashboard/knowledge', '/dashboard/services',
    '/dashboard/agents', '/dashboard/availability', '/dashboard/proactive',
    '/dashboard/channels',
  ],
  '/dashboard/crm/prospects': [
    '/dashboard/crm', '/dashboard/customers', '/dashboard/rdv',
    '/dashboard/appointment-types', '/dashboard/teams', '/dashboard/appointments',
  ],
};

/** L'entrée à allumer pour un chemin donné, rattachements compris. */
export function entreeActive(pathname: string): string | null {
  const propre = pathname.replace(/\/$/, '') || '/dashboard';
  for (const item of NAV) {
    if (isActive(propre, item.href)) return item.href;
  }
  for (const [destination, chemins] of Object.entries(RATTACHEMENTS)) {
    if (chemins.some((c) => propre === c || propre.startsWith(c + '/'))) return destination;
  }
  return null;
}

'use client';

/**
 * Les deux onglets de « Mon assistant » (chantier NAVIGATION, 14/08/2026).
 *
 * Ce sont deux PAGES distinctes, pas deux panneaux d'une même page :
 * /dashboard/assistant et /dashboard/savoir gardent chacune son URL, comme
 * exigé. Les onglets ne sont qu'un habillage commun qui les relie — un
 * composant qui les absorberait casserait les deux URL et tout ce qui y renvoie
 * (checklist, notifications, favoris).
 *
 * Ils ne se replient jamais : le client doit voir d'emblée que son assistant a
 * deux faces — ce qu'il dit, et ce qu'il sait.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ONGLETS = [
  { label: 'Ses réponses', href: '/dashboard/assistant' },
  { label: 'Ce qu\'il sait', href: '/dashboard/savoir' },
];

export default function OngletsAssistant() {
  const pathname = usePathname().replace(/\/$/, '');

  return (
    <div className="flex gap-1.5 border-b border-[#e2e2de]">
      {ONGLETS.map((onglet) => {
        const actif = pathname === onglet.href;
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            aria-current={actif ? 'page' : undefined}
            className="px-[18px] py-[11px] text-[14.5px] font-medium -mb-px border-b-2 transition-colors"
            style={{
              borderBottomColor: actif ? '#1a1a19' : 'transparent',
              color: actif ? '#1a1a19' : '#8a8a83',
            }}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}

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
 * deux faces — ce qu'il répond, et ce qu'il sait.
 *
 * RENFORCÉS le 14/08 après recette : à 14,5 px, trait de 2 px et graisse 500,
 * ils avaient l'apparence de deux liens dans un fil d'ariane. C'est pourtant la
 * bascule la plus importante du produit — celle entre « ce que mon assistant
 * dit » et « ce sur quoi il s'appuie pour le dire ». Quatre leviers cumulés :
 * la taille, la graisse, l'épaisseur du trait, et un sous-titre qui explique la
 * différence sans qu'il faille cliquer pour la découvrir.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ONGLETS = [
  {
    label: 'Ses réponses',
    aide: 'Ce qu\'il dit au téléphone',
    href: '/dashboard/assistant',
  },
  {
    label: 'Ce qu\'il sait',
    aide: 'Tarifs, horaires, prestations',
    href: '/dashboard/savoir',
  },
];

export default function OngletsAssistant() {
  const pathname = usePathname().replace(/\/$/, '');

  return (
    <div className="flex gap-1 border-b border-[#e2e2de]" role="tablist">
      {ONGLETS.map((onglet) => {
        const actif = pathname === onglet.href;
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            role="tab"
            aria-selected={actif}
            aria-current={actif ? 'page' : undefined}
            className="group flex flex-col gap-[3px] px-[20px] pt-[12px] pb-[11px] -mb-[2px] border-b-[3px] transition-colors rounded-t-[8px]"
            style={{
              borderBottomColor: actif ? '#1a1a19' : 'transparent',
              background: actif ? 'transparent' : undefined,
            }}
          >
            <span
              className="text-[15.5px] transition-colors"
              style={{
                fontWeight: actif ? 600 : 500,
                color: actif ? '#1a1a19' : '#6b6b66',
              }}
            >
              {onglet.label}
            </span>
            <span
              className="text-[12px] transition-colors"
              style={{ color: actif ? '#8a8a83' : '#a3a39c' }}
            >
              {onglet.aide}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

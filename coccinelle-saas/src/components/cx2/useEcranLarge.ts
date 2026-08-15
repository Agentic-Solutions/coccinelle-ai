'use client';

import { useEffect, useState } from 'react';

/**
 * Vrai au-dessus de 900 px de large.
 *
 * POURQUOI UN HOOK ET PAS UNE MEDIA QUERY
 * Les pages de la série CX sont en styles INLINE, pour rester au hex près sur
 * les maquettes Claude Design. Or un style inline ne peut pas porter de
 * `@media` : la grille « 60fr / 40fr » reste donc à deux colonnes sur un
 * téléphone, et donne deux colonnes de 170 px où chaque mot va à la ligne.
 *
 * Ce n'est pas un détail cosmétique dans ce produit : les clients sont des
 * artisans, ils consultent leur tableau de bord au téléphone, entre deux
 * interventions. C'est l'écran principal, pas la version dégradée.
 *
 * ⚠️ Les deux pages du chantier CX-2 (`/dashboard/assistant`, `/dashboard/savoir`)
 * portent le MÊME défaut, non corrigé à ce jour : `gridTemplateColumns` y est
 * inline sans repli. Ce hook est prévu pour elles aussi.
 *
 * Le premier rendu retourne `false` — donc UNE colonne. C'est délibéré : sur un
 * export statique il n'y a pas de largeur connue au rendu serveur, et se tromper
 * vers une colonne donne une page lisible partout, alors que se tromper vers deux
 * donne un instant d'illisible sur mobile.
 */
export function useEcranLarge(seuil = 900): boolean {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    // matchMedia manque sur les très vieux navigateurs et dans certains
    // environnements de test : on reste alors sur une colonne.
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(min-width: ${seuil}px)`);
    setLarge(mq.matches);
    const suivre = (e: MediaQueryListEvent) => setLarge(e.matches);
    mq.addEventListener('change', suivre);
    return () => mq.removeEventListener('change', suivre);
  }, [seuil]);

  return large;
}

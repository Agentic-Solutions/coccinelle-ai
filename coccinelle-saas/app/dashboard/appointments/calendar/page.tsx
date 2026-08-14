/**
 * Redirection vers /dashboard/rdv (chantier NAVIGATION 2, 14/08/2026).
 *
 * CETTE PAGE N'A JAMAIS ÉTÉ UN AGENDA.
 * Malgré son URL, elle ne contenait aucune grille — ni mensuelle, ni
 * hebdomadaire : titre « Rendez-vous », cartes de synthèse, filtres, liste.
 * C'était un doublon quasi exact de `/dashboard/rdv`, et le plus pauvre des
 * deux :
 *
 *   | | /dashboard/rdv | ici |
 *   | filtres statut / agent / date / recherche | oui | oui |
 *   | création « Nouveau rendez-vous »          | oui | oui |
 *   | synchronisation Google / Outlook          | OUI | non |
 *
 * Elle n'était atteignable depuis aucun lien du produit : personne ne la perd.
 * La carte « Rendez-vous à venir » de « Mes clients » pointait déjà sur
 * `/dashboard/rdv`, le bon endroit — la rattacher ici aurait mis deux pages
 * « Rendez-vous » concurrentes devant le client, exactement ce que le chantier
 * MÉNAGE vient de retirer.
 *
 * La VRAIE vue agenda — une grille mensuelle, parce qu'un garagiste pense son
 * planning en semaine — est au backlog (1,5–2 j). C'est une brique à écrire, pas
 * une page à rattacher.
 *
 * Meta refresh et non `redirect()` de next/navigation : le site est exporté en
 * statique (`output: 'export'`), où `redirect()` produit une page d'erreur
 * `__next_error__` au lieu de rediriger (règle 16bis). Le lien visible sert de
 * repli et fonctionne sans JavaScript.
 */

import Link from 'next/link';

const CIBLE = '/dashboard/rdv/';

export const metadata = {
  title: 'Rendez-vous — Coccinelle.ai',
};

export default function RedirectionAgenda() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${CIBLE}`} />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Rendez-vous</h1>
          <p className="text-gray-600 mb-6">
            Vos rendez-vous sont regroupés sur une seule page.
          </p>
          <Link
            href={CIBLE}
            className="inline-block px-5 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
          >
            Ouvrir mes rendez-vous
          </Link>
        </div>
      </div>
    </>
  );
}

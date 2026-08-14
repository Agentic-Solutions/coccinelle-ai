/**
 * Redirection vers « Réglages » (chantier NAVIGATION, 14/08/2026).
 *
 * CE QUI A ÉTÉ REMPLACÉ, ET POURQUOI RIEN N'EST PERDU.
 * Cette page s'intitulait « Mes Canaux de Communication » et proposait un canal
 * préféré et une matrice de notifications par canal. Aucune de ces valeurs
 * n'atteignait le serveur : elles étaient écrites dans le `localStorage` du
 * navigateur (`preferred_channel`, `channels_config`) et relues par cette page
 * seule. Un client qui changeait de navigateur ou d'appareil retrouvait ses
 * réglages « perdus » — ils n'avaient jamais quitté sa machine.
 * Son unique réglage serveur, le récapitulatif hebdomadaire
 * (`users.weekly_report_enabled`), n'est lu que par POST /reports/weekly/cron,
 * que rien ne déclenche : le seul cron déclaré est le rappel J-1.
 *
 * Il n'y avait donc aucun réglage effectif à reprendre. Les vrais réglages du
 * compte vivent désormais sur une page unique, /dashboard/settings.
 *
 * Meta refresh et non `redirect()` de next/navigation : le site est exporté en
 * statique (`output: 'export'`), où `redirect()` ne redirige pas — il produit
 * une page d'erreur `__next_error__` (règle 16bis, payée le 19/07/2026). Le lien
 * visible sert de repli : il fonctionne sans JavaScript.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Réglages — Coccinelle.ai',
};

export default function RedirectionNotifications() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/dashboard/settings/" />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Vos alertes ont déménagé
          </h1>
          <p className="text-gray-600 mb-6">
            Elles sont maintenant dans Réglages, avec le reste de votre compte.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-block px-5 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
          >
            Ouvrir les Réglages
          </Link>
        </div>
      </div>
    </>
  );
}

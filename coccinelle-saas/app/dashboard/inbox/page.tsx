import Link from 'next/link';

const CIBLE = '/dashboard/conversations/';

/**
 * Redirection legacy — reparee le 13/08/2026 (chantier MENAGE, lot 1).
 *
 * Point d'atterrissage des notifications push « nouveau message »
 * (src/utils/notifications.js). Elle utilisait redirect() de next/navigation,
 * qui en export statique genere une page d'erreur au lieu de rediriger
 * (regle i.16bis) : taper sur la notification menait dans le mur.
 *
 * Conservee meme apres correction du backend : les notifications deja envoyees
 * portent cette URL figee dans leur message push.
 */
export default function InboxRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${CIBLE}`} />
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">
          Vos messages ont change d&apos;adresse.{' '}
          <Link href={CIBLE} className="text-gray-900 underline">
            Voir les conversations
          </Link>
        </p>
      </div>
    </>
  );
}

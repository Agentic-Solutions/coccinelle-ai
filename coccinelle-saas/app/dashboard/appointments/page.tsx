import Link from 'next/link';

const CIBLE = '/dashboard/rdv/';

/**
 * Redirection legacy — reparee le 13/08/2026 (chantier MENAGE, lot 1).
 *
 * Cette page utilisait redirect() de next/navigation. Le site est exporte en
 * statique (next.config.js : output: 'export'), ou redirect() ne redirige PAS :
 * il genere une page d'erreur <html id="__next_error__"> (regle i.16bis).
 *
 * Ce n'etait pas du code mort. C'est ici qu'atterrissaient les notifications
 * push « nouveau rendez-vous » (src/utils/notifications.js) : chaque client qui
 * tapait sur la notification tombait sur une erreur. Les notifications DEJA
 * envoyees portent cette URL figee dans leur message — cette page doit donc
 * continuer d'exister et de rediriger, meme apres correction cote backend.
 *
 * Le meta refresh fonctionne sans JavaScript et sans dependre de la priorite
 * entre les fichiers statiques et public/_redirects sur Cloudflare Pages. Le
 * lien visible sert de repli si le rafraichissement est bloque.
 */
export default function RendezVousRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${CIBLE}`} />
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">
          Vos rendez-vous ont change d&apos;adresse.{' '}
          <Link href={CIBLE} className="text-gray-900 underline">
            Voir les rendez-vous
          </Link>
        </p>
      </div>
    </>
  );
}

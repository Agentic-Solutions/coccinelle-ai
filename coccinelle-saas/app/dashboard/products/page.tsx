import Link from 'next/link';

const CIBLE = '/dashboard/knowledge/products/';

/**
 * Redirection legacy — reparee le 13/08/2026 (chantier MENAGE, lot 2).
 *
 * Cette page utilisait redirect() de next/navigation. Le site est exporte en
 * statique (next.config.js : output: 'export'), ou redirect() ne redirige PAS :
 * il genere une page d'erreur <html id="__next_error__"> au lieu de rediriger
 * (regle i.16bis). Les 17 routes de ce type affichaient donc une erreur.
 *
 * Le meta refresh fonctionne sans JavaScript et sans dependre de la priorite
 * entre fichiers statiques et public/_redirects sur Cloudflare Pages. Le lien
 * visible sert de repli si le rafraichissement est bloque.
 *
 * La page reste en place : elle existe pour servir un favori ancien. La
 * supprimer transformerait une page d'erreur en 404 — meme echec, moins
 * d'information.
 */
export default function ProduitsRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${CIBLE}`} />
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">
          Vos produits et services ont change d&apos;adresse.{' '}
          <Link href={CIBLE} className="text-gray-900 underline">
            Voir les produits et services
          </Link>
        </p>
      </div>
    </>
  );
}

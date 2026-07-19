import Link from 'next/link';

const TARGET = '/legal/politique-confidentialite/';

/**
 * Page orpheline — redirection vers la politique canonique (19/07/2026).
 *
 * Cette route hebergeait une seconde politique de confidentialite (145 lignes,
 * « mars 2026 ») qui n'etait liee depuis nulle part et divergeait de la version
 * canonique : contact contact@ au lieu de privacy@, pas de table de retention,
 * pas de liste de sous-traitants, pas de section droits RGPD detaillee.
 *
 * Deux politiques publiques contradictoires = risque de non-conformite. La
 * canonique est /legal/politique-confidentialite (liee depuis le footer et les
 * pages secteur, et declaree a Meta pour l'App Review WhatsApp V2).
 *
 * ATTENTION : ne PAS utiliser redirect() de next/navigation ici. Le site est
 * exporte en statique (next.config.js : output: 'export'), et redirect() y
 * genere une page d'erreur (<html id="__next_error__">) au lieu de rediriger.
 * On passe donc par un meta refresh, qui fonctionne sans JavaScript et sans
 * dependre de l'ordre de priorite entre assets statiques et regles _redirects.
 *
 * Contenu d'origine conserve dans l'historique git.
 */
export default function ConfidentialiteRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">
          Cette page a ete deplacee.{' '}
          <Link href={TARGET} className="text-gray-900 underline">
            Consulter la politique de confidentialite
          </Link>
        </p>
      </div>
    </>
  );
}

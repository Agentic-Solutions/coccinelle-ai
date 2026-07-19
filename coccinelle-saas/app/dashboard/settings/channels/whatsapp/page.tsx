import Link from 'next/link';

const TARGET = '/dashboard/channels/whatsapp/';

/**
 * WhatsApp V1 gele — Lot 0 securisation (19/07/2026), voir WHATSAPP_V2_PLAN.md
 *
 * Cette route hebergeait une page de configuration (718 lignes) qui annoncait
 * « Votre compte WhatsApp est connecte et operationnel » et proposait un faux
 * OAuth (setTimeout de 2 s + numero code en dur), alors que le canal n'a jamais
 * fonctionne en production. Elle contredisait /dashboard/channels/whatsapp, qui
 * affiche correctement « Bientot disponible ».
 *
 * ATTENTION : ne PAS utiliser redirect() de next/navigation ici. Le site est
 * exporte en statique (next.config.js : output: 'export'), et redirect() y
 * genere une page d'erreur (<html id="__next_error__">) au lieu de rediriger.
 * C'etait le cas de la premiere version de ce fichier, deployee le 19/07 :
 * corrige le meme jour par un meta refresh, qui fonctionne sans JavaScript.
 *
 * Le contenu d'origine reste dans l'historique git (commit ac8466c et suivants)
 * si la V2 veut en recuperer des morceaux d'UI.
 */
export default function WhatsAppSettingsRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-gray-600 text-center">
          La configuration WhatsApp a ete deplacee.{' '}
          <Link href={TARGET} className="text-gray-900 underline">
            Acceder au canal WhatsApp
          </Link>
        </p>
      </div>
    </>
  );
}

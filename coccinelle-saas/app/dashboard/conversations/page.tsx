'use client';

/**
 * « Conversations » — page de renvoi (réécrite au chantier CX-3, 15/08/2026).
 *
 * CE QU'ELLE ÉTAIT : trois cartes, dont DEUX pointaient sur la même page —
 * « Configuration assistant » et « Journal des appels » menaient toutes les deux
 * vers `/dashboard/conversations/appels`. Un clic sur « Configuration
 * assistant » ouvrait donc un journal d'appels. Et le titre « Conversations IA »
 * avec son « L'IA adapte son approche à chaque client sur tous les canaux »
 * promettait un carrefour omnicanal qui n'existait pas : la page ne lisait rien,
 * elle n'affichait que des liens.
 *
 * ⚠️ POURQUOI ELLE N'EST PAS SUPPRIMÉE : la notification push `new_message` mène
 * ici (vérifié par `design/menage/verifier-liens.sh`). Une route supprimée ferait
 * atterrir le destinataire d'une notification sur une page d'erreur — et en
 * export statique, un `redirect()` de next/navigation GÉNÈRE cette page d'erreur
 * au lieu de rediriger (règle 16bis). D'où trois destinations réelles, et un
 * `<meta refresh>` accompagné d'un lien visible vers celle qui répond au besoin.
 */

import Link from 'next/link';
import { MessageSquare, Phone, Inbox } from 'lucide-react';

const DESTINATIONS = [
  {
    href: '/dashboard/communications',
    icone: MessageSquare,
    titre: 'Mes communications',
    detail: 'Les SMS et e-mails réellement envoyés, avec leur contenu',
  },
  {
    href: '/dashboard/channels/inbox',
    icone: Inbox,
    titre: 'Boîte de réception',
    detail: 'Les conversations en cours, tous canaux',
  },
  {
    href: '/dashboard/conversations/appels',
    icone: Phone,
    titre: 'Journal des appels',
    detail: 'Historique complet des appels téléphoniques',
  },
];

export default function ConversationsPage() {
  return (
    <>
      {/* Redirection douce vers la destination principale : elle couvre le besoin
          de la notification `new_message`. Le lien visible ci-dessous fonctionne
          sans JavaScript et si la redirection est bloquée. */}
      <meta httpEquiv="refresh" content="2; url=/dashboard/communications/" />

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 pl-10 lg:pl-0">
            Vos échanges
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 pl-10 lg:pl-0">
            Redirection vers <strong>Mes communications</strong>…{' '}
            <Link href="/dashboard/communications" className="underline underline-offset-2">
              y aller maintenant
            </Link>
          </p>

          <div className="flex flex-col gap-3">
            {DESTINATIONS.map(({ href, icone: Icone, titre, detail }) => (
              <Link
                key={href}
                href={href}
                className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-gray-900 transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icone className="w-5 h-5 text-gray-700" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">{titre}</h2>
                  <p className="text-sm text-gray-600">{detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

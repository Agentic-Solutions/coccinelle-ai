'use client';

/**
 * Synchronisation calendrier — état réel (chantier NAVIGATION 4, 14/08/2026).
 *
 * CE QUI A ÉTÉ RETIRÉ, ET POURQUOI.
 * Cette page montait `CalendarIntegration` (504 lignes), une maquette qui ne
 * faisait AUCUN appel réseau — ni `fetch`, ni `buildApiUrl`. Tout son contenu
 * vivait dans son état initial :
 *
 *     email: 'manager@entreprise.com', eventsCount: 42,
 *     lastSync: new Date(Date.now() - 1000 * 60 * 15),   // « il y a 15 min »
 *
 * Un garage voyait donc une boîte qu'il n'avait jamais connectée, 42 événements
 * qui n'existaient pas, et deux rendez-vous d'agence immobilière (« Visite
 * appartement 3 pièces »). Les boutons simulaient : `handleConnect` portait le
 * commentaire `// Simulate OAuth flow` et ajoutait une ligne au tableau après
 * un `setTimeout`. « Déconnecter » retirait une ligne en mémoire — au
 * rechargement, `manager@entreprise.com` revenait.
 *
 * Le danger n'est pas cosmétique : un client qui croit son agenda synchronisé
 * cesse de vérifier ses créneaux, et laisse l'assistant poser des rendez-vous
 * sur des heures où il est déjà pris.
 *
 * CÔTÉ SERVEUR IL N'Y A RIEN À BRANCHER : aucune route `calendar`, et les trois
 * tables (`calendar_blocks`, `integration_sync_logs`, `integration_sync_queue`)
 * sont vides — `calendar_blocks` n'est écrite par aucune ligne de code.
 *
 * Pas de redirection, contrairement à `appointments/calendar` : il n'existe
 * aucune page équivalente vers où renvoyer. La page reste, elle dit la vérité.
 *
 * La vraie synchronisation est au backlog (5–7 j, PLAN-NAVIGATION.md § 16).
 */

import Link from 'next/link';
import { ArrowLeft, CalendarClock, Check } from 'lucide-react';
import Logo from '@/components/Logo';

/** Ce que la synchronisation fera — et rien de plus, tant qu'elle n'existe pas. */
const PROMESSES = [
  'Vos créneaux déjà pris dans Google Agenda deviennent indisponibles à la réservation.',
  'Les rendez-vous pris par votre assistant apparaissent dans votre agenda.',
  'Votre assistant cesse de proposer des heures où vous êtes occupé.',
];

export default function PageCalendriers() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/rdv">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Retour">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} className="hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Synchronisation calendrier</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Éviter que votre assistant propose un créneau déjà pris
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <CalendarClock className="w-5 h-5 text-gray-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Pas encore disponible
              </h2>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                Relier votre agenda Google ou Outlook est en cours de développement.
                Aucun calendrier n&apos;est connecté à votre compte aujourd&apos;hui —
                si vous voyiez le contraire sur cette page, c&apos;était une erreur
                d&apos;affichage, corrigée.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
              Ce que cela apportera
            </p>
            <ul className="space-y-2.5">
              {PROMESSES.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              En attendant, vos disponibilités se règlent dans{' '}
              <Link href="/dashboard/availability" className="text-gray-900 underline underline-offset-2">
                Disponibilités
              </Link>{' '}
              : votre assistant ne propose que les créneaux que vous y ouvrez.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard/rdv"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour aux rendez-vous
          </Link>
        </div>
      </div>
    </div>
  );
}

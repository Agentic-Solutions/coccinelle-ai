'use client';

/**
 * « Messages recents » sur Mon activité — chantier CX-3, 15/08/2026.
 *
 * Mon activité ne montrait que les appels. Les SMS partaient déjà — devis,
 * confirmations, rappels J-1 — et n'apparaissaient nulle part. Ce bloc est
 * l'entrée vers « Mes communications », et il montre les cinq derniers messages
 * pour que le lien ait une raison d'être cliqué.
 *
 * COMPOSANT AUTONOME, comme `SetupChecklist` : il a son propre état et rend
 * `null` tant qu'il n'a rien. Le mettre derrière le garde `loading` de la page
 * le rendrait tributaire des quatre requêtes du `Promise.all` — une seule qui ne
 * revient pas et les messages disparaissent (c'est la leçon inscrite dans la
 * page à propos de la checklist).
 *
 * Il ne s'affiche PAS quand il n'y a aucun message : sur Mon activité, une carte
 * vide de plus n'apprend rien. La page « Mes communications », elle, dit
 * explicitement « aucun message pour l'instant » — c'est là qu'on va chercher.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, MessageSquare } from 'lucide-react';
import { chargerMessages, type Message } from '@/lib/cx3-api';

/** « il y a 3 h », « hier », « le 11 août ». */
function ilYA(iso: string): string {
  const t = Date.parse(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(t)) return '';
  const minutes = Math.round((Date.now() - t) / 60000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 8) return `il y a ${jours} j`;
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MessagesRecents() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [charge, setCharge] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await chargerMessages({ limite: 5 });
      setMessages(r.messages);
      setTotal(r.total);
    } catch {
      // Silencieux : c'est un aperçu, pas une fonction critique. Une panne
      // réseau ne doit pas polluer le tableau de bord.
    } finally {
      setCharge(true);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  if (!charge || messages.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Messages recents</h2>
        <Link
          href="/dashboard/communications"
          className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors whitespace-nowrap"
        >
          Voir mes communications
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {messages.map((m) => {
          const Icone = m.canal === 'email' ? Mail : MessageSquare;
          return (
            <div key={m.id} className="flex items-start gap-4 px-5 py-3.5">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icone className="w-4 h-4 text-gray-700" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.contact || m.adresse || 'Client'}
                  </p>
                  <span className="text-xs text-gray-400">
                    {m.canal === 'sms' ? 'SMS' : 'E-mail'} {m.sens === 'recu' ? 'reçu' : 'envoyé'}
                  </span>
                </div>
                {/* Le contenu RÉEL, tronqué à l'affichage seulement. */}
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.contenu}</p>
              </div>
              <div className="text-xs text-gray-400 w-20 text-right flex-shrink-0 hidden sm:block">
                {ilYA(m.date)}
              </div>
            </div>
          );
        })}
      </div>
      {total > messages.length && (
        <div className="px-5 py-3 border-t border-gray-100">
          <Link
            href="/dashboard/communications"
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            {total} messages en tout
          </Link>
        </div>
      )}
    </div>
  );
}

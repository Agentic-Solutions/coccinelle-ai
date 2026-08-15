'use client';

/**
 * « Messages » — compteurs réels (réécrite au chantier CX-3, 15/08/2026).
 *
 * CE QU'ELLE AFFICHAIT : trois zéros permanents. Elle lisait
 * `data.total_sms`, `data.total_whatsapp`, `data.total_email` et
 * `data.response_rate` sur `/api/v1/analytics/overview` — une route qui ne
 * renvoie AUCUN de ces quatre champs. Le `|| 0` transformait donc quatre
 * `undefined` en quatre zéros crédibles, avec barres de progression à 0 % et un
 * « Aucun message sur cette période » affirmé à un garage qui en avait envoyé
 * quatre. C'est le compteur fictif du chantier NAVIGATION 2 (§ 11.1), en trois
 * exemplaires.
 *
 * DEUX ÉLÉMENTS RETIRÉS, parce qu'ils ne mesuraient rien :
 *
 *   — LE SÉLECTEUR 7 / 30 / 90 JOURS. Il rappelait la même route sans lui passer
 *     la moindre période : les trois boutons donnaient le même chiffre. Le
 *     rétablir demanderait un filtre par date côté serveur ; l'afficher sans ce
 *     filtre, c'est promettre une analyse qui n'a pas lieu.
 *
 *   — LE « TAUX DE RÉPONSE ». Aucune donnée ne le porte. Remplacé par le partage
 *     envoyés / reçus, qui se compte en comptant des lignes.
 *
 * WhatsApp n'affiche plus « 0 » : il est GELÉ (cf. WHATSAPP_V2_PLAN.md). Un zéro
 * se lit « personne ne vous écrit » ; la vérité est « ce canal n'est pas ouvert ».
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, Loader2, Send } from 'lucide-react';
import { chargerMessages, type Message } from '@/lib/cx3-api';

export default function AnalyticsMessagesPage() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      // 200 = le plafond de la route. Au-delà, ce n'est plus un compteur de
      // page mais une agrégation côté serveur — elle n'existe pas encore, et on
      // le dit plutôt que de laisser croire à un total exhaustif.
      const r = await chargerMessages({ limite: 200 });
      setMessages(r.messages);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Lecture impossible');
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const compte = (canal: 'sms' | 'email', sens?: 'envoye' | 'recu') =>
    (messages || []).filter((m) => m.canal === canal && (!sens || m.sens === sens)).length;

  const total = (messages || []).length;
  const envoyes = (messages || []).filter((m) => m.sens === 'envoye').length;
  const recus = total - envoyes;
  const plafondAtteint = total >= 200;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-gray-700" />
              Messages
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Combien de SMS et d&apos;e-mails, dans quel sens.{' '}
              <Link href="/dashboard/communications" className="underline underline-offset-2">
                Voir leur contenu
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {messages === null && !erreur ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : erreur ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            <p>{erreur}</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div>
                  <p className="text-sm text-gray-500">Messages au total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {plafondAtteint ? '200 +' : total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Envoyés</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{envoyes}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reçus</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{recus}</p>
                </div>
              </div>
              {plafondAtteint && (
                <p className="text-xs text-gray-400 mt-3">
                  Les 200 derniers messages. Le total exact sur une période demandera
                  un comptage côté serveur, qui n&apos;existe pas encore.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {([
                { label: 'SMS', icone: MessageSquare, n: compte('sms'), envoyes: compte('sms', 'envoye') },
                { label: 'E-mail', icone: Mail, n: compte('email'), envoyes: compte('email', 'envoye') },
              ]).map(({ label, icone: Icone, n, envoyes: env }) => {
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return (
                  <div key={label} className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icone className="w-5 h-5 text-gray-700" />
                      </div>
                      <span className="font-medium text-gray-900">{label}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{n}</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-gray-900" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {pct}% du total · {env} envoyé{env > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* WhatsApp : gelé, pas à zéro. */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="font-medium text-gray-500">WhatsApp</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Bientôt disponible</p>
                <p className="text-xs text-gray-400 mt-1">Ce canal n&apos;est pas encore ouvert.</p>
              </div>
            </div>

            {total === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucun message pour l&apos;instant.</p>
                <p className="text-sm mt-1">
                  Les SMS de devis, de confirmation et de rappel apparaîtront ici dès le premier envoi.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

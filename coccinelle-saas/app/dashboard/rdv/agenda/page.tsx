'use client';

/**
 * Agenda des rendez-vous — grille mensuelle (chantier NAVIGATION 3, 14/08/2026).
 *
 * POURQUOI ELLE EST ICI, ET PAS AILLEURS
 * L'URL est `/dashboard/rdv/agenda`, sous `rdv` et non à côté : elle dit
 * elle-même « autre vue du même contenu ». C'est exactement le contraire de
 * `/dashboard/appointments/calendar`, dont l'URL parallèle avait produit une
 * seconde page « Rendez-vous » concurrente, avec ses propres filtres et sa
 * propre création — un doublon que le chantier précédent a dû rediriger.
 *
 * TROIS RÈGLES QUI L'EMPÊCHENT DE REDEVENIR UN DOUBLON. Elles ne sont pas
 * décoratives : c'est en les enfreignant une à une qu'on refabrique la page
 * qu'on vient de supprimer.
 *
 *   1. ELLE NE CRÉE RIEN. Aucune modale « Nouveau rendez-vous ». Un clic sur un
 *      jour vide renvoie sur la liste, qui porte le bouton de création. La
 *      création vit à UN seul endroit.
 *   2. ELLE NE FILTRE RIEN. Statut, agent, recherche restent sur la liste. Une
 *      grille qui filtre, c'est la liste avec un autre habillage.
 *   3. ELLE LIT LA MÊME SOURCE (`GET /api/v1/appointments`) et chaque
 *      rendez-vous mène à la MÊME fiche, `/dashboard/rdv/{id}`.
 *
 * ⚠️ `scheduled_at` est une date-heure NAÏVE et déjà LOCALE (règle 10quinquies).
 * Elle n'est jamais passée à `new Date()` : on lit ses composantes telles
 * quelles. Une grille de calendrier est précisément l'endroit où un décalage de
 * deux heures fait changer un rendez-vous de JOUR — un RDV de 23 h le 12 août
 * s'afficherait le 13.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface RendezVous {
  id: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  status?: string | null;
  prospect_name?: string | null;
  service_name?: string | null;
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Couleur de pastille par statut — le vocabulaire du reste du produit. */
const TEINTE: Record<string, string> = {
  confirmed: 'bg-gray-900 text-white',
  scheduled: 'bg-gray-200 text-gray-900',
  pending: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-50 text-gray-400 line-through',
  completed: 'bg-gray-200 text-gray-500',
};

/**
 * Découpe `2026-08-12T14:00:00` sans jamais construire de Date à partir du
 * texte : `new Date('2026-08-12T14:00:00')` est interprété en UTC par certains
 * moteurs, ce qui décale l'affichage de deux heures en été — et donc de jour
 * pour tout rendez-vous en soirée.
 */
function composantes(brut: string) {
  const m = String(brut || '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  const [, a, mo, j, h, mi] = m;
  return { cle: `${a}-${mo}-${j}`, heure: `${h}:${mi}` };
}

/** `2026-08-12` pour une date locale, sans passer par toISOString (UTC). */
function cleDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AgendaRendezVous() {
  const [rdv, setRdv] = useState<RendezVous[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Le mois affiché, ramené au 1er : manipuler un 31 en changeant de mois
  // ferait déborder sur le mois suivant (31 février n'existe pas).
  const [mois, setMois] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [jourDeplie, setJourDeplie] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/appointments'), { headers: getAuthHeaders() });
      const corps = await res.json();
      if (!res.ok || corps?.success === false) throw new Error(corps?.error || 'Chargement impossible');
      setRdv(corps?.appointments || []);
    } catch (e) {
      setErreur((e as Error).message);
      setRdv([]);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  /** Les rendez-vous rangés par jour, une seule fois par chargement. */
  const parJour = useMemo(() => {
    const carte: Record<string, { id: string; heure: string; qui: string; quoi: string; statut: string }[]> = {};
    for (const r of rdv || []) {
      const c = composantes(r.scheduled_at);
      if (!c) continue;
      (carte[c.cle] ||= []).push({
        id: r.id,
        heure: c.heure,
        qui: r.prospect_name || 'Client',
        quoi: r.service_name || '',
        statut: r.status || 'scheduled',
      });
    }
    for (const k of Object.keys(carte)) carte[k].sort((a, b) => a.heure.localeCompare(b.heure));
    return carte;
  }, [rdv]);

  /**
   * Les cases de la grille : on remonte au lundi précédant le 1er du mois et on
   * avance de sept en sept jusqu'à dépasser le mois. `getDay()` rend 0 pour
   * dimanche — en France la semaine commence le lundi, d'où le décalage.
   */
  const semaines = useMemo(() => {
    const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const decalage = (premier.getDay() + 6) % 7;
    const debut = new Date(premier);
    debut.setDate(premier.getDate() - decalage);

    const cases: Date[] = [];
    const curseur = new Date(debut);
    while (cases.length < 42) {
      cases.push(new Date(curseur));
      curseur.setDate(curseur.getDate() + 1);
      // Cinq semaines suffisent souvent : on s'arrête dès que le mois est passé
      // et que la semaine est complète, pour ne pas afficher une ligne vide.
      if (cases.length % 7 === 0 && curseur.getMonth() !== mois.getMonth() && cases.length >= 28) break;
    }
    const lignes: Date[][] = [];
    for (let i = 0; i < cases.length; i += 7) lignes.push(cases.slice(i, i + 7));
    return lignes;
  }, [mois]);

  const cleAujourdhui = cleDe(new Date());
  const total = (rdv || []).length;

  const changerMois = (pas: number) => {
    setMois((m) => new Date(m.getFullYear(), m.getMonth() + pas, 1));
    setJourDeplie(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap pl-10 lg:pl-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total === 0 ? 'Aucun rendez-vous enregistré' : `${total} rendez-vous au total`}
          </p>
        </div>
        {/* Bascule de vue — la liste et l'agenda montrent le MÊME contenu. */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" role="tablist">
          <Link
            href="/dashboard/rdv"
            role="tab"
            aria-selected={false}
            className="px-3.5 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Liste
          </Link>
          <span
            role="tab"
            aria-selected
            className="px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm"
          >
            Agenda
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Navigation de mois */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => changerMois(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {MOIS[mois.getMonth()]} {mois.getFullYear()}
            </h2>
            <button
              onClick={() => { setMois(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setJourDeplie(null); }}
              className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              Aujourd&apos;hui
            </button>
          </div>
          <button
            onClick={() => changerMois(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {rdv === null && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {erreur && (
          <p className="px-4 py-3 text-sm text-gray-600">{erreur}</p>
        )}

        {rdv !== null && (
          <>
            {/* ── Grille, à partir de sm ──
                Sous 640 px elle est masquée au profit de la liste par jour :
                sept colonnes sur 375 px sont illisibles, et les clients de nos
                clients sont au téléphone. */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-7 border-b border-gray-100">
                {JOURS.map((j) => (
                  <div key={j} className="px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 text-center">
                    {j}
                  </div>
                ))}
              </div>
              {semaines.map((semaine, i) => (
                <div key={i} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
                  {semaine.map((jour) => {
                    const cle = cleDe(jour);
                    const items = parJour[cle] || [];
                    const horsMois = jour.getMonth() !== mois.getMonth();
                    const cejour = cle === cleAujourdhui;
                    const deplie = jourDeplie === cle;
                    const visibles = deplie ? items : items.slice(0, 3);
                    return (
                      <div
                        key={cle}
                        className={`min-h-[104px] border-r border-gray-100 last:border-r-0 p-1.5 ${
                          horsMois ? 'bg-gray-50/60' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            cejour ? 'bg-gray-900 text-white font-semibold'
                              : horsMois ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {jour.getDate()}
                          </span>
                        </div>

                        {visibles.map((it) => (
                          <Link
                            key={it.id}
                            href={`/dashboard/rdv/${it.id}`}
                            className={`block mb-1 px-1.5 py-1 rounded text-[11px] leading-tight truncate hover:opacity-80 transition-opacity ${
                              TEINTE[it.statut] || TEINTE.scheduled
                            }`}
                            title={`${it.heure} — ${it.qui}${it.quoi ? ` · ${it.quoi}` : ''}`}
                          >
                            <span className="font-medium">{it.heure}</span> {it.qui}
                          </Link>
                        ))}

                        {items.length > 3 && !deplie && (
                          <button
                            onClick={() => setJourDeplie(cle)}
                            className="text-[11px] text-gray-500 hover:text-gray-900 px-1.5 transition-colors"
                          >
                            +{items.length - 3}
                          </button>
                        )}
                        {deplie && (
                          <button
                            onClick={() => setJourDeplie(null)}
                            className="text-[11px] text-gray-400 hover:text-gray-700 px-1.5 transition-colors"
                          >
                            Réduire
                          </button>
                        )}

                        {/* Jour vide : on renvoie sur la liste, qui porte la
                            création. L'agenda ne crée rien (règle 1). */}
                        {items.length === 0 && !horsMois && (
                          <Link
                            href="/dashboard/rdv"
                            className="block h-8 rounded hover:bg-gray-50 transition-colors"
                            aria-label={`Aucun rendez-vous le ${jour.getDate()} ${MOIS[jour.getMonth()]}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── Mobile : la même chose, en liste par jour ── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {semaines.flat()
                .filter((j) => j.getMonth() === mois.getMonth() && (parJour[cleDe(j)] || []).length > 0)
                .map((jour) => {
                  const cle = cleDe(jour);
                  return (
                    <div key={cle} className="p-3">
                      <p className={`text-xs font-medium mb-2 ${cle === cleAujourdhui ? 'text-gray-900' : 'text-gray-500'}`}>
                        {JOURS[(jour.getDay() + 6) % 7]} {jour.getDate()} {MOIS[jour.getMonth()]}
                        {cle === cleAujourdhui && ' · aujourd’hui'}
                      </p>
                      {(parJour[cle] || []).map((it) => (
                        <Link
                          key={it.id}
                          href={`/dashboard/rdv/${it.id}`}
                          className="flex items-center gap-3 py-2"
                        >
                          <span className="text-xs font-mono text-gray-500 w-11 flex-shrink-0">{it.heure}</span>
                          <span className="min-w-0">
                            <span className="block text-sm text-gray-900 truncate">{it.qui}</span>
                            {it.quoi && <span className="block text-xs text-gray-500 truncate">{it.quoi}</span>}
                          </span>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              {semaines.flat().every((j) => j.getMonth() !== mois.getMonth() || (parJour[cleDe(j)] || []).length === 0) && (
                <p className="p-4 text-sm text-gray-500">
                  Aucun rendez-vous en {MOIS[mois.getMonth()]}.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

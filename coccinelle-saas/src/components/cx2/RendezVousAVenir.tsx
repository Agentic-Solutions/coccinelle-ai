'use client';

/**
 * « Rendez-vous à venir » — carte posée en haut de « Mes clients »
 * (chantier NAVIGATION, 14/08/2026).
 *
 * POURQUOI ELLE EXISTE
 * La nouvelle navigation retire « Rendez-vous » du menu : les rendez-vous
 * vivent désormais dans « Mes clients ». C'est le pari le plus risqué du
 * chantier — un garagiste qui cherche son planning ne pense pas forcément à
 * « Mes clients ». Cette carte est le filet : elle doit être visible SANS
 * DÉFILER, pour que la réponse arrive avant la question.
 *
 * Écart assumé avec la maquette : elle y occupe la colonne de droite, à côté de
 * la liste des clients. Ici elle est en pleine largeur, juste sous l'en-tête.
 * La consigne « en haut, visible sans défiler » prime, et la page existante
 * (817 lignes) n'aurait pas supporté une refonte en deux colonnes sans risque.
 *
 * L'API trie en DESC (les plus récents d'abord) : on retrie ici, sinon
 * « à venir » afficherait le rendez-vous le plus lointain en premier.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CX2, POLICE_MONO } from './theme';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface RendezVous {
  id: string;
  scheduled_at: string;
  status?: string | null;
  prospect_name?: string | null;
  customer_name?: string | null;
  service_name?: string | null;
  notes?: string | null;
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * `scheduled_at` est une date-heure NAÏVE et déjà locale (règle 10quinquies) :
 * la relire avec `new Date()` puis la reformater avec un fuseau ajoute deux
 * heures en été. On lit les composantes du texte telles quelles.
 */
function composantes(brut: string) {
  const m = String(brut || '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  const [, a, mo, j, h, mi] = m;
  return {
    cle: `${a}-${mo}-${j}`,
    heure: `${h}:${mi}`,
    // Date locale construite composante par composante : jamais d'UTC.
    date: new Date(Number(a), Number(mo) - 1, Number(j)),
  };
}

function libelleJour(d: Date): string {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const ecart = Math.round((d.getTime() - aujourdhui.getTime()) / 86400000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return 'Demain';
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export default function RendezVousAVenir() {
  const [rdv, setRdv] = useState<RendezVous[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const debut = new Date();
        const fin = new Date();
        fin.setDate(fin.getDate() + 3);
        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const res = await fetch(
          buildApiUrl(`/api/v1/appointments?date_from=${iso(debut)}&date_to=${iso(fin)}`),
          { headers: getAuthHeaders() },
        );
        const corps = await res.json();
        const liste: RendezVous[] = corps?.appointments || corps?.data || [];
        setRdv(liste.slice().sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at))));
      } catch {
        setRdv([]);
      }
    })();
  }, []);

  const groupes: { jour: string; items: { heure: string; qui: string; quoi: string; id: string }[] }[] = [];
  for (const r of rdv || []) {
    const c = composantes(r.scheduled_at);
    if (!c) continue;
    const jour = libelleJour(c.date);
    let groupe = groupes.find((g) => g.jour === jour);
    if (!groupe) { groupe = { jour, items: [] }; groupes.push(groupe); }
    groupe.items.push({
      id: r.id,
      heure: c.heure,
      qui: r.prospect_name || r.customer_name || 'Client',
      quoi: r.service_name || r.notes || 'Rendez-vous',
    });
  }

  return (
    <section
      style={{
        background: CX2.surface,
        border: `1px solid ${CX2.bordure}`,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: CX2.encre }}>Rendez-vous à venir</h2>
          <span style={{ fontSize: 13, color: CX2.texteTertiaire }}>Les 3 prochains jours</span>
        </span>
        <Link
          href="/dashboard/rdv"
          style={{ fontSize: 13, color: CX2.texteSecondaire, textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Tout voir
        </Link>
      </div>

      {rdv === null && (
        <div style={{ padding: '13px 22px', borderTop: `1px solid ${CX2.separateur}`, fontSize: 13.5, color: CX2.texteDiscret }}>
          Chargement…
        </div>
      )}

      {rdv !== null && groupes.length === 0 && (
        <div style={{ padding: '13px 22px 18px', borderTop: `1px solid ${CX2.separateur}`, fontSize: 13.5, color: CX2.texteDiscret }}>
          Aucun rendez-vous dans les trois prochains jours.
        </div>
      )}

      {groupes.map((g) => (
        <div key={g.jour}>
          <div style={{
            padding: '13px 22px 7px', borderTop: `1px solid ${CX2.separateur}`,
            fontSize: 11.5, fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: CX2.texteDiscret,
          }}>
            {g.jour}
          </div>
          {g.items.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14,
                alignItems: 'center', padding: '11px 22px',
              }}
            >
              <span style={{ fontSize: 13, color: CX2.texteSecondaire, fontFamily: POLICE_MONO, whiteSpace: 'nowrap' }}>
                {it.heure}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 500, color: CX2.encre }}>{it.qui}</span>
                <span style={{ fontSize: 13, color: CX2.texteTertiaire }}>{it.quoi}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

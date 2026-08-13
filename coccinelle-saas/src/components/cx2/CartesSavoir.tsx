'use client';

/**
 * Colonne droite de « Ce que sait votre assistant » (chantier CX-2) :
 * Ajouter une information · Vos informations · Historique.
 *
 * Les trois cartes partagent la même géométrie (padding 22, radius 14, bordure
 * #e2e2de) : elles sont donc rendues ici ensemble plutôt que dans trois fichiers
 * qui divergeraient au premier ajustement.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Link2, Loader2 } from 'lucide-react';
import { CX2, POLICE_MONO, STYLE_CARTE } from './theme';
import type { Modification } from '@/lib/cx2-api';

const TITRE: React.CSSProperties = {
  margin: 0, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em',
};

const BOUTON_BORDE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px',
  border: `1px solid ${CX2.bordure}`, borderRadius: '9px', background: CX2.surface,
  fontSize: '13.5px', fontWeight: 500, color: CX2.encre, cursor: 'pointer',
};

/** Extensions lisibles dans le navigateur. Voir le commentaire du dépôt. */
const EXTENSIONS = ['.txt', '.csv', '.md', '.tsv'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ajouter une information
// ─────────────────────────────────────────────────────────────────────────────
export function CarteAjouter({
  brouillon, setBrouillon, onImporterSite, occupe,
}: {
  brouillon: string;
  setBrouillon: (v: string) => void;
  onImporterSite: (url: string) => void;
  occupe?: boolean;
}) {
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Le dépôt de fichier est lu CÔTÉ NAVIGATEUR et collé dans le champ : la
  // route d'upload répond 501 et le multipart est bloqué avant même d'atteindre
  // le Worker (mémoire multipart-post-edge-block). Le client voit son contenu
  // avant de l'enregistrer, ce qui vaut mieux qu'un envoi opaque.
  const lireFichier = async (fichiers: FileList | null) => {
    setErreur(null);
    const f = fichiers?.[0];
    if (!f) return;
    const ok = EXTENSIONS.some((e) => f.name.toLowerCase().endsWith(e));
    if (!ok) {
      setErreur(`Formats acceptés : ${EXTENSIONS.join(', ')}. Vous pouvez aussi coller le texte.`);
      return;
    }
    const texte = await f.text();
    setBrouillon(brouillon ? `${brouillon}\n${texte}` : texte);
  };

  return (
    <section style={{ ...STYLE_CARTE, padding: '22px' }}>
      <h2 style={{ ...TITRE, marginBottom: '14px' }}>Ajouter une information</h2>

      <textarea
        rows={3}
        value={brouillon}
        onChange={(e) => setBrouillon(e.target.value)}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); lireFichier(e.dataTransfer.files); }}
        placeholder="Collez un texte, glissez un fichier ou tapez une info"
        style={{
          width: '100%', resize: 'none',
          border: `1px solid ${survol ? CX2.encre : CX2.bordure}`,
          borderRadius: '10px', padding: '13px 15px', fontSize: '14.5px',
          lineHeight: 1.5, background: survol ? CX2.surlignage : CX2.champFond,
          color: CX2.encre,
        }}
      />

      {erreur && (
        <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: CX2.encreSurvol }}>{erreur}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        <button
          type="button"
          disabled={occupe}
          style={BOUTON_BORDE}
          onClick={() => {
            const url = window.prompt('Adresse de votre site (ex. https://mon-garage.fr)');
            if (url) onImporterSite(url.trim());
          }}
        >
          {occupe ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Importer depuis votre site
        </button>

        <Link href="/dashboard/knowledge" style={{ ...BOUTON_BORDE, textDecoration: 'none' }}>
          <span style={{
            width: 18, height: 18, border: `1px solid #dcdbd6`, borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: CX2.texteSecondaire,
          }}>G</span>
          Connecter Google Business
        </Link>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: CX2.texteDiscret }}>
        Remplissez votre base en 30 secondes
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Vos informations
// ─────────────────────────────────────────────────────────────────────────────
export interface Filtre { label: string; count: number }

export function CarteInformations({
  total, filtres, diff, onPrevisualiser, onAppliquer, onAnnuler,
}: {
  total: number;
  filtres: Filtre[];
  diff: {
    prixModifies: number;
    apercu: boolean;
    modifications: { libelle: string; avant: string | null; apres: string | null; type: string }[];
  } | null;
  onPrevisualiser: () => void;
  onAppliquer: () => void;
  onAnnuler: () => void;
}) {
  return (
    <section style={{ ...STYLE_CARTE, padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
        <h2 style={TITRE}>Vos informations</h2>
        <Link
          href="/dashboard/knowledge"
          style={{
            fontSize: '13px', fontWeight: 500, textDecoration: 'underline',
            textUnderlineOffset: '3px', color: CX2.encre,
          }}
        >
          Tout voir
        </Link>
      </div>

      <p style={{ margin: '6px 0 14px', fontSize: '13.5px', color: CX2.texteSecondaire }}>
        {total} fiche{total > 1 ? 's' : ''} active{total > 1 ? 's' : ''}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
        {filtres.map((f) => (
          <span key={f.label} style={{
            border: `1px solid ${CX2.bordureFine}`, borderRadius: '999px',
            padding: '6px 12px', fontSize: '12.5px', color: CX2.encreSurvol,
          }}>
            {f.label}{' '}
            <span style={{ color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>{f.count}</span>
          </span>
        ))}
      </div>

      {diff && (
        <div style={{
          marginTop: '16px', border: `1px solid ${CX2.importBordure}`,
          background: CX2.importFond, borderRadius: '10px', padding: '13px 15px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '13.5px' }}>
            Import détecté : <strong style={{ fontWeight: 600 }}>
              {diff.prixModifies} prix modifié{diff.prixModifies > 1 ? 's' : ''}
            </strong>
          </span>
          <span style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
            <button type="button" onClick={onPrevisualiser} style={{
              padding: '7px 12px', border: `1px solid ${CX2.importBouton}`, borderRadius: '8px',
              background: CX2.surface, fontSize: '12.5px', fontWeight: 500,
              color: CX2.encre, cursor: 'pointer',
            }}>Prévisualiser</button>
            <button type="button" onClick={onAppliquer} style={{
              padding: '7px 12px', border: 'none', borderRadius: '8px',
              background: CX2.encre, color: CX2.surface, fontSize: '12.5px',
              fontWeight: 500, cursor: 'pointer',
            }}>Appliquer</button>
            {/* « Annuler » ne figure pas dans la maquette : le brief le demande,
                il est donc rendu en action texte discrète, jamais en bouton
                plein qui concurrencerait « Appliquer ». */}
            <button type="button" onClick={onAnnuler} style={{
              border: 'none', background: 'transparent', padding: '7px 4px',
              fontSize: '12.5px', fontWeight: 500, color: CX2.texteSecondaire,
              cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px',
            }}>Annuler</button>
          </span>
        </div>
      )}

      {/* L'aperçu vient du normalisateur du serveur, sans aucune écriture :
          ce qui est listé ici est exactement ce que « Appliquer » produira. */}
      {diff?.apercu && (
        <div style={{
          marginTop: '10px', border: `1px solid ${CX2.bordureFine}`, borderRadius: '10px',
          padding: '12px 14px', background: CX2.champFond, maxHeight: 220, overflowY: 'auto',
        }}>
          {diff.modifications.map((m, i) => (
            <div key={i} style={{ fontSize: '13px', color: CX2.encreSurvol, padding: '3px 0' }}>
              {m.type === 'ajout' && <span style={{ color: CX2.texteDiscret }}>nouveau · </span>}
              {m.type === 'suppression' && <span style={{ color: CX2.texteDiscret }}>retiré · </span>}
              {m.libelle}{' '}
              <span style={{ fontFamily: POLICE_MONO }}>
                {m.avant || '—'} → {m.apres || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Historique
// ─────────────────────────────────────────────────────────────────────────────
export function CarteHistorique({
  modifications, onRestaurer, onVoirCorbeille, occupe,
}: {
  modifications: Modification[];
  onRestaurer: (versionId: number) => void;
  onVoirCorbeille: () => void;
  occupe?: boolean;
}) {
  return (
    <section style={{ ...STYLE_CARTE, padding: '22px' }}>
      <h2 style={{ ...TITRE, marginBottom: '14px' }}>Historique</h2>

      {modifications.length === 0 ? (
        <p style={{ margin: 0, fontSize: '13.5px', color: CX2.texteDiscret }}>
          Aucune modification pour l&apos;instant.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {modifications.map((m) => (
            <div key={m.version_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', padding: '12px 14px', border: `1px solid ${CX2.bordureFine}`,
              borderRadius: '10px', background: CX2.champFond,
            }}>
              <span style={{ fontSize: '13.5px', color: CX2.encreSurvol }}>
                {resumeLisible(m)}
              </span>
              <button
                type="button"
                disabled={occupe}
                onClick={() => onRestaurer(m.version_id)}
                style={{
                  flex: '0 0 auto', border: `1px solid #dcdbd6`, background: CX2.surface,
                  borderRadius: '8px', padding: '6px 12px', fontSize: '12.5px',
                  fontWeight: 500, color: CX2.encre, cursor: occupe ? 'default' : 'pointer',
                }}
              >
                Restaurer
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onVoirCorbeille}
        style={{
          display: 'inline-block', marginTop: '12px', border: 'none', background: 'transparent',
          padding: 0, fontSize: '13px', fontWeight: 500, color: CX2.encre, cursor: 'pointer',
          textDecoration: 'underline', textUnderlineOffset: '3px',
        }}
      >
        Supprimées récemment (30 jours)
      </button>
    </section>
  );
}

/** « Vidange 79 € → 85 € le 11/08 » — le format de la maquette. */
function resumeLisible(m: Modification): React.ReactNode {
  const jour = m.date ? m.date.slice(8, 10) + '/' + m.date.slice(5, 7) : '';
  const r = m.resume;
  if (!r || !r.libelle) {
    return <>{m.document_titre} modifié{jour && ` le ${jour}`}</>;
  }
  return (
    <>
      {r.libelle}{' '}
      <span style={{ fontFamily: POLICE_MONO }}>
        {r.avant || '—'} → {r.apres || '—'}
      </span>
      {jour && ` le ${jour}`}
    </>
  );
}

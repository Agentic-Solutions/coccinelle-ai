'use client';

/**
 * Bulles du fil de test (chantier CX-2).
 *
 * Client à droite (blanche, bordée, coin bas-droit rentré), assistant à gauche
 * (grise, coin bas-gauche rentré, avatar portant l'initiale du prénom) —
 * disposition et rayons repris du template des maquettes.
 *
 * Sous une réponse : la source, puis Modifier et Supprimer. Les deux actions
 * disparaissent quand la réponse ne vient d'aucun document corrigeable (une
 * entrée de FAQ, les coordonnées de l'entreprise, un repli) : proposer une
 * action qui échouera est pire que ne rien proposer.
 */

import ValeurEditable from './ValeurEditable';
import { CX2, POLICE_MONO } from './theme';

export interface SourceReponse {
  type?: string;
  document_id?: string | null;
  chunk_id?: string | null;
  titre?: string | null;
  libelle?: string | null;
  prix?: string | null;
  ligne?: number | null;
  modifiable?: boolean;
  label?: string | null;
}

/**
 * Découpe une réponse pour rendre ses MONTANTS cliquables.
 * On ne touche qu'aux montants : ce sont eux que le client vient vérifier, et
 * eux dont une erreur coûte un rendez-vous.
 */
export function decouperMontants(texte: string): { texte: string; montant: boolean }[] {
  const motif = /(\d[\d\s.,]*\s*(?:euros?|€|EUR)\b)/gi;
  const morceaux: { texte: string; montant: boolean }[] = [];
  let dernier = 0;
  for (const m of String(texte || '').matchAll(motif)) {
    const i = m.index ?? 0;
    if (i > dernier) morceaux.push({ texte: texte.slice(dernier, i), montant: false });
    morceaux.push({ texte: m[0], montant: true });
    dernier = i + m[0].length;
  }
  if (dernier < texte.length) morceaux.push({ texte: texte.slice(dernier), montant: false });
  return morceaux.length ? morceaux : [{ texte, montant: false }];
}

const BULLE_COMMUN: React.CSSProperties = {
  borderRadius: '14px',
  padding: '14px 17px',
  fontSize: '15.5px',
  lineHeight: 1.6,
};

export function BulleClient({ texte }: { texte: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        ...BULLE_COMMUN,
        maxWidth: '74%',
        background: CX2.surface,
        border: `1px solid ${CX2.bordure}`,
        borderBottomRightRadius: '4px',
        color: CX2.encreSurvol,
      }}>
        {texte}
      </div>
    </div>
  );
}

interface PropsAssistant {
  texte: string;
  initiale: string;
  source?: SourceReponse | null;
  /** Correction d'un montant : renvoie la valeur saisie. */
  onCorriger?: (nouvelle: string) => void;
  onModifier?: () => void;
  onSupprimer?: () => void;
  /** Vrai pendant que la bulle est rejouée après une correction. */
  enCours?: boolean;
}

export function BulleAssistant({
  texte, initiale, source, onCorriger, onModifier, onSupprimer, enCours,
}: PropsAssistant) {
  const corrigeable = !!(source?.modifiable && source?.chunk_id && onCorriger);
  const actions = !!(source?.document_id);

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '82%' }}>
      <span style={{
        flex: '0 0 auto', width: 30, height: 30, marginTop: 4, borderRadius: 999,
        background: CX2.encre, color: CX2.surface, fontSize: '12px', fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{initiale}</span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
        <div style={{
          ...BULLE_COMMUN,
          background: CX2.bulleAssistant,
          borderBottomLeftRadius: '4px',
          opacity: enCours ? 0.55 : 1,
          transition: 'opacity .15s',
        }}>
          {decouperMontants(texte).map((m, i) => (
            m.montant && corrigeable
              ? <ValeurEditable
                  key={i}
                  valeur={m.texte.trim()}
                  modifiable
                  onValider={(v) => onCorriger!(v)}
                  titre="Cliquez pour corriger ce montant"
                />
              : <span key={i}>{m.texte}</span>
          ))}
        </div>

        {(source?.label || actions) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            flexWrap: 'wrap', paddingLeft: '4px',
          }}>
            {source?.label && (
              <span style={{ fontSize: '12.5px', color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>
                Source : {source.label}
              </span>
            )}
            {actions && (
              <span style={{ display: 'flex', gap: '10px' }}>
                <BoutonTexte onClick={onModifier}>Modifier</BoutonTexte>
                <BoutonTexte onClick={onSupprimer}>Supprimer</BoutonTexte>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BoutonTexte({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 'none', background: 'transparent', padding: 0, fontSize: '12.5px',
        fontWeight: 500, color: CX2.texteSecondaire, cursor: 'pointer',
        textDecoration: 'underline', textUnderlineOffset: '3px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = CX2.encre; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = CX2.texteSecondaire; }}
    >
      {children}
    </button>
  );
}

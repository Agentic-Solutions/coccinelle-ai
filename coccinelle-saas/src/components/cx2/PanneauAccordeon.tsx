'use client';

/**
 * Carte dépliante de la colonne droite de « Mon Assistant » (chantier CX-2).
 *
 * UN SEUL panneau ouvert à la fois : l'état vit chez le parent, la carte ne
 * fait que l'afficher. C'est ce qui permet à un mot cliqué dans la conversation
 * d'ouvrir le bon panneau — et de refermer celui d'avant.
 *
 * La carte ouverte prend une bordure noire : sans ce repère, en cliquant sur
 * « à votre écoute » on ne voit pas lequel des quatre panneaux a répondu.
 */

import { ChevronDown } from 'lucide-react';
import { CX2 } from './theme';

interface Props {
  titre: string;
  /** Résumé affiché à droite du titre, replié (« 06 12 34 56 78 », « 4 canaux »). */
  resume?: string;
  ouvert: boolean;
  onBasculer: () => void;
  children: React.ReactNode;
}

export default function PanneauAccordeon({ titre, resume, ouvert, onBasculer, children }: Props) {
  return (
    <section style={{
      background: CX2.surface,
      border: `1px solid ${ouvert ? CX2.encre : CX2.bordure}`,
      borderRadius: '14px',
    }}>
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouvert}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', padding: '18px 22px', border: 'none', background: 'transparent',
          cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = CX2.champFond; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Le titre ne se coupe jamais ; c'est le résumé qui s'efface quand la
            colonne est étroite — il répète une information déjà visible une
            fois le panneau ouvert. */}
        <span style={{ fontSize: '15.5px', fontWeight: 500, whiteSpace: 'nowrap' }}>{titre}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {resume && (
            <span style={{
              fontSize: '13px', color: CX2.texteTertiaire, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{resume}</span>
          )}
          <ChevronDown
            size={15}
            color={CX2.texteDiscret}
            style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
          />
        </span>
      </button>
      {ouvert && children}
    </section>
  );
}

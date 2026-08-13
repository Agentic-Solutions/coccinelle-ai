'use client';

/**
 * Suggestions de questions (chantier CX-2).
 *
 * Cinq au maximum, générées côté serveur depuis le secteur du tenant ET le
 * contenu réel de sa base : on ne suggère que ce qui a une réponse. Une chip
 * utilisée est remplacée par une autre — le serveur tient la réserve, le front
 * lui dit seulement ce qu'il a déjà servi.
 *
 * « Autres questions ↻ » n'est pas dans la maquette : le brief le demande, il
 * est donc rendu comme une chip SANS bordure, à la fin de la rangée. C'est la
 * lecture la plus fidèle de « discret ».
 */

import { CX2 } from './theme';
import type { Suggestion } from '@/lib/cx2-api';

interface Props {
  suggestions: Suggestion[];
  restantes: number;
  onChoisir: (s: Suggestion) => void;
  onRenouveler: () => void;
  occupe?: boolean;
}

export default function ChipsSuggestions({
  suggestions, restantes, onChoisir, onRenouveler, occupe,
}: Props) {
  if (!suggestions.length) return null;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '8px',
      paddingBottom: '22px', borderBottom: `1px solid ${CX2.separateur}`,
    }}>
      {suggestions.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={occupe}
          onClick={() => onChoisir(s)}
          style={{
            padding: '8px 14px',
            border: `1px solid ${CX2.bordure}`,
            borderRadius: '999px',
            background: CX2.surface,
            fontSize: '13.5px',
            fontWeight: 500,
            color: CX2.encreSurvol,
            cursor: occupe ? 'default' : 'pointer',
            opacity: occupe ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (occupe) return;
            e.currentTarget.style.borderColor = CX2.encre;
            e.currentTarget.style.color = CX2.encre;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = CX2.bordure;
            e.currentTarget.style.color = CX2.encreSurvol;
          }}
        >
          {s.label}
        </button>
      ))}

      {restantes > 0 && (
        <button
          type="button"
          onClick={onRenouveler}
          disabled={occupe}
          style={{
            padding: '8px 10px',
            border: 'none',
            background: 'transparent',
            fontSize: '13.5px',
            fontWeight: 500,
            color: CX2.texteSecondaire,
            cursor: occupe ? 'default' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!occupe) e.currentTarget.style.color = CX2.encre; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = CX2.texteSecondaire; }}
          title={`${restantes} autre(s) question(s) disponible(s)`}
        >
          Autres questions ↻
        </button>
      )}
    </div>
  );
}

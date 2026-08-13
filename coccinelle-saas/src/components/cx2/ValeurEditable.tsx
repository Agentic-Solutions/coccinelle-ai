'use client';

/**
 * Une valeur extraite d'une réponse, corrigeable sur place (chantier CX-2).
 *
 * Lecture : surlignée + soulignée de pointillés, cliquable.
 * Édition : un champ de la largeur de la valeur, Entrée ou Échap valide, le
 * flou aussi. Une valeur vidée n'est pas validée — c'est la garde de la
 * maquette, et elle a une raison : une prestation sans prix ferait dire
 * n'importe quoi à l'assistant.
 */

import { useEffect, useRef, useState } from 'react';
import { STYLE_VALEUR, STYLE_CHAMP_LIGNE } from './theme';

interface Props {
  valeur: string;
  /** Faux quand l'information ne se corrige pas ligne à ligne (texte rédigé). */
  modifiable: boolean;
  onValider: (nouvelle: string) => void;
  titre?: string;
}

export default function ValeurEditable({ valeur, modifiable, onValider, titre }: Props) {
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(valeur);
  const champ = useRef<HTMLInputElement>(null);

  // La valeur peut changer sous nos pieds : la bulle est rejouée après une
  // correction, et c'est la réponse RÉELLE de l'assistant qui revient — pas
  // forcément ce qui a été tapé.
  useEffect(() => { setBrouillon(valeur); }, [valeur]);

  useEffect(() => {
    if (edition) champ.current?.focus();
  }, [edition]);

  if (!modifiable) return <>{valeur}</>;

  if (!edition) {
    return (
      <span
        style={STYLE_VALEUR}
        onClick={() => setEdition(true)}
        title={titre || 'Cliquez pour corriger'}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEdition(true); } }}
      >
        {valeur}
      </span>
    );
  }

  const valider = () => {
    const propre = brouillon.trim();
    if (!propre) { setBrouillon(valeur); setEdition(false); return; }
    setEdition(false);
    if (propre !== valeur) onValider(propre);
  };

  return (
    <input
      ref={champ}
      value={brouillon}
      size={Math.max(4, brouillon.length)}
      style={STYLE_CHAMP_LIGNE}
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === 'Enter') valider();
        if (e.key === 'Escape') { setBrouillon(valeur); setEdition(false); }
      }}
      aria-label="Corriger la valeur"
    />
  );
}

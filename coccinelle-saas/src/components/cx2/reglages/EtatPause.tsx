'use client';

/**
 * ⚠️ CE FICHIER N'EST MONTÉ NULLE PART, ET C'EST VOULU.
 *
 * La maquette prévoit, quand le compte est en pause, une carte jaune en tête de
 * Réglages et un bandeau permanent en haut du tableau de bord. Les deux sont
 * écrits ici, prêts, mais AUCUNE page ne les importe.
 *
 * POURQUOI : la pause n'existe pas côté serveur. `resolve-phone` ne regarde pas
 * le statut du tenant qu'il vient de résoudre, et si la résolution échoue,
 * l'agent décroche quand même avec un prompt générique. Afficher « Votre
 * assistant est en pause » pendant qu'il répond aux clients serait le pire des
 * deux mondes : le client cesse de surveiller sa ligne parce qu'on lui a dit
 * qu'elle était coupée.
 *
 * CONDITION DE MONTAGE — les trois, pas deux :
 *   1. une colonne d'état de pause sur `tenants`, écrite par une route dédiée ;
 *   2. `resolve-phone` qui refuse de résoudre un tenant en pause ;
 *   3. l'agent Python qui raccroche (ou joue le message d'absence) quand
 *      `resolve-phone` répond « en pause » — et non son repli générique actuel.
 *
 * Tant que les trois ne sont pas là, ce fichier reste non importé. S'il est
 * encore orphelin dans six mois, la bonne décision est de le supprimer :
 * du code prêt pour une brique jamais construite est du code mort.
 *
 * Chiffrage de la brique : 4,5–5,5 j (voir design/navigation/PLAN-NAVIGATION.md).
 */

import { CX2 } from '../theme';

/** Carte à poser en TÊTE de Réglages quand le compte est en pause. */
export function CarteEnPause({ jusquAu, onReprendre }: { jusquAu?: string; onReprendre: () => void }) {
  return (
    <section
      style={{
        background: CX2.importFond,
        border: `1px solid ${CX2.importBordure}`,
        borderRadius: 14,
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: CX2.encre }}>
          Votre assistant est en pause
        </span>
        <span style={{ fontSize: 13.5, color: CX2.texteSecondaire, lineHeight: 1.5 }}>
          Il ne décroche plus{jusquAu ? ` jusqu'au ${jusquAu}` : ''}. Vos données et votre
          numéro sont conservés, votre abonnement continue.
        </span>
      </div>
      <button
        type="button"
        onClick={onReprendre}
        style={{
          padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 500,
          border: 'none', background: CX2.encre, color: CX2.surface,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Reprendre les appels
      </button>
    </section>
  );
}

/** Bandeau permanent en tête de tableau de bord, tant que la pause dure. */
export function BandeauEnPause({ onReprendre }: { onReprendre: () => void }) {
  return (
    <div
      style={{
        background: CX2.importFond,
        borderBottom: `1px solid ${CX2.importBordure}`,
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontSize: 13.5,
        color: CX2.encre,
      }}
    >
      <span>Votre assistant est en pause — il ne répond plus au téléphone.</span>
      <button
        type="button"
        onClick={onReprendre}
        style={{
          border: 'none', background: 'transparent', padding: 0,
          fontSize: 13.5, fontWeight: 500, color: CX2.encre,
          textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
        }}
      >
        Reprendre
      </button>
    </div>
  );
}

'use client';

/**
 * Barre d'enregistrement collante (chantier PRENOM, 18/08/2026).
 *
 * ── POURQUOI ──
 * Le bouton « Enregistrer » etait en haut de page et sortait du champ de vision des
 * qu'on descendait. Youssef a lui-meme saisi un prenom sans jamais l'enregistrer, puis
 * conclu que l'ecriture etait cassee — elle ne l'etait pas. Un bouton qu'on ne voit
 * plus est un bouton qui n'existe pas, et un garagiste fera la meme chose.
 *
 * La barre n'apparait QUE s'il existe une modification non enregistree : sur une page
 * consultee sans etre modifiee, elle ne mange pas de hauteur utile. C'est aussi ce qui
 * la rend informative — sa presence signale « vous avez quelque chose a enregistrer ».
 *
 * ⚠️ Montee sur DEUX pages seulement (« Mon assistant » et la configuration avancee).
 * La generaliser a tout le dashboard sortirait du lot, et chaque page a sa propre
 * notion de « modifie ».
 *
 * ⚠️ 20/08/2026 — cette phrase etait FAUSSE pendant deux jours : le composant n'etait
 * monte que sur « Mon assistant ». La configuration avancee a ete signalee exactement
 * pour ce qu'il manquait (« il faut scroller pour voir Enregistrer »), et la mesure a
 * montre que son `sticky top-0` tenait pourtant : ce n'etait pas la position du bouton
 * du haut qui manquait, c'etait le signal « vous avez quelque chose a enregistrer ».
 * Un commentaire qui decrit une intention plutot qu'un fait rend le manque invisible —
 * `grep BarreEnregistrement` disait la verite, pas cet entete.
 *
 * ⚠️ Le bouton du haut a ete SUPPRIME de « Mon assistant » au profit de celle-ci :
 * deux boutons identiques a deux endroits sont pires que l'actuel — on ne sait plus
 * lequel fait foi, et l'un des deux finit par diverger. La configuration avancee garde
 * le sien : son header porte aussi « Simuler » et « Sequences », et le groupe d'actions
 * de l'agent perdrait son action principale.
 */

import { Loader2 } from 'lucide-react';

export default function BarreEnregistrement({
  visible,
  enregistrement,
  onEnregistrer,
  message,
  onFermerMessage,
  libelle = 'Enregistrer',
}: {
  visible: boolean;
  enregistrement: boolean;
  onEnregistrer: () => void;
  message?: string | null;
  onFermerMessage?: () => void;
  libelle?: string;
}) {
  // Le message doit rester visible meme quand il n'y a plus rien a enregistrer :
  // c'est justement apres un enregistrement reussi qu'on veut le lire, et `visible`
  // vient de retomber a faux au meme instant.
  if (!visible && !message) return null;

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        marginTop: 18,
        padding: '12px 16px',
        background: '#ffffff',
        borderTop: '1px solid #e5e5e5',
        // L'ombre porte vers le HAUT : elle detache la barre du contenu qui defile
        // dessous, sinon on la lit comme la fin de la page.
        boxShadow: '0 -6px 18px -12px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 13.5, color: '#3d3d3d', flex: '1 1 auto', minWidth: 0 }}>
        {message || 'Modifications non enregistrées'}
        {message && onFermerMessage && (
          <button
            type="button"
            onClick={onFermerMessage}
            style={{
              marginLeft: 10, border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, color: '#6b6b6b', textDecoration: 'underline',
            }}
          >
            Fermer
          </button>
        )}
      </span>

      {visible && (
        <button
          type="button"
          onClick={onEnregistrer}
          disabled={enregistrement}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: '#111111', color: '#ffffff',
            fontSize: 14, fontWeight: 600,
            cursor: enregistrement ? 'default' : 'pointer',
            opacity: enregistrement ? 0.45 : 1,
            flex: '0 0 auto',
          }}
        >
          {enregistrement && <Loader2 size={15} className="animate-spin" />}
          {libelle}
        </button>
      )}
    </div>
  );
}

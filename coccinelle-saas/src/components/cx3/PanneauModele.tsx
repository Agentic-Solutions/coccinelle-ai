'use client';

/**
 * Édition bridée d'un gabarit de SMS — chantier CX-3, lot 2.
 *
 * « Un modèle modifié dans la page est celui qui part vraiment. » D'où trois
 * garde-fous, décidés avant le code et tous appliqués AUSSI côté serveur — cette
 * page ne fait que les rendre lisibles, elle ne les fait pas respecter :
 *
 *   1. LES JETONS SONT VERROUILLÉS. `{date}`, `{heure}` et `{entreprise}` doivent
 *      rester : en retirer un est REFUSÉ, pas signalé. « RDV confirmé chez Garage
 *      Martin » sans heure est pire qu'un texte moins joli.
 *
 *   2. LA MESURE SE FAIT APRÈS SUBSTITUTION. « {date} » fait 6 caractères,
 *      « mercredi 20 août » en fait 16 : mesurer le gabarit ne mesure rien. Le
 *      compteur affiché est celui du texte final, plafonné à UN segment.
 *
 *   3. LE GSM-7 AVERTIT, IL NE REFUSE PAS. Le chemin d'envoi translittère déjà
 *      les caractères hors table (`compacterPourGsm7`) : « Contrôle » devient
 *      « Controle », tandis que « confirmé » et « à » restent intacts. Refuser
 *      serait une fausse contrainte. Mais un commerçant qui écrit « Contrôle
 *      Technique » a le droit de savoir que son SMS dira « Controle Technique »
 *      — d'où l'aperçu du texte RÉELLEMENT envoyé, et non de ce qu'il a tapé.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CX2, POLICE_MONO, STYLE_CARTE } from '@/components/cx2/theme';
import {
  enregistrerModele, verifierModele,
  type ControleModele, type ModeleMessage,
} from '@/lib/cx3-api';

export default function PanneauModele({
  modele, large, onEnregistre,
}: {
  modele: ModeleMessage;
  large: boolean;
  onEnregistre: (m: { corps: string; personnalise: boolean; controle: ControleModele }) => void;
}) {
  const [corps, setCorps] = useState(modele.corps);
  const [controle, setControle] = useState<ControleModele>(modele.controle);
  const [occupe, setOccupe] = useState(false);
  const [enregistre, setEnregistre] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le gabarit vient d'être rechargé (enregistrement, retour au défaut).
  useEffect(() => {
    setCorps(modele.corps);
    setControle(modele.controle);
  }, [modele.corps, modele.controle]);

  /**
   * Contrôle en différé, 400 ms après la dernière frappe.
   *
   * Côté serveur et non en local : la table GSM-7 et la règle des jetons vivent
   * dans `shared/sms-modeles.js`. Les recopier en TypeScript créerait la
   * deuxième vérité que tout ce module cherche à éviter — et c'est la version
   * serveur qui décide au moment d'enregistrer.
   */
  const saisir = useCallback((valeur: string) => {
    setCorps(valeur);
    setEnregistre(false);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(async () => {
      try {
        setControle(await verifierModele(modele.type, valeur));
      } catch { /* le contrôle au moment d'enregistrer tranchera */ }
    }, 400);
  }, [modele.type]);

  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  const soumettre = useCallback(async (reinitialiser = false) => {
    setOccupe(true);
    setErreurEnvoi(null);
    try {
      const r = await enregistrerModele(modele.type, reinitialiser ? { reinitialiser: true } : { corps });
      onEnregistre(r);
      setEnregistre(true);
    } catch (e) {
      setErreurEnvoi(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setOccupe(false);
    }
  }, [corps, modele.type, onEnregistre]);

  const modifie = corps.trim() !== modele.corps.trim();
  const bloque = !controle.valide || !modifie || occupe;

  return (
    <section style={{ ...STYLE_CARTE, border: `1px solid ${CX2.encre}`, padding: large ? '22px' : '18px 16px' }}>
      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
        {modele.libelle}
      </h2>
      <p style={{ margin: '7px 0 16px', fontSize: '13px', color: CX2.texteSecondaire }}>
        {modele.explication}
      </p>

      <label
        htmlFor="gabarit"
        style={{ display: 'block', fontSize: '13px', color: CX2.texteSecondaire, marginBottom: '7px' }}
      >
        Le message
      </label>
      <textarea
        id="gabarit"
        value={corps}
        onChange={(e) => saisir(e.target.value)}
        rows={4}
        spellCheck
        style={{
          width: '100%', border: `1px solid ${controle.valide ? CX2.bordure : CX2.encre}`,
          borderRadius: '10px', padding: '12px 14px', fontSize: '14.5px', lineHeight: 1.5,
          background: CX2.champFond, color: CX2.encre, font: 'inherit', resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />

      {/* ── Les jetons verrouillés ── */}
      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: CX2.texteDiscret }}>À conserver :</span>
        {modele.jetons.map((j) => {
          const present = corps.includes(j);
          return (
            <span
              key={j}
              title={present ? 'Présent dans le message' : 'Manquant — le message sera refusé'}
              style={{
                fontFamily: POLICE_MONO, fontSize: '12px', padding: '2px 7px', borderRadius: '5px',
                background: present ? CX2.surlignage : CX2.surface,
                border: `1px solid ${present ? CX2.surlignage : CX2.encre}`,
                color: CX2.encre, fontWeight: present ? 400 : 600,
              }}
            >
              {j}{present ? '' : ' manquant'}
            </span>
          );
        })}
        {modele.jetons_facultatifs.map((j) => (
          <span
            key={j}
            title="Facultatif : vide quand la prestation n’est pas nommée"
            style={{
              fontFamily: POLICE_MONO, fontSize: '12px', padding: '2px 7px', borderRadius: '5px',
              background: CX2.surface, border: `1px dashed ${CX2.bordure}`, color: CX2.texteTertiaire,
            }}
          >
            {j}
          </span>
        ))}
      </div>

      {/* ── Ce que le client lira, et ce que ça coûte ── */}
      <div style={{
        marginTop: '16px', background: CX2.champFond, border: `1px solid ${CX2.bordureFine}`,
        borderRadius: '11px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '7px',
      }}>
        <span style={{
          fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: CX2.texteDiscret,
        }}>
          Ce que votre client recevra
        </span>
        <span style={{ fontSize: '14px', lineHeight: 1.55 }}>
          {controle.apercuEnvoye || '—'}
        </span>
        <span style={{ fontSize: '12px', color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>
          {controle.unites} caractères · {controle.segments <= 1 ? '1 SMS' : `${controle.segments} SMS facturés`}
        </span>
      </div>

      {/* ── Refus : bloquants ── */}
      {controle.erreurs.map((e) => (
        <p key={e} style={{
          margin: '12px 0 0', fontSize: '13px', lineHeight: 1.5, color: CX2.encre,
          background: CX2.importFond, border: `1px solid ${CX2.importBordure}`,
          borderRadius: '9px', padding: '10px 12px',
        }}>
          {e}
        </p>
      ))}

      {/* ── Avertissements : ne bloquent pas ── */}
      {controle.avertissements.map((a) => (
        <p key={a} style={{ margin: '12px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: CX2.texteSecondaire }}>
          {a}
        </p>
      ))}

      {erreurEnvoi && (
        <p style={{ margin: '12px 0 0', fontSize: '13px', color: CX2.encre }}>{erreurEnvoi}</p>
      )}

      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => soumettre(false)}
          disabled={bloque}
          title={!modifie ? 'Rien n’a changé' : (!controle.valide ? 'Le message ne peut pas être enregistré tel quel' : 'Enregistrer')}
          style={{
            padding: '11px 20px', border: 'none', borderRadius: '10px',
            background: bloque ? CX2.bordure : CX2.encre,
            color: bloque ? CX2.texteTertiaire : CX2.surface,
            fontSize: '14px', fontWeight: 500, cursor: bloque ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', font: 'inherit',
          }}
        >
          {occupe && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Enregistrer
        </button>

        {/* Revenir au défaut SUPPRIME la ligne au lieu d'y écrire le texte
            d'origine : sinon le tenant reste figé sur la formulation du jour où
            il a cliqué, et ne bénéficie plus des corrections du défaut. */}
        {modele.personnalise && (
          <button
            type="button"
            onClick={() => soumettre(true)}
            disabled={occupe}
            style={{
              border: 'none', background: 'transparent', padding: 0, fontSize: '13px',
              color: CX2.texteSecondaire, cursor: 'pointer', textDecoration: 'underline',
              textUnderlineOffset: '3px', font: 'inherit',
            }}
          >
            Revenir au message d’origine
          </button>
        )}

        {enregistre && !modifie && (
          <span style={{ fontSize: '13px', color: CX2.texteSecondaire }}>
            Enregistré. Le prochain rendez-vous partira avec ce texte.
          </span>
        )}
      </div>
    </section>
  );
}

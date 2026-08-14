'use client';

/**
 * « Mettre en pause ou partir » — les trois niveaux d'arrêt, en bas de Réglages
 * (chantier NAVIGATION, 14/08/2026).
 *
 * TROIS NIVEAUX, VISUELLEMENT DISTINCTS — c'est tout l'enjeu : aujourd'hui, un
 * client qui veut juste souffler deux semaines n'a qu'un seul bouton, et c'est
 * « supprimer mon compte ». On perd un client là où il demandait une pause.
 *
 *   1. Pause          — la facturation continue, l'assistant se tait.
 *   2. Suspension     — la facturation s'arrête, 6 mois maximum, 5 €/mois pour
 *                       garder son numéro.
 *   3. Suppression    — définitif.
 *
 * CE QUI EST RÉELLEMENT BRANCHÉ : la suppression, et elle seule.
 * Pause et suspension sont affichées mais renvoient vers un échange humain.
 * Ce n'est pas de la décoration : la brique manque côté serveur. `resolve-phone`
 * ignore le statut du tenant qu'il vient de résoudre, et si la résolution
 * échoue, l'agent décroche quand même avec un prompt générique. Un bouton
 * « Pause » qui laisserait l'assistant répondre serait pire que pas de bouton :
 * le client croirait sa ligne coupée pendant qu'elle répond à ses clients.
 * Chiffré à 4,5–5,5 j — voir PLAN-NAVIGATION.md.
 *
 * LA SUPPRESSION RESTE TROUVABLE (RGPD) : elle n'est ni cachée ni grisée. Un
 * seul écran de rétention l'intercepte, avec DEUX BOUTONS DE POIDS ÉGAL — pas
 * de bouton « rester » en noir face à un lien « partir » en gris pâle. Retenir
 * quelqu'un en rendant la sortie pénible, c'est du dark pattern, et ça se paie
 * en avis clients.
 */

import { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import { CX2, POLICE_MONO } from '../theme';

const MAILTO = 'mailto:contact@coccinelle.ai';

export default function BlocsArret() {
  const [ecran, setEcran] = useState<'aucun' | 'retention' | 'suppression'>('aucun');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const supprimer = async () => {
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch(buildApiUrl('/api/v1/auth/account'), {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: motDePasse, confirmation }),
      });
      const corps = await res.json().catch(() => ({}));
      if (!res.ok || corps?.success === false) {
        throw new Error(corps?.error || 'Suppression refusée');
      }
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  };

  return (
    <section
      id="arret"
      style={{
        background: CX2.surface, border: `1px solid ${CX2.bordure}`,
        borderRadius: 14, padding: '24px 26px', scrollMarginTop: 24,
      }}
    >
      <h2 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
        Mettre en pause ou partir
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: CX2.texteTertiaire }}>
        Trois façons de lever le pied. Elles ne se valent pas.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <Niveau
          titre="Mettre mon assistant en pause"
          resume="Il ne décroche plus. Votre abonnement continue, vos données restent."
          detail="À utiliser pour quelques jours de fermeture. Vos clients entendent un message d'absence, ou votre ligne sonne dans le vide — à votre choix."
          ton="doux"
          action={{ libelle: 'Nous écrire', href: MAILTO }}
          note="Ce réglage se fait pour l'instant avec nous, le temps que nous le mettions en libre-service."
        />

        <Niveau
          titre="Suspendre mon abonnement"
          resume="La facturation s'arrête. 6 mois maximum, puis le compte reprend ou se ferme."
          detail="Pour une fermeture longue — saison creuse, congé, travaux. Vos données sont conservées. Gardez votre numéro de téléphone pour 5 € par mois ; sans cela, il repart au pot commun et ne pourra pas être récupéré."
          ton="doux"
          action={{ libelle: 'Nous écrire', href: MAILTO }}
          note="Ce réglage se fait pour l'instant avec nous, le temps que nous le mettions en libre-service."
        />

        <Niveau
          titre="Supprimer mon compte"
          resume="Définitif. Appels, clients, rendez-vous, enregistrements : tout est effacé."
          detail="Votre numéro est libéré immédiatement. Rien n'est récupérable, y compris par nous."
          ton="ferme"
          action={{ libelle: 'Continuer', onClick: () => setEcran('retention') }}
        />
      </div>

      {ecran === 'retention' && (
        <Rideau onFermer={() => setEcran('aucun')}>
          <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Avant de supprimer — une suspension suffirait peut-être
          </h3>
          <p style={{ margin: '0 0 6px', fontSize: 14.5, color: CX2.texteSecondaire, lineHeight: 1.55 }}>
            Suspendre arrête la facturation et garde tout en l'état : vos clients, vos
            rendez-vous, ce que votre assistant a appris. Vous reprenez quand vous voulez.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 14.5, color: CX2.texteSecondaire, lineHeight: 1.55 }}>
            Supprimer efface tout, y compris votre numéro, et personne ne peut le rétablir.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {['1 mois', '2 mois', '3 mois'].map((d) => (
              <a
                key={d}
                href={`${MAILTO}?subject=${encodeURIComponent(`Suspendre mon compte ${d}`)}`}
                style={{
                  padding: '9px 15px', border: `1px solid ${CX2.bordure}`, borderRadius: 999,
                  fontSize: 13.5, fontWeight: 500, color: CX2.encreSurvol,
                  background: CX2.surface, textDecoration: 'none',
                }}
              >
                Suspendre {d}
              </a>
            ))}
          </div>

          {/* Deux boutons de poids ÉGAL : même taille, même contraste. */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setEcran('aucun')}
              style={boutonEgal(false)}
            >
              Garder mon compte
            </button>
            <button
              type="button"
              onClick={() => setEcran('suppression')}
              style={boutonEgal(true)}
            >
              Supprimer quand même
            </button>
          </div>
        </Rideau>
      )}

      {ecran === 'suppression' && (
        <Rideau onFermer={() => setEcran('aucun')}>
          <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Supprimer définitivement
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 14.5, color: CX2.texteSecondaire, lineHeight: 1.55 }}>
            Saisissez votre mot de passe, puis tapez SUPPRIMER pour confirmer.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <input
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Votre mot de passe"
              style={champ}
            />
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
              placeholder="SUPPRIMER"
              style={{ ...champ, fontFamily: POLICE_MONO, letterSpacing: '0.08em' }}
            />
          </div>

          {erreur && (
            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#a33' }}>{erreur}</p>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setEcran('aucun')} style={boutonEgal(false)}>
              Annuler
            </button>
            <button
              type="button"
              disabled={occupe || !motDePasse || confirmation !== 'SUPPRIMER'}
              onClick={supprimer}
              style={{
                ...boutonEgal(true),
                opacity: occupe || !motDePasse || confirmation !== 'SUPPRIMER' ? 0.45 : 1,
                cursor: occupe ? 'default' : 'pointer',
              }}
            >
              {occupe ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </Rideau>
      )}
    </section>
  );
}

function Niveau({
  titre, resume, detail, ton, action, note,
}: {
  titre: string;
  resume: string;
  detail: string;
  ton: 'doux' | 'ferme';
  action: { libelle: string; href?: string; onClick?: () => void };
  note?: string;
}) {
  const ferme = ton === 'ferme';
  return (
    <div
      style={{
        border: `1px solid ${ferme ? '#e6cfcf' : CX2.bordure}`,
        background: ferme ? '#fdf8f8' : CX2.champFond,
        borderRadius: 12,
        padding: '16px 18px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: ferme ? '#7a2e2e' : CX2.encre }}>{titre}</span>
        <span style={{ fontSize: 13.5, color: CX2.texteSecondaire, lineHeight: 1.5 }}>{resume}</span>
        <span style={{ fontSize: 12.5, color: CX2.texteDiscret, lineHeight: 1.5 }}>{detail}</span>
        {note && (
          <span style={{ fontSize: 12.5, color: CX2.texteDiscret, fontStyle: 'italic', lineHeight: 1.5 }}>
            {note}
          </span>
        )}
      </div>
      {action.href ? (
        <a href={action.href} style={boutonNiveau(ferme)}>{action.libelle}</a>
      ) : (
        <button type="button" onClick={action.onClick} style={{ ...boutonNiveau(ferme), cursor: 'pointer' }}>
          {action.libelle}
        </button>
      )}
    </div>
  );
}

function Rideau({ children, onFermer }: { children: React.ReactNode; onFermer: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFermer}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(26,26,25,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CX2.surface, border: `1px solid ${CX2.bordure}`, borderRadius: 16,
          padding: '26px 28px', maxWidth: 520, width: '100%',
          maxHeight: '86vh', overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const champ: React.CSSProperties = {
  border: `1px solid ${CX2.bordure}`, borderRadius: 9, padding: '11px 13px',
  fontSize: 14.5, background: CX2.champFond, color: CX2.encre, width: '100%',
};

/** Deux issues, deux boutons de même taille et de même contraste perçu. */
function boutonEgal(sortie: boolean): React.CSSProperties {
  return {
    padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', minWidth: 168,
    border: `1px solid ${sortie ? '#c98f8f' : CX2.encre}`,
    background: sortie ? CX2.surface : CX2.surface,
    color: sortie ? '#8a3a3a' : CX2.encre,
  };
}

function boutonNiveau(ferme: boolean): React.CSSProperties {
  return {
    padding: '9px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 500,
    whiteSpace: 'nowrap', textDecoration: 'none',
    border: `1px solid ${ferme ? '#c98f8f' : CX2.bordure}`,
    background: CX2.surface,
    color: ferme ? '#8a3a3a' : CX2.encreSurvol,
  };
}

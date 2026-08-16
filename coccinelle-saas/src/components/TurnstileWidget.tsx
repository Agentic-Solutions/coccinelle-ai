'use client';

/**
 * Widget Turnstile — filtre anti-robot du formulaire de réservation publique.
 * (chantier ANTI-ROBOT, 15/08/2026)
 *
 * ── LA RÈGLE : IL ÉCHOUE EN OUVERT ──
 * Le widget dépend d'un script tiers (challenges.cloudflare.com). Bloqueur de
 * publicité, proxy d'entreprise, réseau mobile instable, navigateur ancien : il
 * peut ne jamais charger. Un client qui ne peut pas réserver à cause d'un script
 * absent coûte plus cher que le risque couvert.
 *
 * Donc, sans exception : ce composant ne bloque JAMAIS l'envoi du formulaire.
 *   • script absent au bout de 8 s → on abandonne, `onEtat('indisponible')` ;
 *   • `error-callback` / `timeout-callback` → même chose ;
 *   • jeton expiré → on le vide, l'envoi reste possible.
 * Le bouton d'envoi du parent ne dépend jamais de cet état ; c'est le PLAFOND
 * quotidien de SMS côté serveur qui borne le coût, et c'est lui qui rend cet
 * échec ouvert acceptable.
 *
 * Côté serveur, `shared/turnstile.js` traite le jeton ABSENT comme acceptable et
 * le jeton PRÉSENT mais INVALIDE comme un refus : la panne et la falsification ne
 * se ressemblent pas.
 *
 * Sans `NEXT_PUBLIC_TURNSTILE_SITE_KEY` au build, ce composant ne rend RIEN et
 * n'émet aucun jeton — le serveur accepte alors, faute de secret. Le front peut
 * donc être déployé avant que les clés n'existent, sans casser une réservation.
 */

import { useEffect, useRef, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const DELAI_ABANDON_MS = 8000;

export type EtatTurnstile = 'inactif' | 'attente' | 'pret' | 'indisponible';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string | undefined;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

interface Props {
  /** Reçoit le jeton, ou '' quand il n'y en a pas (panne, expiration). */
  onToken: (token: string) => void;
  /** Pour que le parent puisse informer sans jamais bloquer. */
  onEtat?: (etat: EtatTurnstile) => void;
  /**
   * Compteur à incrémenter après CHAQUE tentative d'envoi échouée : le widget
   * redemande alors un jeton neuf.
   *
   * ⚠️ Ce n'est pas un raffinement, c'est la moitié du correctif de l'incident du
   * 16/08/2026. Un jeton Turnstile est à USAGE UNIQUE : sans renouvellement, la
   * deuxième tentative rejoue un jeton consommé et le serveur répond
   * « Vérification de sécurité échouée » — un message de sécurité affiché à un
   * visiteur légitime, à la place de la vraie erreur de son formulaire.
   */
  reinitialiser?: number;
}

export default function TurnstileWidget({ onToken, onEtat, reinitialiser = 0 }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | undefined>(undefined);
  const [etat, setEtat] = useState<EtatTurnstile>(SITE_KEY ? 'attente' : 'inactif');

  // `onToken`/`onEtat` sont volontairement hors des dépendances : le parent les
  // redéfinit à chaque rendu, et les inclure re-monterait le widget en boucle.
  const rappels = useRef({ onToken, onEtat });
  rappels.current = { onToken, onEtat };

  useEffect(() => {
    if (!SITE_KEY) return;

    let abandonne = false;
    const changer = (e: EtatTurnstile) => {
      if (abandonne) return;
      setEtat(e);
      rappels.current.onEtat?.(e);
    };

    // Le délai d'abandon : il court dès le montage et couvre TOUT — script qui
    // ne répond pas, CDN injoignable, `render` qui ne rappelle jamais.
    const minuteur = window.setTimeout(() => changer('indisponible'), DELAI_ABANDON_MS);

    const monter = () => {
      if (abandonne || !conteneur.current || !window.turnstile) return;
      try {
        idWidget.current = window.turnstile.render(conteneur.current, {
          sitekey: SITE_KEY,
          // « managed » : Cloudflare décide s'il faut interroger l'humain. Dans la
          // très grande majorité des cas, rien ne s'affiche et rien n'est demandé.
          appearance: 'interaction-only',
          language: 'fr',
          callback: (token: string) => {
            window.clearTimeout(minuteur);
            rappels.current.onToken(token);
            changer('pret');
          },
          'error-callback': () => {
            window.clearTimeout(minuteur);
            rappels.current.onToken('');
            changer('indisponible');
            // `true` demanderait à Turnstile de réessayer indéfiniment ; on préfère
            // rendre la main tout de suite : le formulaire reste envoyable.
            return false;
          },
          'expired-callback': () => rappels.current.onToken(''),
          'timeout-callback': () => {
            rappels.current.onToken('');
            changer('indisponible');
          },
        });
      } catch {
        window.clearTimeout(minuteur);
        changer('indisponible');
      }
    };

    if (window.turnstile) { monter(); return () => { abandonne = true; window.clearTimeout(minuteur); }; }

    // Un seul script pour la page, même si le composant est monté deux fois.
    let script = document.querySelector<HTMLScriptElement>(`script[src^="${URL_SCRIPT}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = `${URL_SCRIPT}?render=explicit`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', monter);
    script.addEventListener('error', () => { window.clearTimeout(minuteur); changer('indisponible'); });

    return () => {
      abandonne = true;
      window.clearTimeout(minuteur);
      script?.removeEventListener('load', monter);
      if (idWidget.current && window.turnstile) {
        try { window.turnstile.remove(idWidget.current); } catch { /* déjà retiré */ }
      }
    };
  }, []);

  // Renouvellement du jeton, à chaque échec signalé par le parent.
  useEffect(() => {
    if (!reinitialiser || !idWidget.current || !window.turnstile) return;
    // Le jeton courant est périmé dès l'instant où il a été soumis : on le vide
    // AVANT de redemander, pour qu'un envoi entre les deux ne le rejoue pas.
    rappels.current.onToken('');
    try {
      window.turnstile.reset(idWidget.current);
    } catch {
      // Widget déjà retiré, ou script disparu. On ne bloque pas : sans jeton, le
      // serveur accepte (échec ouvert) — c'est exactement le cas prévu.
    }
  }, [reinitialiser]);

  if (!SITE_KEY) return null;

  return (
    <div>
      {/* `interaction-only` : ce conteneur reste vide tant que Cloudflare n'a rien
          à demander. Il ne réserve donc pas de place et ne décale pas le mobile. */}
      <div ref={conteneur} />
      {etat === 'indisponible' && (
        // Ce n'est pas une erreur pour le visiteur : sa réservation part quand même.
        // On le dit, plutôt que d'afficher un avertissement qui inquiète pour rien.
        <p className="text-xs text-gray-400">
          Vérification de sécurité indisponible — vous pouvez réserver normalement.
        </p>
      )}
    </div>
  );
}

// Verification Turnstile — filtre anti-robot du formulaire public (ANTI-ROBOT).
//
// POURQUOI, ET CE QU'IL NE FAIT PAS
// Le formulaire de reservation est sans authentification par nature et chaque
// reservation envoie un vrai SMS. Turnstile FILTRE le robot ordinaire ; c'est le
// PLAFOND quotidien (`shared/sms-plafond.js`) qui BORNE le cout. Les deux ne sont
// pas redondants : c'est le plafond qui autorise Turnstile a echouer en OUVERT.
//
// ── ECHEC OUVERT, ET POURQUOI ──
// Le widget exige un script tiers (challenges.cloudflare.com). Bloqueur, proxy
// d'entreprise, reseau instable, navigateur ancien : il peut ne pas charger. Un
// client qui ne peut pas reserver a cause d'un script absent coute plus cher que
// le risque couvert.
//
// D'ou la distinction, qui est le coeur de ce module :
//   jeton ABSENT   → on ACCEPTE (panne plausible cote client) et on journalise ;
//   jeton PRESENT mais INVALIDE → on REFUSE (c'est une falsification, pas une panne).
//
// Secret absent (`TURNSTILE_SECRET_KEY` non configure) → on accepte tout, en
// journalisant : le jour ou l'on deploie le front avant de poser le secret, les
// reservations ne doivent pas tomber.

import { logger } from '../../utils/logger.js';

const URL_VERIFICATION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @returns {Promise<{accepte: boolean, motif: string}>}
 *   `motif` sert le journal, jamais le client : on ne dit pas a un robot POURQUOI
 *   il est refuse.
 */
export async function verifierTurnstile(env, jeton, ip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    logger.warn('[Turnstile] TURNSTILE_SECRET_KEY absente — verification desactivee');
    return { accepte: true, motif: 'secret_absent' };
  }

  const valeur = String(jeton || '').trim();
  if (!valeur) {
    // Le cas de l'echec ouvert : le script n'a pas charge, ou le navigateur l'a
    // bloque. Le plafond quotidien reste, lui, en place.
    logger.info('[Turnstile] Jeton absent — accepte (echec ouvert)', { ip });
    return { accepte: true, motif: 'jeton_absent' };
  }

  try {
    const corps = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: valeur });
    if (ip) corps.set('remoteip', ip);

    const reponse = await fetch(URL_VERIFICATION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corps,
    });
    const donnees = await reponse.json();

    if (donnees.success === true) return { accepte: true, motif: 'valide' };

    const codes = (donnees['error-codes'] || []).join(',');
    logger.warn('[Turnstile] Jeton refuse', { ip, codes });
    return { accepte: false, motif: codes || 'invalide' };
  } catch (error) {
    // NOTRE appel a echoue, pas le client. Refuser ici punirait un humain pour
    // une panne de notre cote — et le plafond couvre le cout.
    logger.warn('[Turnstile] Verification impossible — accepte', { ip, erreur: error.message });
    return { accepte: true, motif: 'verification_indisponible' };
  }
}

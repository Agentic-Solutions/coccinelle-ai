// Plafond de SMS par tenant et par jour — SOURCE UNIQUE (chantier ANTI-ROBOT).
//
// POURQUOI CE MODULE EXISTE
// Le formulaire de reservation publique est sans authentification par nature, et
// chaque reservation envoie un VRAI SMS. Mesure du 15/08/2026 : 10 000
// reservations = 10 000 SMS = ~800 EUR. Le rate limiter en place est une `Map`
// EN MEMOIRE du Worker, donc un compteur par isolate remis a zero a chaque
// eviction : il arrete une boucle accidentelle, pas un balayage.
//
// Turnstile et les validations rendent l'attaque difficile. CE PLAFOND rend la
// facture impossible a depasser, meme si tout le reste tombe — et c'est
// precisement ce qui autorise Turnstile a echouer en OUVERT : un client ne doit
// jamais perdre une reservation parce qu'un script tiers n'a pas charge.
//
// ── DEUX BUDGETS ETANCHES, par ORIGINE et non par type ──
// Au niveau d'un message, une attaque est INDISTINGUABLE d'une vraie
// reservation : meme type (`confirmation_rdv`), meme code, meme gabarit. Rien
// dans le message ne les separe. Ce qui les separe, c'est l'ORIGINE : l'attaque
// ne peut venir que du chemin public.
//
// Consequence decisive : saturer le budget public ne fait JAMAIS taire un rappel
// J-1 ni un devis. Un robot consomme son propre seau, jamais celui des vrais
// clients. C'est ce qui rend un plafond acceptable.

import { logger } from '../../utils/logger.js';

/** Origines connues. Toute autre valeur est traitee comme `authentifie`. */
export const ORIGINE_PUBLIQUE = 'public';
export const ORIGINE_AUTHENTIFIEE = 'authentifie';

/**
 * Plafonds par defaut, surchargeables par tenant
 * (`tenants.sms_plafond_public` / `sms_plafond_authentifie`, NULL = ce defaut).
 *
 * Base du chiffre, faute de donnees d'usage — maximum observe sur tout
 * l'historique : 4 SMS/jour/tenant, 1 reservation publique/jour. Ce sont donc les
 * promesses commerciales qui calibrent : Essentiel annonce 50 SMS/mois (~1,7/jour),
 * Pro 250/mois (~8/jour). 20/jour = 12x le rythme d'Essentiel, 2,5x celui de Pro :
 * une pointe reelle (saison des pneus) passe, un balayage non.
 */
export const PLAFONDS_DEFAUT = {
  [ORIGINE_PUBLIQUE]: 20,
  [ORIGINE_AUTHENTIFIEE]: 100,
};

/** Jour courant en UTC, comme `datetime('now')` partout ailleurs dans ce code. */
function jourUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reserve UNE unite du budget, ou refuse.
 *
 * ── LE COMPTAGE EST LA RESERVATION ──
 * On incremente AVANT d'envoyer, et l'ecriture porte elle-meme la condition. Deux
 * requetes simultanees ne peuvent pas passer toutes les deux : c'est la forme
 * retenue pour la garde des rappels J-1 (et avant elle pour BUG #009), parce que
 * D1 refuse `BEGIN TRANSACTION` (erreur 7500) et qu'aucun verrou explicite n'est
 * possible. Lire puis ecrire laisserait la fenetre exacte qu'un balayage exploite.
 *
 * En cas d'echec CERTAIN de l'envoi, l'appelant relache par `relacherUnite()`.
 *
 * @returns {Promise<{autorise: boolean, envoyes?: number, plafond?: number,
 *                    premierDepassement?: boolean, erreur?: string}>}
 *   `premierDepassement` : vrai UNE SEULE FOIS par tenant/jour/origine. Sans ce
 *   drapeau, 10 000 tentatives au-dela du plafond declencheraient 10 000 SMS
 *   d'alerte — l'alerte deviendrait l'attaque.
 */
export async function reserverUnite(env, tenantId, origine) {
  if (!env?.DB || !tenantId) {
    // Pas de base : on n'invente pas un refus. Le plafond est une protection de
    // cout, pas une condition de fonctionnement — le bloquer sur une panne de
    // lecture couperait les confirmations legitimes.
    return { autorise: true };
  }

  const seau = origine === ORIGINE_PUBLIQUE ? ORIGINE_PUBLIQUE : ORIGINE_AUTHENTIFIEE;
  const jour = jourUtc();

  try {
    const plafond = await lirePlafond(env, tenantId, seau);

    // La ligne du jour existe-t-elle ? `INSERT … ON CONFLICT DO UPDATE` avec la
    // condition dans le `WHERE` du UPDATE : l'increment n'a lieu que sous le
    // plafond, et `changes` dit si on l'a obtenu.
    const r = await env.DB.prepare(`
      INSERT INTO sms_compteurs_jour (tenant_id, jour, origine, envoyes, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT (tenant_id, jour, origine) DO UPDATE
        SET envoyes = envoyes + 1, updated_at = datetime('now')
        WHERE envoyes < ?
    `).bind(tenantId, jour, seau, plafond).run();

    if (r.meta?.changes === 1) {
      return { autorise: true, plafond };
    }

    // Refus : le plafond est atteint. Est-ce le PREMIER depassement du jour ?
    // Meme forme conditionnelle : seule la premiere ecriture passe.
    const marque = await env.DB.prepare(`
      UPDATE sms_compteurs_jour
         SET alerte_envoyee_at = datetime('now'), updated_at = datetime('now')
       WHERE tenant_id = ? AND jour = ? AND origine = ? AND alerte_envoyee_at IS NULL
    `).bind(tenantId, jour, seau).run();

    const ligne = await env.DB.prepare(
      'SELECT envoyes FROM sms_compteurs_jour WHERE tenant_id = ? AND jour = ? AND origine = ?',
    ).bind(tenantId, jour, seau).first();

    logger.warn('[SMS] Plafond quotidien atteint — envoi refuse', {
      tenantId, origine: seau, envoyes: ligne?.envoyes, plafond,
    });

    return {
      autorise: false,
      envoyes: ligne?.envoyes ?? plafond,
      plafond,
      premierDepassement: marque.meta?.changes === 1,
    };
  } catch (error) {
    // Table absente (migration non appliquee) ou base indisponible : on LAISSE
    // PASSER. Un plafond qui casse les confirmations quand il tombe en panne est
    // pire que l'absence de plafond — le risque qu'il couvre est financier et
    // borne, celui qu'il creerait est un client qui n'est pas prevenu.
    logger.warn('[SMS] Plafond illisible — envoi autorise par defaut', {
      tenantId, origine: seau, erreur: error.message,
    });
    return { autorise: true, erreur: error.message };
  }
}

/**
 * Relache l'unite reservee, quand l'envoi a echoue de facon CERTAINE.
 *
 * Uniquement sur un refus explicite de Twilio (`refuse: true` de
 * `envoyerSmsTrace`) : sur une issue INCONNUE, on garde l'unite consommee. Mieux
 * vaut avoir decompte un SMS peut-etre parti que reouvrir le budget a un
 * balayage qui provoque des timeouts.
 */
export async function relacherUnite(env, tenantId, origine) {
  if (!env?.DB || !tenantId) return;
  const seau = origine === ORIGINE_PUBLIQUE ? ORIGINE_PUBLIQUE : ORIGINE_AUTHENTIFIEE;
  try {
    await env.DB.prepare(`
      UPDATE sms_compteurs_jour
         SET envoyes = MAX(0, envoyes - 1), updated_at = datetime('now')
       WHERE tenant_id = ? AND jour = ? AND origine = ?
    `).bind(tenantId, jourUtc(), seau).run();
  } catch (error) {
    logger.warn('[SMS] Relache du plafond impossible', { tenantId, erreur: error.message });
  }
}

/** Plafond effectif : la valeur du tenant si elle existe, sinon le defaut. */
async function lirePlafond(env, tenantId, seau) {
  const colonne = seau === ORIGINE_PUBLIQUE ? 'sms_plafond_public' : 'sms_plafond_authentifie';
  try {
    const t = await env.DB.prepare(
      `SELECT ${colonne} AS plafond FROM tenants WHERE id = ?`,
    ).bind(tenantId).first();
    const valeur = parseInt(t?.plafond, 10);
    // `parseInt` rend NaN sur NULL comme sur une valeur abimee : les deux
    // retombent sur le defaut, jamais sur 0 — un plafond a 0 couperait tout.
    if (Number.isFinite(valeur) && valeur > 0) return valeur;
  } catch (error) {
    logger.warn('[SMS] Plafond par tenant illisible, defaut applique', {
      tenantId, erreur: error.message,
    });
  }
  return PLAFONDS_DEFAUT[seau];
}

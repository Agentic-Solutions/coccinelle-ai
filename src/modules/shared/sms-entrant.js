/**
 * SMS ENTRANT — les décisions communes aux DEUX webhooks (18/08/2026).
 *
 * ── POURQUOI CE FICHIER EXISTE : ON NE SAIT PAS QUELLE URL TWILIO APPELLERA ──
 *
 * Mesure du 17/08/2026 au `wrangler tail`, la seule qui ait tranché : Twilio appelle
 * `POST /webhooks/twilio/sms` (UA `TwilioProxy/1.1`, signature présente, 200), alors
 * que la fiche du numéro porte `sms_url = .../webhooks/omnichannel/sms`, écrite le jour
 * même et jamais modifiée depuis (`date_updated` inchangé). Le numéro n'est dans aucun
 * Messaging Service, aucune TwiML App ne porte de `sms_url`, et la console Twilio n'a
 * pas été touchée. La provenance de l'URL réellement appelée reste INEXPLIQUÉE.
 *
 * Conséquence pratique : le code de refus vivait sur une route que Twilio n'appelle
 * pas, et un « ARRET » envoyé trois fois depuis un vrai combiné est passé à l'IA sans
 * jamais toucher `sms_refus`. Deux inférences tirées de champs d'API — « `sms_url` vide
 * donc rien n'arrive », « pas d'alerte 11200 donc Twilio n'appelle pas » — étaient
 * fausses toutes les deux.
 *
 * ⇒ On ne parie plus sur la porte d'entrée. Les décisions qui ne doivent pas dépendre
 * du chemin emprunté vivent ici, et les DEUX webhooks les appellent en tête :
 *   — la vérification de signature,
 *   — le refus (STOP / ARRET / …),
 *   — la résolution du tenant par le numéro appelé.
 *
 * Ajouter une troisième route un jour ne demandera que trois appels, dans cet ordre.
 */

import { logger } from '../../utils/logger.js';
import { envoyerSmsTrace } from './sms-envoi.js';
import { estDemandeDeRefus, enregistrerRefus, tenantsAyantEcrit } from './sms-refus.js';
import { TwilioSignatureValidator } from '../twilio/validator.js';

/** TwiML vide — accusé de réception sans réponse automatique. */
export function twimlVide() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'application/xml' },
  });
}

/**
 * La requête vient-elle RÉELLEMENT de Twilio ?
 *
 * ── POURQUOI PAS `validateTwilioRequest` DU MÊME DOSSIER ──
 * Ce helper ÉCHOUE EN OUVERTURE : sans `TWILIO_AUTH_TOKEN`, il renvoie `true`.
 * Défendable pour un webhook qui journalise ; pas pour ces deux-ci, qui écrivent un
 * refus coupant les SMS d'un client réel ET modifient des rendez-vous.
 *
 * Mesuré le 17/08 : un `curl` sans le moindre secret écrivait une ligne dans
 * `sms_refus` et déclenchait un vrai SMS vers un vrai téléphone. Et la route legacy
 * `/webhooks/twilio/sms` — celle que Twilio appelle vraiment — ne vérifiait RIEN, tout
 * en annulant des rendez-vous sur simple `Body=ANNULER`.
 *
 * ⚠️ ÉCHOUE EN FERMETURE, token absent compris : une configuration manquante en
 * production est une anomalie, pas une raison d'ouvrir la porte.
 *
 * ⚠️ Le token attendu est celui de la RÉGION QUI ÉMET LA REQUÊTE. Mesuré le 17/08 :
 * une signature calculée avec `TWILIO_AUTH_TOKEN` (us1) est acceptée, la même calculée
 * avec `TWILIO_IE1_AUTH_TOKEN` est rejetée — la messagerie vit en us1 alors que les
 * numéros vivent en IE1. Si la messagerie basculait un jour en IE1, ces webhooks
 * tomberaient en 403 SILENCIEUX, exactement le symptôme de ce soir. D'où l'acceptation
 * des deux tokens quand le second est configuré : la bascule ne doit pas produire une
 * panne muette.
 */
export async function signatureTwilioValide(request, env) {
  const tokens = [env.TWILIO_AUTH_TOKEN, env.TWILIO_IE1_AUTH_TOKEN].filter(Boolean);
  if (!tokens.length) {
    logger.error('[SMS entrant] Aucun token Twilio — webhook fermé par précaution');
    return false;
  }
  for (const token of tokens) {
    if (await new TwilioSignatureValidator(token).validate(request, request.url)) return true;
  }
  return false;
}

/**
 * Résout le tenant par le numéro APPELÉ.
 *
 * ⚠️ UN NUMÉRO INCONNU EST REJETÉ, JAMAIS DEVINÉ. C'est l'invariant du Lot 5 WhatsApp,
 * et les deux webhooks SMS le violaient chacun à leur manière : l'un écrivait
 * `'tenant_mihmuebzieaxehi7qv'` en dur (tenant purgé), l'autre retombait sur
 * `'tenant_demo_001'`. Le second était le chemin RÉEL : mesuré en production le 17/08,
 * un SMS entrant de Youssef a été traité sous `tenant_demo_001`, et c'est ce tenant-là
 * qui aurait servi à confirmer ou annuler un rendez-vous.
 *
 * @returns {Promise<string|null>} l'identifiant du tenant, ou `null` si inconnu.
 */
export async function resoudreTenantParNumeroAppele(env, to) {
  if (!env?.DB || !to) return null;
  const requete = (canal) => env.DB.prepare(
    `SELECT tenant_id FROM omni_phone_mappings
      WHERE phone_number = ? AND channel_type = ? AND is_active = 1
      LIMIT 1`,
  ).bind(to, canal).first();

  const sms = await requete('sms');
  if (sms?.tenant_id) return sms.tenant_id;
  // Repli sur le mapping VOIX du même numéro : une ligne cumule souvent voix et SMS
  // (§ p.2), et n'avoir déclaré que la voix est le cas courant aujourd'hui.
  const voix = await requete('voice');
  return voix?.tenant_id || null;
}

/**
 * Intercepte un refus. À appeler EN TÊTE de tout webhook de SMS entrant.
 *
 * @returns {Promise<Response|null>} une réponse TwiML si c'était un refus (l'appelant
 *   doit la retourner immédiatement), `null` si le message doit suivre son cours.
 *
 * ⚠️ AUCUN TENANT N'INTERVIENT. Le refus se clé sur le numéro APPELÉ (`to`) — celui que
 * la personne avait sous les yeux. Voir la migration 0089 : résoudre un tenant ici
 * faisait enregistrer un STOP répondu à Garage Toulouse chez Coccinelle.ai.
 *
 * Corollaire utile : ce chemin fonctionne sur un numéro sans mapping, donc sur le
 * numéro d'essai partagé `+33939035761`.
 */
export async function intercepterRefus(env, { from, to, body }) {
  if (!estDemandeDeRefus(body)) return null;

  // 1. LE REFUS D'ABORD, la confirmation ensuite. Si l'envoi échoue ou lève, le refus
  //    est déjà en base ; dans l'autre sens, un plantage entre les deux laisserait la
  //    personne avec un accusé de réception et aucun refus enregistré.
  const concernes = await tenantsAyantEcrit(env, from).catch(() => []);
  await enregistrerRefus(env, {
    expediteur: to,
    phone: from,
    message: body,
    source: 'sms_entrant',
    tenantsConcernes: concernes,
  });

  // 2. La confirmation. Elle ne nomme AUCUNE entreprise : le refus porte sur le numéro
  //    et vaut pour tous les tenants qui émettent depuis lui — en nommer un laisserait
  //    croire que les autres continuent.
  //
  //    `type: 'interne'` l'exempte de la garde de refus, du plafond et de la garde de
  //    contact. C'est le seul moyen de la faire sortir, et c'est justifié : c'est la
  //    réponse à un refus, pas un message à l'initiative de l'entreprise. Elle part même
  //    vers un numéro sans fiche prospect.
  await envoyerSmsTrace(env, {
    tenantId: null,
    to: from,
    message: 'Votre demande est enregistree : vous ne recevrez plus de SMS de ce numero.',
    type: 'interne',
    ignorerPlafond: true,
  }).catch((e) => logger.error('[SMS entrant] Confirmation de refus non partie', {
    erreur: e.message,
  }));

  logger.warn('[SMS entrant] Refus reçu et traité', {
    expediteur: to, tenantsConcernes: concernes,
  });
  return twimlVide();
}

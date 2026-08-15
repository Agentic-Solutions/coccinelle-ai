// Envoi de SMS tracé — transport + historique de conversation.
//
// POURQUOI CE MODULE EXISTE
// Deux manques constates le 11/08 :
//   1. la page de reservation publique promettait « vous recevrez une
//      confirmation par SMS ou par e-mail » et n'envoyait RIEN — l'envoi
//      n'etait simplement pas implemente ;
//   2. les rappels J-1 partaient bien, mais n'apparaissaient nulle part dans
//      l'historique du contact : le commercant ne voyait pas ce que son
//      client avait recu.
//
// Ce module fait les trois choses ensemble : la regle du lien (deleguee a
// sms-booking-link.js), l'envoi Twilio, et la trace dans omni_conversations /
// omni_messages pour que le message apparaisse dans la fiche du contact.
//
// Il ne leve JAMAIS : un SMS de confirmation qui echoue ne doit pas annuler le
// rendez-vous qui vient d'etre pris.

import { logger } from '../../utils/logger.js';
import { enrichirSmsAvecLien } from './sms-booking-link.js';
import { compterSms } from './sms-format.js';
import {
  ORIGINE_AUTHENTIFIEE, ORIGINE_PUBLIQUE, reserverUnite, relacherUnite,
} from './sms-plafond.js';

/**
 * FORME DE RETOUR — une seule, et elle porte du sens.
 *
 * Il en existait deux : `sendSMSViaTwilio` rendait `{success}`, ce module rend
 * `{envoye}`. Le 11/08/2026, une version deployee entre les deux appelait ce
 * module en testant encore `.success` : `undefined` etant faux, le SMS partait,
 * la trace s'ecrivait, et `reminder_sent` n'etait jamais pose — donc le passage
 * suivant renvoyait un second rappel au meme client. La couture avait ete
 * refermee par un pont (`smsResult.success = smsResult.envoye`) ; le pont est
 * supprime le 15/08 au profit d'une forme unique, et `scripts/test_rappels.mjs`
 * echoue si elle change.
 *
 * `refuse` distingue les deux echecs, et cette distinction est ce qui permet a
 * un appelant de decider s'il peut reessayer :
 *   `refuse: true`  — Twilio a explicitement rejete, ou l'envoi n'a meme pas ete
 *                     tente (numero absent, Twilio non configure). L'issue est
 *                     CERTAINE : rien n'est parti, on peut reessayer sans risque
 *                     de doublon.
 *   `refuse` absent avec `envoye: false` — issue INCONNUE (exception reseau) :
 *                     Twilio a peut-etre accepte le message. Reessayer peut
 *                     produire un doublon chez le client.
 *
 * @param {object} env
 * @param {{tenantId: string, to: string, message: string, type: string,
 *          prospectId?: string|null, nomContact?: string|null}} options
 * @returns {Promise<{envoye: boolean, corps?: string, segments?: number,
 *                    sid?: string, erreur?: string, refuse?: boolean}>}
 *   `corps` est le texte REELLEMENT parti — enrichi du lien et compacte en
 *   GSM-7. Les appelants qui le renvoient ou le journalisent doivent utiliser
 *   celui-la, jamais le `message` d'entree : c'est precisement l'ecart qui
 *   rendait les historiques faux (cf. l'INSERT mort de voixia/routes.js).
 */
export async function envoyerSmsTrace(env, {
  tenantId, to, message, type, prospectId, nomContact,
  origine = ORIGINE_AUTHENTIFIEE, ignorerPlafond = false,
}) {
  const destinataire = String(to || '').trim();
  // Rien n'a ete tente : l'issue est certaine.
  if (!destinataire) {
    return { envoye: false, refuse: true, erreur: 'Numéro destinataire manquant' };
  }

  // ── PLAFOND QUOTIDIEN, avant toute chose (chantier ANTI-ROBOT) ──
  //
  // `origine` et non `type` : au niveau d'un message, une attaque est
  // indistinguable d'une vraie reservation. Ce qui les separe est l'origine — le
  // chemin public est le seul par lequel un robot peut passer. Deux seaux
  // etanches, donc saturer le public ne fait jamais taire un rappel J-1.
  //
  // `ignorerPlafond` est reserve a l'alerte de depassement elle-meme : sans cette
  // sortie, l'alerte serait refusee par le plafond qu'elle annonce.
  if (!ignorerPlafond) {
    const budget = await reserverUnite(env, tenantId, origine);
    if (!budget.autorise) {
      // Alerte NON BLOQUANTE, et une seule par tenant/jour/origine.
      if (budget.premierDepassement) {
        alerterDepassement(env, { tenantId, origine, ...budget }).catch(() => {});
      }
      return {
        envoye: false, refuse: true, plafondAtteint: true,
        erreur: `Plafond quotidien de SMS atteint (${budget.envoyes}/${budget.plafond}, origine ${origine})`,
      };
    }
  }

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  // Repli sur la ligne Coccinelle.ai : `TWILIO_PHONE_NUMBER` vit dans les vars
  // de wrangler.toml, mais les quatre chemins d'envoi absorbes par ce module
  // portaient tous ce repli. Le retirer aurait change leur comportement en
  // silence si la var venait a manquer sur un environnement.
  const expediteur = env.TWILIO_PHONE_NUMBER || '+33939035760';
  if (!accountSid || !authToken) {
    logger.warn('[SMS] Twilio non configuré — envoi ignoré', { tenantId, type });
    return { envoye: false, refuse: true, erreur: 'Twilio non configuré' };
  }

  // La regle du lien vit dans sms-booking-link.js ; on ne la redecide pas ici.
  const corps = await enrichirSmsAvecLien(env, { tenantId, message, type });
  const mesure = compterSms(corps);

  let sid = null;
  try {
    const reponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: destinataire, From: expediteur, Body: corps }),
      },
    );
    const donnees = await reponse.json();
    if (!reponse.ok) {
      logger.warn('[SMS] Envoi refusé par Twilio', {
        tenantId, type, code: donnees?.code, message: donnees?.message,
      });
      // Refus certain : rien n'est parti, on rend l'unite au budget. Sur une
      // issue INCONNUE (exception plus bas) on la garde — mieux vaut avoir
      // decompte un SMS peut-etre parti que reouvrir le seau a un balayage qui
      // provoque des timeouts.
      if (!ignorerPlafond) await relacherUnite(env, tenantId, origine);
      return {
        envoye: false, refuse: true, erreur: donnees?.message || 'Envoi refusé',
        segments: mesure.segments, corps,
      };
    }
    sid = donnees.sid;
  } catch (error) {
    // `refuse` volontairement ABSENT : la requete est partie, la reponse non
    // recue. Twilio a peut-etre accepte le message — un appelant qui reessaie
    // enverrait alors un doublon au client. C'est a lui d'arbitrer, avec cette
    // information.
    logger.warn('[SMS] Envoi impossible, issue inconnue', {
      tenantId, type, erreur: error.message,
    });
    return { envoye: false, erreur: error.message, segments: mesure.segments, corps };
  }

  logger.info('[SMS] Envoyé', {
    tenantId, type, segments: mesure.segments, encodage: mesure.encodage,
  });

  // ── Trace, non bloquante : le SMS est parti, rien ne doit l'annuler ──
  await tracerDansConversation(env, {
    tenantId, destinataire, corps, sid, prospectId, nomContact, type,
  }).catch(() => {});

  return { envoye: true, sid, segments: mesure.segments, corps };
}

/**
 * Rattache le message a la conversation du contact, en la creant au besoin.
 * C'est ce qui le rend visible dans la fiche client du dashboard.
 */
async function tracerDansConversation(env, { tenantId, destinataire, corps, sid, prospectId, nomContact, type }) {
  if (!env?.DB || !tenantId) return;

  const conversation = await env.DB.prepare(
    `SELECT id FROM omni_conversations
     WHERE tenant_id = ? AND client_phone = ?
     ORDER BY last_message_at DESC LIMIT 1`,
  ).bind(tenantId, destinataire).first();

  let conversationId = conversation?.id;
  if (!conversationId) {
    conversationId = `conv_sms_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await env.DB.prepare(
      `INSERT INTO omni_conversations
         (id, tenant_id, client_phone, client_name, prospect_id, active_channels,
          current_channel, status, first_message_at, last_message_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'sms', 'active',
               datetime('now'), datetime('now'), datetime('now'), datetime('now'))`,
    ).bind(
      conversationId, tenantId, destinataire, nomContact || null,
      prospectId || null, JSON.stringify(['sms']),
    ).run();
  } else {
    await env.DB.prepare(
      `UPDATE omni_conversations SET last_message_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    ).bind(conversationId).run();
  }

  // `message_type` (migration 0085) place le message a la bonne etape du voyage
  // client dans « Mes communications ». On stocke le type TEL QU'IL A ETE PASSE :
  // pas de reclassement, pas de valeur par defaut inventee — un type absent
  // reste NULL et s'affiche « autre ».
  //
  // Si la colonne manque (migration non appliquee), on retombe sur l'insertion
  // sans type : un historique sans etage vaut mieux qu'un SMS non trace.
  const idMessage = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    await env.DB.prepare(
      `INSERT INTO omni_messages
         (id, conversation_id, channel, direction, content, sender_role, message_sid,
          message_type, created_at)
       VALUES (?, ?, 'sms', 'outbound', ?, 'assistant', ?, ?, datetime('now'))`,
    ).bind(idMessage, conversationId, corps, sid || null, type || null).run();
  } catch (e) {
    logger.warn('[SMS] Trace sans type (colonne message_type absente ?)', { erreur: e.message });
    await env.DB.prepare(
      `INSERT INTO omni_messages
         (id, conversation_id, channel, direction, content, sender_role, message_sid, created_at)
       VALUES (?, ?, 'sms', 'outbound', ?, 'assistant', ?, datetime('now'))`,
    ).bind(idMessage, conversationId, corps, sid || null).run();
  }
}

/**
 * Previent l'exploitant qu'un plafond quotidien vient d'etre atteint.
 *
 * PAR SMS et non par e-mail : l'e-mail sort du perimetre du produit depuis le
 * 15/08, et une alerte qui arrive dans un canal coupe n'est pas une alerte.
 *
 * `ignorerPlafond: true` — sans cette sortie, l'alerte serait refusee par le
 * plafond qu'elle annonce. Et `alerte_envoyee_at` en base garantit UNE alerte par
 * tenant/jour/origine : sans lui, 10 000 tentatives au-dela du plafond
 * declencheraient 10 000 SMS d'alerte, et l'alerte deviendrait l'attaque.
 *
 * Le numero vit dans le SECRET `ALERTE_SMS_NUMERO` (`wrangler secret put`), pas
 * dans `wrangler.toml` ni dans le code : ni fichier a modifier, ni tenant code en
 * dur — c'est l'antipattern qui a produit `tenant.py:27` et `tenant_demo_001`.
 * Secret absent : on journalise et on n'envoie rien, plutot que de deviner un
 * destinataire.
 */
async function alerterDepassement(env, { tenantId, origine, envoyes, plafond }) {
  const numero = env.ALERTE_SMS_NUMERO;
  if (!numero) {
    logger.error('[SMS] Plafond atteint et ALERTE_SMS_NUMERO absent — personne n\'est prevenu', {
      tenantId, origine, envoyes, plafond,
    });
    return;
  }

  const nom = await nomDuTenant(env, tenantId);
  const message = origine === ORIGINE_PUBLIQUE
    ? `Coccinelle : plafond SMS atteint chez ${nom} (${envoyes}/${plafond}, formulaire public). `
      + `Les rendez-vous sont enregistres, les confirmations ne partent plus. Verifiez s'il s'agit d'un robot.`
    : `Coccinelle : plafond SMS atteint chez ${nom} (${envoyes}/${plafond}, envois internes). `
      + `Rappels et devis ne partent plus aujourd'hui.`;

  // ⚠️ `tenantId: null` et non le tenant en cause. Le passer aurait ecrit CETTE
  // alerte dans l'historique de conversation du CLIENT : il aurait vu dans sa fiche
  // un message qu'il n'a jamais recu, et adresse a nous. `tracerDansConversation`
  // sort immediatement sans tenant. Le nom du tenant reste dans le TEXTE, qui est
  // sa place.
  await envoyerSmsTrace(env, {
    tenantId: null, to: numero, message,
    type: 'interne',            // pas de lien de reservation : ce n'est pas un client
    ignorerPlafond: true,
  });
}

/** Nom lisible du tenant pour l'alerte, ou son identifiant a defaut. */
async function nomDuTenant(env, tenantId) {
  try {
    const t = await env.DB.prepare('SELECT name FROM tenants WHERE id = ?').bind(tenantId).first();
    return t?.name || tenantId;
  } catch {
    return tenantId;
  }
}

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

/**
 * @param {object} env
 * @param {{tenantId: string, to: string, message: string, type: string,
 *          prospectId?: string|null, nomContact?: string|null}} options
 * @returns {Promise<{envoye: boolean, sid?: string, erreur?: string,
 *                    segments?: number, corps?: string}>}
 *   `corps` est le texte REELLEMENT parti — enrichi du lien et compacte en
 *   GSM-7. Les appelants qui le renvoient ou le journalisent doivent utiliser
 *   celui-la, jamais le `message` d'entree : c'est precisement l'ecart qui
 *   rendait les historiques faux (cf. l'INSERT mort de voixia/routes.js).
 */
export async function envoyerSmsTrace(env, { tenantId, to, message, type, prospectId, nomContact }) {
  const destinataire = String(to || '').trim();
  if (!destinataire) return { envoye: false, erreur: 'Numéro destinataire manquant' };

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  // Repli sur la ligne Coccinelle.ai : `TWILIO_PHONE_NUMBER` vit dans les vars
  // de wrangler.toml, mais les quatre chemins d'envoi absorbes par ce module
  // portaient tous ce repli. Le retirer aurait change leur comportement en
  // silence si la var venait a manquer sur un environnement.
  const expediteur = env.TWILIO_PHONE_NUMBER || '+33939035760';
  if (!accountSid || !authToken) {
    logger.warn('[SMS] Twilio non configuré — envoi ignoré', { tenantId, type });
    return { envoye: false, erreur: 'Twilio non configuré' };
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
      return {
        envoye: false, erreur: donnees?.message || 'Envoi refusé',
        segments: mesure.segments, corps,
      };
    }
    sid = donnees.sid;
  } catch (error) {
    logger.warn('[SMS] Envoi impossible', { tenantId, type, erreur: error.message });
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

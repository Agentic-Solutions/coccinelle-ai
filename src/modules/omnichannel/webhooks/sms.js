/**
 * Webhook SMS - Gestion des messages SMS via Twilio
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';
import { envoyerSmsTrace } from '../../shared/sms-envoi.js';
import { estDemandeDeRefus, enregistrerRefus } from '../../shared/sms-refus.js';

/**
 * POST /webhooks/omnichannel/sms
 * Webhook Twilio pour les SMS entrants
 */
export async function handleIncomingSMS(request, env) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid');
    const from = formData.get('From');
    const to = formData.get('To');
    const body = formData.get('Body');

    omniLogger.info('Incoming SMS', { messageSid, from, to, body });

    // ── RESOLUTION DU TENANT PAR LE NUMERO APPELE (chantier CONSENTEMENT) ──
    //
    // Avant : le tenant etait ECRIT EN DUR — `'tenant_mihmuebzieaxehi7qv'`, purge le
    // 10/08/2026, donc INEXISTANT. Toute conversation creee par ce webhook etait donc
    // rattachee a un tenant fantome. C'est le meme antipattern que le fallback
    // « premier tenant actif » de la faille WhatsApp V1 : deviner un tenant, c'est
    // melanger les donnees de clients differents.
    //
    // C'est aussi un PREREQUIS du STOP : un refus enregistre contre un tenant fantome
    // est un refus perdu, ce qui est pire que pas de STOP du tout.
    //
    // La resolution se fait sur `omni_phone_mappings`, comme `resolve-phone` cote voix,
    // et un numero appele INCONNU est REJETE — jamais devine (invariant du Lot 5
    // WhatsApp : un `phone_number_id` inconnu doit etre rejete, jamais devine).
    const mapping = await env.DB.prepare(
      `SELECT tenant_id FROM omni_phone_mappings
       WHERE phone_number = ? AND channel_type = 'sms' AND is_active = 1
       LIMIT 1`,
    ).bind(to).first();

    // Repli sur le mapping VOIX du meme numero : une ligne cumule souvent voix et SMS
    // (§ p.2), et n'avoir declare que la voix est le cas courant aujourd'hui.
    const mappingVoix = mapping ? null : await env.DB.prepare(
      `SELECT tenant_id FROM omni_phone_mappings
       WHERE phone_number = ? AND channel_type = 'voice' AND is_active = 1
       LIMIT 1`,
    ).bind(to).first();

    const tenantId = mapping?.tenant_id || mappingVoix?.tenant_id || null;

    if (!tenantId) {
      // 200 et non 404 : Twilio reessaierait sur une erreur, et un numero non
      // rattache n'est pas une panne — c'est une configuration absente. On le
      // journalise en WARN pour qu'il soit visible sans casser le webhook.
      omniLogger.warn('SMS entrant sur un numero non rattache — ignore', { to, from });
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // ── STOP / ARRET : le refus se traite AVANT tout le reste ──
    // Avant la conversation, avant l'IA, avant toute reponse : une personne qui
    // refuse ne doit pas voir son message interprete comme une question.
    if (estDemandeDeRefus(body)) {
      return await traiterRefus(env, { tenantId, from, to, body });
    }


    // Config agent par défaut
    const agentConfig = {
      agent_name: 'Sara',
      agent_personality: 'friendly',
      greeting_message: 'Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?'
    };

    // Chercher ou créer une conversation pour ce numéro
    let conversation = await env.DB.prepare(`
      SELECT * FROM omni_conversations
      WHERE client_phone = ? AND current_channel = 'sms' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(from).first();

    let conversationId;

    if (!conversation) {
      // Créer nouvelle conversation
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await env.DB.prepare(queries.createConversation).bind(
        conversationId,
        null, // conversation_sid
        tenantId,   // resolu par le numero APPELE (voir en tete de fonction)
        from,
        null, // email
        null, // name
        JSON.stringify(['sms']),
        'sms',
        JSON.stringify({}),
        null, // external_id
        now,
        now
      ).run();

      omniLogger.info('New SMS conversation created', { conversationId, from });
    } else {
      conversationId = conversation.id;
      omniLogger.info('Existing SMS conversation found', { conversationId, from });
    }

    // Enregistrer le message entrant
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'sms', 'inbound', ?, 'client', datetime('now'))
    `).bind(userMessageId, conversationId, body).run();

    // Générer une réponse avec OpenAI
    const ai = new ClaudeAIService(env.OPENAI_API_KEY);

    // Créer ou récupérer la session AI
    let session;
    if (conversation && conversation.conversation_context) {
      try {
        const context = JSON.parse(conversation.conversation_context);
        session = context.aiSession || await ai.createSession(agentConfig);
      } catch {
        session = await ai.createSession(agentConfig);
      }
    } else {
      session = await ai.createSession(agentConfig);
    }

    const response = await ai.streamResponse(session, body);

    // Enregistrer la réponse
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'sms', 'outbound', ?, 'assistant', datetime('now'))
    `).bind(assistantMessageId, conversationId, response).run();

    // Sauvegarder la session AI dans le contexte
    await env.DB.prepare(`
      UPDATE omni_conversations
      SET conversation_context = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify({ aiSession: session }), conversationId).run();

    // Envoyer la réponse via Twilio SMS.
    // `tenantId` est desormais RESOLU par le numero appele (voir en tete de fonction) :
    // le tenant en dur qui rendait ce commentaire necessaire a disparu, et le lien de
    // reservation peut donc etre construit correctement.
    await sendTwilioSMS(env, from, response, tenantId, 'reponse_sms');

    // Répondre avec TwiML vide (la réponse a déjà été envoyée via API)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle incoming SMS', { error: error.message });

    // Répondre avec un message d'erreur
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Désolé, une erreur est survenue. Veuillez réessayer plus tard.</Message>
</Response>`, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}

/**
/**
 * Envoyer un SMS de reponse a un client — DELEGUE au chemin unique.
 *
 * Avant le 17/08/2026, cette fonction appelait Twilio directement. Elle compactait
 * bien (via `enrichirSmsAvecLien`), mais elle echappait au PLAFOND QUOTIDIEN et a la
 * TRACE dans la conversation. Or c'est le chemin d'une reponse automatique a un SMS
 * entrant : celui ou une boucle entre deux repondeurs automatiques coute le plus cher.
 *
 * `envoyerSmsTrace` fait les trois, et `enrichirSmsAvecLien` y est deja appele — le
 * garder ici l'aurait execute deux fois (il est idempotent, mais compter deux fois sur
 * cette propriete est fragile).
 */
async function sendTwilioSMS(env, to, message, tenantId = null, type = 'reponse_sms') {
  const envoi = await envoyerSmsTrace(env, { tenantId, to, message, type });

  if (!envoi.envoye) {
    // L'appelant `await`ait cette fonction sans lire son retour et comptait sur une
    // exception : on la conserve, pour ne pas changer son comportement au passage.
    throw new Error(`Envoi SMS refuse : ${envoi.erreur || 'raison inconnue'}`);
  }

  omniLogger.info('SMS sent via Twilio', { messageSid: envoi.sid, to });
  return { sid: envoi.sid };
}

/**
 * Traite un STOP / ARRET recu.
 *
 * ⚠️ L'ORDRE EST LE PIEGE DE CE CHEMIN, et il est contre-intuitif : la confirmation
 * part AVANT que le refus ne soit enregistre. Dans l'autre sens, la garde qu'on vient
 * de poser dans `envoyerSmsTrace` bloquerait notre propre accuse de reception — la
 * personne dirait « STOP » et n'aurait aucun retour, donc ne saurait pas si son refus a
 * ete pris en compte, et recommencerait.
 *
 * La confirmation part meme si le numero est INCONNU (aucune fiche prospect) : c'est
 * une exigence explicite. Quelqu'un peut avoir recu un SMS de l'agent vocal sans avoir
 * de fiche, et il a le droit de refuser comme les autres. Elle part donc en
 * `type: 'interne'` — pas parce qu'elle nous est adressee, mais parce que ce type est
 * exempte a la fois du plafond, de la garde de contact et de la garde de refus. C'est
 * le seul moyen de la faire sortir, et c'est justifie : c'est la reponse a un refus,
 * pas un message a l'initiative de l'entreprise.
 */
async function traiterRefus(env, { tenantId, from, to, body }) {
  const nom = await nomDuTenantPourRefus(env, tenantId);

  // 1. La confirmation, AVANT l'enregistrement (voir plus haut).
  await envoyerSmsTrace(env, {
    tenantId,
    to: from,
    message: `Vous ne recevrez plus de SMS de ${nom}.`,
    type: 'interne',
    ignorerPlafond: true,
  }).catch((e) => omniLogger.error('Confirmation de refus non partie', { erreur: e.message }));

  // 2. Le refus lui-meme.
  await enregistrerRefus(env, { tenantId, phone: from, message: body });

  omniLogger.warn('STOP recu et traite', { tenantId, from, to });

  // TwiML vide : la reponse est deja partie par l'API.
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'application/xml' },
  });
}

/** Nom commercial du tenant, pour que la confirmation dise QUI ne l'ecrira plus. */
async function nomDuTenantPourRefus(env, tenantId) {
  try {
    const t = await env.DB.prepare('SELECT name FROM tenants WHERE id = ?').bind(tenantId).first();
    return t?.name || 'cette entreprise';
  } catch {
    return 'cette entreprise';
  }
}

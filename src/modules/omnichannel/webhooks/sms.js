/**
 * Webhook SMS - Gestion des messages SMS via Twilio
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';
import { envoyerSmsTrace } from '../../shared/sms-envoi.js';
import {
  signatureTwilioValide, intercepterRefus, resoudreTenantParNumeroAppele, twimlVide,
} from '../../shared/sms-entrant.js';

/**
 * POST /webhooks/omnichannel/sms
 * Webhook Twilio pour les SMS entrants
 */
export async function handleIncomingSMS(request, env) {
  try {
    // ── SIGNATURE TWILIO — AVANT TOUT, ET AVANT TOUTE LECTURE DU CORPS ──
    // 403 et non 404 : contrairement aux surfaces WhatsApp gelees, cette route est
    // legitimement publique et son existence n'a rien de confidentiel. Ce qu'on refuse,
    // c'est son usage sans preuve d'origine.
    if (!(await signatureTwilioValide(request, env))) {
      omniLogger.warn('Webhook SMS : signature Twilio absente ou invalide — rejete');
      return new Response('Forbidden', { status: 403 });
    }

    const formData = await request.formData();
    const messageSid = formData.get('MessageSid');
    const from = formData.get('From');
    const to = formData.get('To');
    const body = formData.get('Body');

    omniLogger.info('Incoming SMS', { messageSid, from, to, body });

    // ── LE REFUS, AVANT TOUT LE RESTE — decision partagee, voir `shared/sms-entrant.js` ──
    // Avant la resolution du tenant, avant la conversation, avant l'IA. Elle ne depend
    // d'aucun tenant (cle par numero appele), donc elle fonctionne aussi sur un numero
    // sans mapping — le numero d'essai partage `+33939035761`.
    const refus = await intercepterRefus(env, { from, to, body });
    if (refus) return refus;

    // ── RESOLUTION DU TENANT PAR LE NUMERO APPELE ──
    // Meme fonction que la route legacy `/webhooks/twilio/sms` : les deux devinaient un
    // tenant chacune a sa maniere (`'tenant_mihmuebzieaxehi7qv'` purge ici,
    // `'tenant_demo_001'` la-bas). Un numero inconnu est REJETE, jamais devine.
    const tenantId = await resoudreTenantParNumeroAppele(env, to);

    if (!tenantId) {
      // 200 et non 404 : Twilio reessaierait sur une erreur, et un numero non
      // rattache n'est pas une panne — c'est une configuration absente. On le
      // journalise en WARN pour qu'il soit visible sans casser le webhook.
      omniLogger.warn('SMS entrant sur un numero non rattache — ignore', { to, from });
      return twimlVide();
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

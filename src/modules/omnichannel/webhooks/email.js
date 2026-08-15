/**
 * Webhook Email - Gestion des emails via Resend
 * Version multi-tenant avec routing dynamique
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';

/**
 * POST /webhooks/omnichannel/email
 * Webhook Resend pour les emails entrants
 */
export async function handleIncomingEmail(request, env) {
  try {
    const payload = await request.json();

    const {
      type,
      created_at,
      data
    } = payload;

    // Vérifier que c'est bien un email entrant
    if (type !== 'email.received') {
      omniLogger.info('Ignoring non-email event', { type });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const {
      email_id,
      from,
      to,
      subject,
      html,
      text
    } = data;

    omniLogger.info('Incoming email', { email_id, from, to, subject });

    // Extraire l'adresse email de l'expéditeur
    const senderEmail = typeof from === 'string' ? from : from.email;

    // ============================================
    // ROUTING MULTI-TENANT DYNAMIQUE
    // ============================================
    
    // Extraire l'adresse de destination
    const toEmail = Array.isArray(to) ? to[0] : to;
    const toAddress = typeof toEmail === 'string' ? toEmail : toEmail?.email;
    
    omniLogger.info('Routing email', { toAddress });
    
    // Extraire le slug depuis l'adresse (ex: marie-dupont@coccinelle.ai → marie-dupont)
    let tenantSlug = null;
    if (toAddress && toAddress.includes('@coccinelle.ai')) {
      tenantSlug = toAddress.split('@')[0];
    }
    
    if (!tenantSlug) {
      omniLogger.error('Cannot extract tenant slug from email', { toAddress });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid destination email - cannot determine tenant' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Chercher le tenant par slug
    const tenant = await env.DB.prepare(`
      SELECT id, name, slug FROM tenants WHERE slug = ?
    `).bind(tenantSlug).first();
    
    if (!tenant) {
      omniLogger.error('Tenant not found for slug', { tenantSlug });
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Tenant not found for slug: ${tenantSlug}` 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const tenantId = tenant.id;
    omniLogger.info('Tenant found', { tenantId, tenantName: tenant.name, tenantSlug });

    // ── LECTURE DE LA CONFIG AGENT ET DE LA KB SUPPRIMEE (15/08/2026) ──
    //
    // Ces deux blocs ne servaient QU'a ouvrir la session LLM qui produisait la
    // reponse automatique, elle-meme supprimee. Ils interrogeaient
    // `omni_agent_configs` et `knowledge_documents` a chaque e-mail entrant, pour
    // un resultat que plus personne ne lisait — et fabriquaient au passage un
    // repli « Sara », nom banni des surfaces publiques (regle i.14).

    // ============================================
    // GESTION CONVERSATION
    // ============================================

    // Chercher ou créer une conversation pour cet email
    let conversation = await env.DB.prepare(`
      SELECT * FROM omni_conversations
      WHERE tenant_id = ? AND client_email = ? AND current_channel = 'email' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(tenantId, senderEmail).first();

    let conversationId;

    if (!conversation) {
      // Créer nouvelle conversation
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await env.DB.prepare(queries.createConversation).bind(
        conversationId,
        null, // conversation_sid
        tenantId,  // ← TENANT DYNAMIQUE
        null, // phone
        senderEmail,
        null, // name
        JSON.stringify(['email']),
        'email',
        JSON.stringify({ subject }),
        email_id,
        now,
        now
      ).run();

      omniLogger.info('New email conversation created', { conversationId, senderEmail, tenantId });
    } else {
      conversationId = conversation.id;
      omniLogger.info('Existing email conversation found', { conversationId, senderEmail });
    }

    // Utiliser le texte brut en priorité, sinon HTML
    const emailBody = text || html || subject;

    // Enregistrer le message entrant
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'email', 'inbound', ?, 'client', datetime('now'))
    `).bind(userMessageId, conversationId, emailBody).run();

    // ── GENERATION DE LA REPONSE SUPPRIMEE (15/08/2026) ──
    //
    // Ce bloc appelait le LLM puis INSERAIT sa reponse en `direction: 'outbound'`
    // dans `omni_messages`. Retirer le seul envoi aurait donc laisse pire que le
    // silence : un e-mail sortant enregistre dans l'historique du garagiste,
    // visible dans « Mes communications », et jamais parti. Exactement le genre de
    // trace fausse que ce produit passe son temps a corriger.
    //
    // Ce qui reste, et qui est utile : l'e-mail ENTRANT est enregistre (plus haut,
    // `direction: 'inbound'`). Le garagiste le voit dans la fiche du contact et
    // peut rappeler ou envoyer un SMS. Aucune session LLM n'est plus ouverte,
    // aucun jeton n'est consomme.
    //
    // ⚠️ `conversation_context` n'est plus mis a jour : il ne portait que la
    // session IA de ce fil. Les contextes deja en base restent lisibles.

    // ── RÉPONSE AUTOMATIQUE SUPPRIMÉE (15/08/2026) ──
    //
    // Cette ligne répondait à l'expéditeur par e-mail, avec une signature
    // « Sara - Assistante de {tenant} » : le nom est banni des surfaces publiques
    // (règle i.14), et il partait chez un client.
    //
    // Coccinelle ne parle plus jamais d'e-mail à ses clients. L'e-mail entrant
    // continue d'être ENREGISTRÉ dans la conversation, juste au-dessus — le
    // garagiste le voit dans la fiche du contact et peut rappeler ou envoyer un
    // SMS. Ce qui disparaît, c'est la réponse envoyée sans qu'il le sache.
    //
    // `sendResendEmail` est supprimée avec cette ligne : c'était son unique
    // appelant.

    return new Response(JSON.stringify({ 
      success: true,
      tenant: tenant.name,
      conversationId 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle incoming email', {
      error: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Envoyer un email via l'API Resend
 */

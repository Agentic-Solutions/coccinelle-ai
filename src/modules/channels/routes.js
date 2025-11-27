// Module Channels - Routes API pour la gestion des canaux de communication
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { requireAuth } from '../auth/helpers.js';

export async function handleChannelsRoutes(request, env, path, method) {
  try {
    // Vérifier l'authentification
    const authResult = await requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    // GET /api/v1/channels - Liste tous les canaux avec leur statut
    if (path === '/api/v1/channels' && method === 'GET') {
      return await listChannels(env, tenantId);
    }

    // GET /api/v1/channels/:type - Récupère la config d'un canal
    const channelMatch = path.match(/^\/api\/v1\/channels\/(phone|sms|email|whatsapp)$/);
    if (channelMatch && method === 'GET') {
      return await getChannelConfig(env, tenantId, channelMatch[1]);
    }

    // PUT /api/v1/channels/:type - Met à jour la config d'un canal
    if (channelMatch && method === 'PUT') {
      return await updateChannelConfig(request, env, tenantId, channelMatch[1]);
    }

    // POST /api/v1/channels/:type/enable - Active un canal
    const enableMatch = path.match(/^\/api\/v1\/channels\/(phone|sms|email|whatsapp)\/enable$/);
    if (enableMatch && method === 'POST') {
      return await enableChannel(env, tenantId, enableMatch[1]);
    }

    // POST /api/v1/channels/:type/disable - Désactive un canal
    const disableMatch = path.match(/^\/api\/v1\/channels\/(phone|sms|email|whatsapp)\/disable$/);
    if (disableMatch && method === 'POST') {
      return await disableChannel(env, tenantId, disableMatch[1]);
    }

    // POST /api/v1/channels/:type/test - Teste un canal
    const testMatch = path.match(/^\/api\/v1\/channels\/(phone|sms|email|whatsapp)\/test$/);
    if (testMatch && method === 'POST') {
      return await testChannel(request, env, tenantId, testMatch[1]);
    }

    // GET /api/v1/channels/stats - Stats globales des canaux
    if (path === '/api/v1/channels/stats' && method === 'GET') {
      return await getChannelsStats(env, tenantId);
    }

    return null;

  } catch (error) {
    logger.error('Channels route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// Liste tous les canaux avec leur statut
async function listChannels(env, tenantId) {
  const channelTypes = ['phone', 'sms', 'email', 'whatsapp'];
  const channels = [];

  for (const type of channelTypes) {
    const config = await env.DB.prepare(`
      SELECT id, channel_type, enabled, configured, config_public, assistant_id, updated_at
      FROM channel_configurations
      WHERE tenant_id = ? AND channel_type = ?
    `).bind(tenantId, type).first();

    channels.push({
      type,
      enabled: config?.enabled === 1,
      configured: config?.configured === 1,
      assistantId: config?.assistant_id || null,
      updatedAt: config?.updated_at || null
    });
  }

  return successResponse({ channels });
}

// Récupère la configuration complète d'un canal
async function getChannelConfig(env, tenantId, channelType) {
  const config = await env.DB.prepare(`
    SELECT id, channel_type, enabled, configured, config_public, templates, assistant_id, created_at, updated_at
    FROM channel_configurations
    WHERE tenant_id = ? AND channel_type = ?
  `).bind(tenantId, channelType).first();

  if (!config) {
    // Retourner une config par défaut
    return successResponse({
      channel: {
        type: channelType,
        enabled: false,
        configured: channelType === 'phone', // Phone est pré-configuré par l'admin
        config: getDefaultConfig(channelType),
        templates: {},
        assistantId: null
      }
    });
  }

  return successResponse({
    channel: {
      type: config.channel_type,
      enabled: config.enabled === 1,
      configured: config.configured === 1,
      config: JSON.parse(config.config_public || '{}'),
      templates: JSON.parse(config.templates || '{}'),
      assistantId: config.assistant_id,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }
  });
}

// Met à jour la configuration d'un canal
async function updateChannelConfig(request, env, tenantId, channelType) {
  const body = await request.json();
  const { config, configSecret, templates, enabled } = body;

  // Vérifier si la config existe
  const existing = await env.DB.prepare(`
    SELECT id FROM channel_configurations WHERE tenant_id = ? AND channel_type = ?
  `).bind(tenantId, channelType).first();

  const configId = existing?.id || `cfg_${channelType}_${tenantId}_${Date.now()}`;
  const now = new Date().toISOString();

  if (existing) {
    // Update - avec ou sans config_encrypted
    if (configSecret) {
      await env.DB.prepare(`
        UPDATE channel_configurations
        SET config_public = ?, config_encrypted = ?, templates = ?, enabled = ?, configured = 1, updated_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(config || {}),
        JSON.stringify(configSecret),
        JSON.stringify(templates || {}),
        enabled ? 1 : 0,
        now,
        existing.id
      ).run();
    } else {
      await env.DB.prepare(`
        UPDATE channel_configurations
        SET config_public = ?, templates = ?, enabled = ?, configured = 1, updated_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(config || {}),
        JSON.stringify(templates || {}),
        enabled ? 1 : 0,
        now,
        existing.id
      ).run();
    }
  } else {
    // Insert
    await env.DB.prepare(`
      INSERT INTO channel_configurations (id, tenant_id, channel_type, enabled, configured, config_public, config_encrypted, templates, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).bind(
      configId,
      tenantId,
      channelType,
      enabled ? 1 : 0,
      JSON.stringify(config || {}),
      JSON.stringify(configSecret || {}),
      JSON.stringify(templates || {}),
      now,
      now
    ).run();
  }

  logger.info('Channel config updated', { tenantId, channelType, enabled });

  return successResponse({
    message: 'Configuration mise à jour',
    channelType,
    enabled: enabled || false,
    configured: true
  });
}

// Active un canal
async function enableChannel(env, tenantId, channelType) {
  const existing = await env.DB.prepare(`
    SELECT id, configured FROM channel_configurations WHERE tenant_id = ? AND channel_type = ?
  `).bind(tenantId, channelType).first();

  if (!existing) {
    return errorResponse('Canal non configuré. Veuillez d\'abord configurer le canal.', 400);
  }

  if (!existing.configured) {
    return errorResponse('Canal non configuré. Veuillez d\'abord configurer le canal.', 400);
  }

  await env.DB.prepare(`
    UPDATE channel_configurations SET enabled = 1, updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), existing.id).run();

  logger.info('Channel enabled', { tenantId, channelType });

  return successResponse({ message: 'Canal activé', channelType, enabled: true });
}

// Désactive un canal
async function disableChannel(env, tenantId, channelType) {
  const existing = await env.DB.prepare(`
    SELECT id FROM channel_configurations WHERE tenant_id = ? AND channel_type = ?
  `).bind(tenantId, channelType).first();

  if (!existing) {
    return successResponse({ message: 'Canal déjà désactivé', channelType, enabled: false });
  }

  await env.DB.prepare(`
    UPDATE channel_configurations SET enabled = 0, updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), existing.id).run();

  logger.info('Channel disabled', { tenantId, channelType });

  return successResponse({ message: 'Canal désactivé', channelType, enabled: false });
}

// Teste un canal
async function testChannel(request, env, tenantId, channelType) {
  const body = await request.json();

  switch (channelType) {
    case 'phone':
      return await testPhoneChannel(env, tenantId, body);
    case 'sms':
      return await testSmsChannel(env, tenantId, body);
    case 'email':
      return await testEmailChannel(env, tenantId, body);
    case 'whatsapp':
      return await testWhatsappChannel(env, tenantId, body);
    default:
      return errorResponse('Type de canal inconnu', 400);
  }
}

// Test canal Phone (VAPI)
async function testPhoneChannel(env, tenantId, body) {
  // Pour le canal phone, on vérifie que la config VAPI est correcte
  const config = await env.DB.prepare(`
    SELECT assistant_id, config_public FROM channel_configurations
    WHERE tenant_id = ? AND channel_type = 'phone'
  `).bind(tenantId).first();

  if (!config?.assistant_id) {
    return errorResponse('Assistant VAPI non configuré', 400);
  }

  // Vérifier l'assistant VAPI via leur API
  try {
    const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${config.assistant_id}`, {
      headers: {
        'Authorization': `Bearer ${env.VAPI_API_KEY}`
      }
    });

    if (!vapiResponse.ok) {
      return errorResponse('Assistant VAPI introuvable ou invalide', 400);
    }

    const assistant = await vapiResponse.json();

    return successResponse({
      success: true,
      message: 'Configuration VAPI valide',
      assistant: {
        id: assistant.id,
        name: assistant.name,
        voice: assistant.voice
      }
    });
  } catch (error) {
    logger.error('VAPI test failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors du test VAPI: ' + error.message, 500);
  }
}

// Test canal SMS (Twilio)
async function testSmsChannel(env, tenantId, body) {
  const { toNumber } = body;

  if (!toNumber) {
    return errorResponse('Numéro de destination requis', 400);
  }

  try {
    // Envoyer un SMS de test via Twilio
    const twilioAccountSid = env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = env.TWILIO_PHONE_NUMBER;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: toNumber,
          From: twilioFromNumber,
          Body: '🧪 Test Coccinelle.AI - Votre canal SMS est correctement configuré !'
        })
      }
    );

    const result = await response.json();

    if (result.error_code) {
      return errorResponse(`Erreur Twilio: ${result.error_message}`, 400);
    }

    // Logger le message
    await logChannelMessage(env, tenantId, 'sms', toNumber, 'test', 'SMS de test', result.sid);

    return successResponse({
      success: true,
      message: 'SMS de test envoyé',
      messageId: result.sid
    });
  } catch (error) {
    logger.error('SMS test failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors de l\'envoi du SMS: ' + error.message, 500);
  }
}

// Test canal Email (Resend)
async function testEmailChannel(env, tenantId, body) {
  const { toEmail } = body;

  if (!toEmail) {
    return errorResponse('Email de destination requis', 400);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: toEmail,
        subject: '🧪 Test Coccinelle.AI - Canal Email',
        html: `
          <h1>Test réussi !</h1>
          <p>Votre canal Email est correctement configuré sur Coccinelle.AI.</p>
          <p>Vous pouvez maintenant envoyer des emails automatisés à vos prospects et clients.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par Coccinelle.AI</p>
        `
      })
    });

    const result = await response.json();

    if (result.error) {
      return errorResponse(`Erreur Resend: ${result.error.message}`, 400);
    }

    // Logger le message
    await logChannelMessage(env, tenantId, 'email', toEmail, 'test', 'Email de test', result.id);

    return successResponse({
      success: true,
      message: 'Email de test envoyé',
      messageId: result.id
    });
  } catch (error) {
    logger.error('Email test failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors de l\'envoi de l\'email: ' + error.message, 500);
  }
}

// Test canal WhatsApp via Meta Business API
async function testWhatsappChannel(env, tenantId, body) {
  const { toNumber } = body;

  if (!toNumber) {
    return errorResponse('Numéro WhatsApp de destination requis', 400);
  }

  // Récupérer la config WhatsApp du tenant
  const config = await env.DB.prepare(`
    SELECT config_encrypted FROM channel_configurations
    WHERE tenant_id = ? AND channel_type = 'whatsapp'
  `).bind(tenantId).first();

  if (!config?.config_encrypted) {
    return errorResponse('WhatsApp non configuré. Veuillez d\'abord configurer le canal.', 400);
  }

  let secretConfig;
  try {
    secretConfig = JSON.parse(config.config_encrypted);
  } catch {
    return errorResponse('Configuration WhatsApp invalide', 400);
  }

  const { accessToken, phoneNumberId } = secretConfig;

  if (!accessToken || !phoneNumberId) {
    return errorResponse('Token ou Phone Number ID manquant dans la configuration', 400);
  }

  // Formater le numéro (enlever les espaces et le +)
  const formattedNumber = toNumber.replace(/[\s+\-()]/g, '');

  try {
    // Envoyer un message template via Meta WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'template',
          template: {
            name: 'hello_world',
            language: { code: 'en_US' }
          }
        })
      }
    );

    const result = await response.json();

    if (result.error) {
      logger.error('WhatsApp API error', { error: result.error, tenantId });
      return errorResponse(`Erreur WhatsApp: ${result.error.message}`, 400);
    }

    // Logger le message
    await logChannelMessage(env, tenantId, 'whatsapp', formattedNumber, 'test', 'Message WhatsApp de test', result.messages?.[0]?.id);

    return successResponse({
      success: true,
      message: 'Message WhatsApp envoyé',
      messageId: result.messages?.[0]?.id
    });
  } catch (error) {
    logger.error('WhatsApp test failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors de l\'envoi WhatsApp: ' + error.message, 500);
  }
}

// Logger un message de canal
async function logChannelMessage(env, tenantId, channelType, toAddress, templateName, content, externalId) {
  const messageId = `msg_${channelType}_${Date.now()}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO channel_messages_log (id, tenant_id, channel_type, to_address, template_name, content, status, external_message_id, sent_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?)
  `).bind(
    messageId,
    tenantId,
    channelType,
    toAddress,
    templateName,
    content,
    externalId,
    now,
    now
  ).run();

  return messageId;
}

// Stats globales des canaux
async function getChannelsStats(env, tenantId) {
  // Messages par canal (derniers 30 jours)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const stats = await env.DB.prepare(`
    SELECT
      channel_type,
      COUNT(*) as total_messages,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(COALESCE(cost_cents, 0)) as total_cost_cents
    FROM channel_messages_log
    WHERE tenant_id = ? AND created_at >= ?
    GROUP BY channel_type
  `).bind(tenantId, thirtyDaysAgo).all();

  // Appels vocaux (derniers 30 jours)
  const callStats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN call_status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      SUM(COALESCE(duration_seconds, 0)) as total_duration,
      SUM(COALESCE(cost_cents, 0)) as total_cost_cents
    FROM call_logs
    WHERE tenant_id = ? AND created_at >= ?
  `).bind(tenantId, thirtyDaysAgo).first();

  return successResponse({
    period: 'last_30_days',
    messages: stats.results,
    calls: callStats,
    totalCostCents: (stats.results.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0)) + (callStats?.total_cost_cents || 0)
  });
}

// Configuration par défaut selon le type de canal
function getDefaultConfig(channelType) {
  switch (channelType) {
    case 'phone':
      return {
        clientPhoneNumber: '',
        twilioSharedNumber: '+33939035761',
        sara: {
          voice: 'female',
          assistantName: 'Sara',
          agentType: 'reception',
          language: 'fr-FR',
          customInstructions: ''
        },
        transferConfigured: false
      };
    case 'sms':
      return {
        templates: {
          reminder_24h: true,
          reminder_1h: true,
          confirmation: true,
          cancellation: true
        }
      };
    case 'email':
      return {
        smtp: {
          host: '',
          port: 587,
          fromEmail: '',
          fromName: ''
        },
        templates: {
          reminder_24h: true,
          confirmation: true,
          welcome: true
        }
      };
    case 'whatsapp':
      return {
        connectionMethod: 'api',
        whatsappNumber: '',
        templates: {
          reminder_24h: true,
          confirmation: true
        }
      };
    default:
      return {};
  }
}

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


    // ===================================
    // EMAIL DOMAIN ROUTES
    // ===================================

    // GET /api/v1/channels/email/domains - Liste les domaines du tenant
    if (path === '/api/v1/channels/email/domains' && method === 'GET') {
      return await listEmailDomains(env, tenantId);
    }

    // POST /api/v1/channels/email/domains - Ajoute un nouveau domaine
    if (path === '/api/v1/channels/email/domains' && method === 'POST') {
      return await addEmailDomain(request, env, tenantId);
    }

    // POST /api/v1/channels/email/domains/:id/verify - Vérifie le domaine
    const verifyDomainMatch = path.match(/^\/api\/v1\/channels\/email\/domains\/([^/]+)\/verify$/);
    if (verifyDomainMatch && method === 'POST') {
      return await verifyEmailDomain(env, tenantId, verifyDomainMatch[1]);
    }

    // DELETE /api/v1/channels/email/domains/:id - Supprime un domaine
    const deleteDomainMatch = path.match(/^\/api\/v1\/channels\/email\/domains\/([^/]+)$/);
    if (deleteDomainMatch && method === 'DELETE') {
      return await deleteEmailDomain(env, tenantId, deleteDomainMatch[1]);
    }

    // GET /api/v1/channels/email/domains/:id - Détails d'un domaine
    const getDomainMatch = path.match(/^\/api\/v1\/channels\/email\/domains\/([^/]+)$/);
    if (getDomainMatch && method === 'GET') {
      return await getEmailDomain(env, tenantId, getDomainMatch[1]);
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

  // Single query instead of N+1
  const configs = await env.DB.prepare(`
    SELECT channel_type, enabled, configured, assistant_id, updated_at
    FROM channel_configurations
    WHERE tenant_id = ? AND channel_type IN ('phone', 'sms', 'email', 'whatsapp')
  `).bind(tenantId).all();

  const configMap = {};
  for (const c of (configs.results || [])) {
    configMap[c.channel_type] = c;
  }

  const channels = channelTypes.map(type => {
    const config = configMap[type];
    return {
      type,
      enabled: config?.enabled === 1,
      configured: config?.configured === 1,
      assistantId: config?.assistant_id || null,
      updatedAt: config?.updated_at || null
    };
  });

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

  // Si canal phone : créer/mettre à jour omni_agent_configs et omni_phone_mappings
  if (channelType === 'phone' && config) {
    await syncOmniChannelPhoneConfig(env, tenantId, config);
  }

  logger.info('Channel config updated', { tenantId, channelType, enabled });

  return successResponse({
    message: 'Configuration mise à jour',
    channelType,
    enabled: enabled || false,
    configured: true
  });
}

// Synchroniser la config phone vers les tables omnicanal
async function syncOmniChannelPhoneConfig(env, tenantId, config) {
  const now = new Date().toISOString();
  const { clientPhoneNumber, sara } = config;

  // 1. Créer/mettre à jour omni_agent_configs
  const existingAgent = await env.DB.prepare(`
    SELECT id FROM omni_agent_configs WHERE tenant_id = ?
  `).bind(tenantId).first();

  const agentData = {
    agent_name: sara?.assistantName || 'Sara',
    voice_provider: sara?.voice === 'female' ? 'elevenlabs' : 'elevenlabs',
    voice_id: sara?.voiceId || null,
    voice_language: sara?.language || 'fr-FR',
    greeting_message: sara?.scripts?.reception || sara?.customInstructions || 'Bonjour, je suis votre assistante virtuelle.',
  };

  if (existingAgent) {
    await env.DB.prepare(`
      UPDATE omni_agent_configs
      SET agent_name = ?, voice_provider = ?, voice_id = ?, voice_language = ?, greeting_message = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      agentData.agent_name,
      agentData.voice_provider,
      agentData.voice_id,
      agentData.voice_language,
      agentData.greeting_message,
      now,
      existingAgent.id
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO omni_agent_configs (tenant_id, agent_name, voice_provider, voice_id, voice_language, greeting_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      agentData.agent_name,
      agentData.voice_provider,
      agentData.voice_id,
      agentData.voice_language,
      agentData.greeting_message,
      now,
      now
    ).run();
  }

  // 2. Créer/mettre à jour omni_phone_mappings pour le numéro client
  if (clientPhoneNumber) {
    const existingMapping = await env.DB.prepare(`
      SELECT id FROM omni_phone_mappings WHERE phone_number = ?
    `).bind(clientPhoneNumber).first();

    if (existingMapping) {
      await env.DB.prepare(`
        UPDATE omni_phone_mappings
        SET tenant_id = ?, is_active = 1, updated_at = ?
        WHERE id = ?
      `).bind(tenantId, now, existingMapping.id).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO omni_phone_mappings (phone_number, tenant_id, channel_type, is_active, created_at, updated_at)
        VALUES (?, ?, 'voice', 1, ?, ?)
      `).bind(clientPhoneNumber, tenantId, now, now).run();
    }
  }

  logger.info('Omnichannel phone config synced', { tenantId, clientPhoneNumber });
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

// Test canal Phone (Twilio)
async function testPhoneChannel(env, tenantId, body) {
  // Vérifier que Twilio est configuré
  const twilioAccountSid = env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = env.TWILIO_AUTH_TOKEN;

  if (!twilioAccountSid || !twilioAuthToken) {
    return errorResponse('Configuration Twilio manquante', 400);
  }

  // Vérifier le compte Twilio
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`)
        }
      }
    );

    if (!response.ok) {
      return errorResponse('Compte Twilio invalide ou inaccessible', 400);
    }

    const account = await response.json();

    // Récupérer les numéros configurés
    const phoneNumbers = [
      env.TWILIO_PHONE_NUMBER || '+33939035760',
      env.TWILIO_PHONE_NUMBER_2 || '+33939035761'
    ];

    return successResponse({
      success: true,
      message: 'Configuration Twilio valide',
      account: {
        sid: account.sid,
        status: account.status,
        friendlyName: account.friendly_name
      },
      phoneNumbers: phoneNumbers
    });
  } catch (error) {
    logger.error('Twilio test failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors du test Twilio: ' + error.message, 500);
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

  const accessToken = secretConfig?.accessToken || env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = secretConfig?.phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;

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

// ===================================
// EMAIL DOMAIN FUNCTIONS
// ===================================

// Liste les domaines email du tenant
async function listEmailDomains(env, tenantId) {
  try {
    const domains = await env.DB.prepare(`
      SELECT id, domain, status, from_email, from_name, resend_domain_id, 
             dns_records, verified_at, created_at, updated_at
      FROM email_domains
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).bind(tenantId).all();

    return successResponse({
      domains: domains.results || []
    });
  } catch (error) {
    logger.error('List email domains failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors de la récupération des domaines', 500);
  }
}

// Ajoute un nouveau domaine email via Resend API
async function addEmailDomain(request, env, tenantId) {
  try {
    const body = await request.json();
    const { domain, fromEmail, fromName } = body;

    if (!domain) {
      return errorResponse('Le domaine est requis', 400);
    }

    // Vérifier si le domaine existe déjà pour ce tenant
    const existing = await env.DB.prepare(`
      SELECT id FROM email_domains WHERE tenant_id = ? AND domain = ?
    `).bind(tenantId, domain).first();

    if (existing) {
      return errorResponse('Ce domaine est déjà configuré', 400);
    }

    // Appeler l'API Resend pour créer le domaine
    const resendResponse = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: domain
      })
    });

    const resendData = await resendResponse.json();

    if (resendData.error || !resendResponse.ok) {
      logger.error('Resend domain creation failed', { error: resendData, domain });
      return errorResponse(resendData.error?.message || 'Erreur Resend lors de la création du domaine', 400);
    }

    // Générer un ID unique
    const domainId = `domain_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Sauvegarder en base avec les DNS records retournés par Resend
    await env.DB.prepare(`
      INSERT INTO email_domains (id, tenant_id, domain, resend_domain_id, status, from_email, from_name, dns_records, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      domainId,
      tenantId,
      domain,
      resendData.id,
      fromEmail || `contact@${domain}`,
      fromName || '',
      JSON.stringify(resendData.records || [])
    ).run();

    return successResponse({
      success: true,
      message: 'Domaine ajouté avec succès',
      domain: {
        id: domainId,
        domain: domain,
        resendDomainId: resendData.id,
        status: 'pending',
        fromEmail: fromEmail || `contact@${domain}`,
        fromName: fromName || '',
        dnsRecords: resendData.records || []
      }
    });
  } catch (error) {
    logger.error('Add email domain failed', { error: error.message, tenantId });
    return errorResponse('Erreur lors de l\'ajout du domaine: ' + error.message, 500);
  }
}

// Vérifie le domaine via Resend API
async function verifyEmailDomain(env, tenantId, domainId) {
  try {
    // Récupérer le domaine en base
    const domainRecord = await env.DB.prepare(`
      SELECT * FROM email_domains WHERE id = ? AND tenant_id = ?
    `).bind(domainId, tenantId).first();

    if (!domainRecord) {
      return errorResponse('Domaine non trouvé', 404);
    }

    // Appeler l'API Resend pour vérifier le domaine
    const resendResponse = await fetch(`https://api.resend.com/domains/${domainRecord.resend_domain_id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const resendData = await resendResponse.json();

    if (resendData.error) {
      return errorResponse(resendData.error.message || 'Erreur lors de la vérification', 400);
    }

    // Récupérer le statut mis à jour
    const statusResponse = await fetch(`https://api.resend.com/domains/${domainRecord.resend_domain_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`
      }
    });

    const statusData = await statusResponse.json();
    const newStatus = statusData.status || 'pending';
    const isVerified = newStatus === 'verified';

    // Mettre à jour en base
    await env.DB.prepare(`
      UPDATE email_domains 
      SET status = ?, 
          dns_records = ?,
          verified_at = CASE WHEN ? = 'verified' THEN datetime('now') ELSE verified_at END,
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      newStatus,
      JSON.stringify(statusData.records || []),
      newStatus,
      domainId,
      tenantId
    ).run();

    return successResponse({
      success: true,
      status: newStatus,
      verified: isVerified,
      message: isVerified ? 'Domaine vérifié avec succès !' : 'Vérification en cours, les DNS ne sont pas encore propagés.',
      dnsRecords: statusData.records || []
    });
  } catch (error) {
    logger.error('Verify email domain failed', { error: error.message, tenantId, domainId });
    return errorResponse('Erreur lors de la vérification: ' + error.message, 500);
  }
}

// Supprime un domaine email
async function deleteEmailDomain(env, tenantId, domainId) {
  try {
    // Récupérer le domaine en base
    const domainRecord = await env.DB.prepare(`
      SELECT * FROM email_domains WHERE id = ? AND tenant_id = ?
    `).bind(domainId, tenantId).first();

    if (!domainRecord) {
      return errorResponse('Domaine non trouvé', 404);
    }

    // Supprimer chez Resend si on a l'ID
    if (domainRecord.resend_domain_id) {
      try {
        await fetch(`https://api.resend.com/domains/${domainRecord.resend_domain_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`
          }
        });
      } catch (resendError) {
        logger.warn('Failed to delete domain from Resend', { error: resendError.message });
        // Continue même si Resend échoue
      }
    }

    // Supprimer en base
    await env.DB.prepare(`
      DELETE FROM email_domains WHERE id = ? AND tenant_id = ?
    `).bind(domainId, tenantId).run();

    return successResponse({
      success: true,
      message: 'Domaine supprimé avec succès'
    });
  } catch (error) {
    logger.error('Delete email domain failed', { error: error.message, tenantId, domainId });
    return errorResponse('Erreur lors de la suppression: ' + error.message, 500);
  }
}

// Récupère les détails d'un domaine
async function getEmailDomain(env, tenantId, domainId) {
  try {
    const domainRecord = await env.DB.prepare(`
      SELECT * FROM email_domains WHERE id = ? AND tenant_id = ?
    `).bind(domainId, tenantId).first();

    if (!domainRecord) {
      return errorResponse('Domaine non trouvé', 404);
    }

    // Parser les DNS records
    let dnsRecords = [];
    try {
      dnsRecords = JSON.parse(domainRecord.dns_records || '[]');
    } catch (e) {
      dnsRecords = [];
    }

    return successResponse({
      domain: {
        id: domainRecord.id,
        domain: domainRecord.domain,
        status: domainRecord.status,
        fromEmail: domainRecord.from_email,
        fromName: domainRecord.from_name,
        resendDomainId: domainRecord.resend_domain_id,
        dnsRecords: dnsRecords,
        verifiedAt: domainRecord.verified_at,
        createdAt: domainRecord.created_at,
        updatedAt: domainRecord.updated_at
      }
    });
  } catch (error) {
    logger.error('Get email domain failed', { error: error.message, tenantId, domainId });
    return errorResponse('Erreur lors de la récupération: ' + error.message, 500);
  }
}

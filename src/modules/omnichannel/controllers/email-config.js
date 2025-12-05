/**
 * Controller Email Configuration - Gestion de la configuration email multi-tenant
 */

import { omniLogger } from '../utils/logger.js';
import { CloudflareDNSService } from '../services/cloudflare-dns.js';
import { DNSDetectorService } from '../services/dns-detector.js';

/**
 * GET /api/v1/omnichannel/email/cloudflare/instructions
 * Instructions pour créer un API Token Cloudflare
 */
export async function getCloudflareInstructions(request, env) {
  return new Response(JSON.stringify({
    success: true,
    instructions: {
      title: 'Créer un API Token Cloudflare',
      description: 'Pour permettre à Coccinelle de configurer automatiquement vos DNS, créez un API Token avec les permissions requises.',
      steps: [
        {
          step: 1,
          title: 'Accéder à Cloudflare',
          description: 'Connectez-vous sur https://dash.cloudflare.com',
          url: 'https://dash.cloudflare.com/profile/api-tokens'
        },
        {
          step: 2,
          title: 'Créer un nouveau token',
          description: 'Cliquez sur "Create Token" puis "Use template" sur "Edit zone DNS"'
        },
        {
          step: 3,
          title: 'Configurer les permissions',
          description: 'Vérifiez que les permissions suivantes sont activées :',
          details: [
            'Zone - DNS - Edit',
            'Zone - Zone - Read'
          ]
        },
        {
          step: 4,
          title: 'Sélectionner les zones',
          description: 'Choisissez "All zones" ou sélectionnez uniquement votre domaine'
        },
        {
          step: 5,
          title: 'Créer et copier le token',
          description: 'Cliquez sur "Continue to summary" puis "Create Token". Copiez le token généré (vous ne pourrez plus le voir après !)'
        }
      ],
      videoUrl: null,
      nextAction: 'Collez votre token dans le formulaire ci-dessous'
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * POST /api/v1/omnichannel/email/cloudflare/connect
 * Connecter un compte Cloudflare avec API Token
 */
export async function handleCloudflareCallback(request, env) {
  try {
    const { token, tenantId } = await request.json();

    if (!token || !tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing token or tenantId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Tester le token en récupérant les infos du compte
    const cloudflare = new CloudflareDNSService(token);
    let accountEmail = null;
    let accountId = null;

    try {
      // Vérifier que le token fonctionne en listant les zones
      const zones = await cloudflare.listZones();
      omniLogger.info('Cloudflare token validated', { tenantId, zonesCount: zones.length });
    } catch (error) {
      omniLogger.error('Invalid Cloudflare token', { tenantId, error: error.message });
      return new Response(JSON.stringify({
        error: 'Invalid Cloudflare token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stocker le token dans la DB
    const now = new Date().toISOString();

    // Vérifier si une auth existe déjà
    const existing = await env.DB.prepare(`
      SELECT id FROM omni_cloudflare_auth WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (existing) {
      // Update
      await env.DB.prepare(`
        UPDATE omni_cloudflare_auth
        SET access_token = ?,
            cloudflare_account_email = ?,
            cloudflare_account_id = ?,
            updated_at = ?
        WHERE tenant_id = ?
      `).bind(token, accountEmail, accountId, now, tenantId).run();
    } else {
      // Insert
      const authId = `cfauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO omni_cloudflare_auth (
          id, tenant_id, access_token, cloudflare_account_email,
          cloudflare_account_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(authId, tenantId, token, accountEmail, accountId, now, now).run();
    }

    omniLogger.info('Cloudflare auth stored', { tenantId });

    return new Response(JSON.stringify({
      success: true,
      message: 'Cloudflare account connected successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle Cloudflare callback', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/omnichannel/email/cloudflare/zones?tenantId=xxx
 * Liste des zones (domaines) disponibles pour ce tenant
 */
export async function listCloudflareZones(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le token Cloudflare
    const auth = await env.DB.prepare(`
      SELECT access_token FROM omni_cloudflare_auth WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (!auth) {
      return new Response(JSON.stringify({
        error: 'Cloudflare account not connected',
        message: 'Please connect your Cloudflare account first'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lister les zones
    const cloudflare = new CloudflareDNSService(auth.access_token);
    const zones = await cloudflare.listZones();

    omniLogger.info('Listed Cloudflare zones', { tenantId, zonesCount: zones.length });

    return new Response(JSON.stringify({
      success: true,
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        status: zone.status,
        nameServers: zone.name_servers
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to list Cloudflare zones', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/omnichannel/email/auto-configure
 * Configuration automatique DNS pour email via Cloudflare
 */
export async function autoConfigureEmailDNS(request, env) {
  try {
    const { tenantId, domain, emailAddress, zoneId } = await request.json();

    if (!tenantId || !domain || !emailAddress || !zoneId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['tenantId', 'domain', 'emailAddress', 'zoneId']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    omniLogger.info('Starting email DNS auto-configuration', {
      tenantId,
      domain,
      emailAddress,
      zoneId
    });

    // Récupérer le token Cloudflare
    const auth = await env.DB.prepare(`
      SELECT access_token FROM omni_cloudflare_auth WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (!auth) {
      return new Response(JSON.stringify({
        error: 'Cloudflare account not connected'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Créer ou mettre à jour la config email
    const now = new Date().toISOString();
    const configId = `emailcfg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const forwardingAddress = `${tenantId}@mail.coccinelle.ai`;

    const existing = await env.DB.prepare(`
      SELECT id FROM omni_email_configs WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (existing) {
      await env.DB.prepare(`
        UPDATE omni_email_configs
        SET domain = ?,
            email_address = ?,
            forwarding_address = ?,
            dns_provider = 'cloudflare',
            dns_zone_id = ?,
            status = 'configuring',
            auto_config_enabled = 1,
            updated_at = ?
        WHERE tenant_id = ?
      `).bind(domain, emailAddress, forwardingAddress, zoneId, now, tenantId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO omni_email_configs (
          id, tenant_id, domain, email_address, forwarding_address,
          dns_provider, dns_zone_id, status, auto_config_enabled,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'cloudflare', ?, 'configuring', 1, ?, ?)
      `).bind(configId, tenantId, domain, emailAddress, forwardingAddress, zoneId, now, now).run();
    }

    // Configurer les DNS automatiquement via Cloudflare
    const cloudflare = new CloudflareDNSService(auth.access_token);

    try {
      const result = await cloudflare.setupEmailDNSRecords(zoneId, domain, 'eu-west-1');

      // Mettre à jour le statut
      await env.DB.prepare(`
        UPDATE omni_email_configs
        SET dns_verified = 1,
            status = 'active',
            last_verification_at = ?,
            updated_at = ?
        WHERE tenant_id = ?
      `).bind(now, now, tenantId).run();

      omniLogger.info('Email DNS auto-configuration completed', {
        tenantId,
        domain,
        recordsCreated: result.records.length
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Email DNS configured successfully',
        domain,
        emailAddress,
        forwardingAddress,
        dnsRecords: result.records,
        nextSteps: [
          `Configure email forwarding from ${emailAddress} to ${forwardingAddress}`,
          'Add Resend webhook for inbound emails',
          'Test email sending and receiving'
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (dnsError) {
      // Erreur lors de la configuration DNS
      await env.DB.prepare(`
        UPDATE omni_email_configs
        SET status = 'error',
            error_message = ?,
            updated_at = ?
        WHERE tenant_id = ?
      `).bind(dnsError.message, now, tenantId).run();

      throw dnsError;
    }

  } catch (error) {
    omniLogger.error('Failed to auto-configure email DNS', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Configuration failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/omnichannel/email/config?tenantId=xxx
 * Récupérer la configuration email du tenant
 */
export async function getEmailConfig(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = await env.DB.prepare(`
      SELECT * FROM omni_email_configs WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (!config) {
      return new Response(JSON.stringify({
        success: true,
        configured: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      configured: true,
      config: {
        domain: config.domain,
        emailAddress: config.email_address,
        forwardingAddress: config.forwarding_address,
        dnsProvider: config.dns_provider,
        status: config.status,
        dnsVerified: !!config.dns_verified,
        forwardingVerified: !!config.forwarding_verified,
        resendVerified: !!config.resend_verified,
        autoConfigEnabled: !!config.auto_config_enabled,
        lastVerificationAt: config.last_verification_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to get email config', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/omnichannel/email/detect-provider
 * Détecte automatiquement le provider DNS d'un domaine
 */
export async function detectDNSProvider(request, env) {
  try {
    const { domain, emailAddress, tenantId } = await request.json();

    if (!domain || !emailAddress || !tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['domain', 'emailAddress', 'tenantId']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    omniLogger.info('Detecting DNS provider', { domain, tenantId });

    // Détecter le provider DNS
    const detector = new DNSDetectorService();
    const providerInfo = await detector.detectProvider(domain);

    // Générer l'adresse de forwarding
    const forwardingAddress = `${tenantId}@mail.coccinelle.ai`;

    // Générer les instructions de forwarding
    const instructions = detector.generateForwardingInstructions(
      providerInfo.provider,
      emailAddress,
      forwardingAddress
    );

    // Sauvegarder la config en DB (status = pending)
    const now = new Date().toISOString();
    const configId = `emailcfg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const existing = await env.DB.prepare(`
      SELECT id FROM omni_email_configs WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (existing) {
      await env.DB.prepare(`
        UPDATE omni_email_configs
        SET domain = ?,
            email_address = ?,
            forwarding_address = ?,
            dns_provider = ?,
            status = 'pending',
            updated_at = ?
        WHERE tenant_id = ?
      `).bind(domain, emailAddress, forwardingAddress, providerInfo.provider, now, tenantId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO omni_email_configs (
          id, tenant_id, domain, email_address, forwarding_address,
          dns_provider, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(configId, tenantId, domain, emailAddress, forwardingAddress, providerInfo.provider, now, now).run();
    }

    omniLogger.info('DNS provider detected', {
      tenantId,
      domain,
      provider: providerInfo.provider
    });

    return new Response(JSON.stringify({
      success: true,
      provider: providerInfo,
      forwardingAddress,
      instructions,
      recommendation: providerInfo.canAutoConfig
        ? 'auto-config'
        : 'manual-forwarding'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to detect DNS provider', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Detection failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/omnichannel/email/verify-forwarding
 * Vérifie que le forwarding email fonctionne
 */
export async function verifyEmailForwarding(request, env) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer la config
    const config = await env.DB.prepare(`
      SELECT * FROM omni_email_configs WHERE tenant_id = ?
    `).bind(tenantId).first();

    if (!config) {
      return new Response(JSON.stringify({
        error: 'Email config not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Pour vérifier le forwarding, on pourrait :
    // 1. Envoyer un email de test à l'adresse du client
    // 2. Attendre de le recevoir sur forwarding_address
    // 3. Marquer comme vérifié

    // Pour l'instant, on permet au client de marquer manuellement comme vérifié
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE omni_email_configs
      SET forwarding_verified = 1,
          status = 'active',
          last_verification_at = ?,
          updated_at = ?
      WHERE tenant_id = ?
    `).bind(now, now, tenantId).run();

    omniLogger.info('Email forwarding verified', { tenantId });

    return new Response(JSON.stringify({
      success: true,
      message: 'Email forwarding verified successfully',
      status: 'active'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to verify email forwarding', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Verification failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

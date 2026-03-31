// Module VoixIA — Middleware d'authentification
// Supporte deux méthodes :
// 1. Clé API (X-VoixIA-Key + X-VoixIA-Tenant) — pour VoixIA agent serveur
// 2. JWT Bearer token (Authorization: Bearer ...) — pour le dashboard frontend

import { logger } from '../../utils/logger.js';
import { checkRateLimit, getClientIP } from '../../utils/rate-limiter.js';
import { generateId, logAudit, verifyToken } from '../auth/helpers.js';

/**
 * Middleware d'authentification VoixIA
 * Vérifie la clé API OU le JWT Bearer, puis le tenant. Applique le rate limiting.
 *
 * @param {Request} request - Requête entrante
 * @param {object} env - Environnement Cloudflare (bindings, secrets)
 * @returns {{ error?: string, status?: number, tenant_id?: string, tenant?: object }}
 */
export async function requireVoixIAAuth(request, env) {
  const apiKey = request.headers.get('X-VoixIA-Key');
  const authHeader = request.headers.get('Authorization');

  // ── Méthode 1 : Clé API VoixIA (pour l'agent serveur) ──
  if (apiKey) {
    if (!env.VOIXIA_API_KEY) {
      logger.error('VOIXIA_API_KEY non configurée dans les variables d\'environnement');
      return { error: 'Service VoixIA non configuré', status: 503 };
    }

    if (!timingSafeEqual(apiKey, env.VOIXIA_API_KEY)) {
      logger.warn('VoixIA auth failed — clé API invalide', { ip: getClientIP(request) });
      return { error: 'Clé API VoixIA invalide', status: 401 };
    }

    const tenantId = request.headers.get('X-VoixIA-Tenant');
    if (!tenantId) {
      return { error: 'Header X-VoixIA-Tenant manquant', status: 400 };
    }

    return await validateTenantAndLog(request, env, tenantId, 'voixia-agent');
  }

  // ── Méthode 2 : JWT Bearer (pour le dashboard frontend) ──
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (!token) {
      return { error: 'Token manquant', status: 401 };
    }

    const payload = verifyToken(token, env.JWT_SECRET);
    if (!payload) {
      return { error: 'Token invalide ou expiré', status: 401 };
    }

    const tenantId = payload.tenant_id;
    if (!tenantId) {
      return { error: 'Token sans tenant_id', status: 401 };
    }

    return await validateTenantAndLog(request, env, tenantId, payload.user_id || payload.sub || 'dashboard-user');
  }

  // ── Aucune méthode d'authentification ──
  return { error: 'Authentification requise (X-VoixIA-Key ou Bearer token)', status: 401 };
}

/**
 * Valide le tenant en DB, applique le rate limiting, et logue l'appel.
 */
async function validateTenantAndLog(request, env, tenantId, userId) {
  // Rate limiting : 100 appels/minute par tenant
  const rateLimitKey = `voixia:${tenantId}`;
  const rateCheck = checkRateLimit(rateLimitKey, 100, 60000);

  if (!rateCheck.allowed) {
    logger.warn('VoixIA rate limit atteint', { tenantId, retryAfter: rateCheck.retryAfter });
    return { error: 'Trop de requêtes VoixIA — réessayez dans quelques secondes', status: 429 };
  }

  try {
    const tenant = await env.DB.prepare(
      'SELECT id, name, company_name, status FROM tenants WHERE id = ?'
    ).bind(tenantId).first();

    if (!tenant) {
      logger.warn('VoixIA auth — tenant introuvable', { tenantId });
      return { error: 'Tenant introuvable', status: 404 };
    }

    if (tenant.status && tenant.status !== 'active' && tenant.status !== 'trial') {
      return { error: 'Tenant inactif', status: 403 };
    }

    await logAudit(env, {
      tenant_id: tenantId,
      user_id: userId,
      action: 'voixia.api_call',
      resource_type: 'voixia',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('User-Agent')
    });

    return { tenant_id: tenantId, tenant };

  } catch (error) {
    logger.error('VoixIA auth — erreur DB', { error: error.message, tenantId });
    return { error: 'Erreur interne d\'authentification', status: 500 };
  }
}

/**
 * Comparaison en temps constant de deux chaînes
 * Protège contre les attaques par timing sur la clé API.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  // XOR de chaque octet — le résultat est 0 seulement si tous les octets sont identiques
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }

  return result === 0;
}

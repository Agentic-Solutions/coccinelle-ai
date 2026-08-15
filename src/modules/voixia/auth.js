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

    // ── RATE LIMIT AVANT la validation de la clé (chantier ANTI-ROBOT) ──
    //
    // Le 401 tombait AVANT tout rate limit : un balayage de clés était donc
    // gratuit et illimité — mesuré le 15/08, une mauvaise clé répond en 0,25 s
    // sans toucher la base. Le limiteur est indexé sur l'IP et non sur le tenant,
    // parce qu'à ce stade aucun tenant n'est établi : c'est précisément ce qui
    // rendait la protection impossible là où elle se trouvait.
    //
    // ⚠️ CE LIMITEUR RESTE UNE `Map` EN MÉMOIRE DU WORKER, donc un compteur PAR
    // ISOLATE. Il élève le coût d'un balayage, il ne l'interdit pas. La protection
    // réelle demande une zone Cloudflare (`api.coccinelle.ai`) ou un compteur
    // partagé — backlog, avec la migration Scaleway. Ne pas confondre les deux.
    const limiteCle = checkRateLimit(`voixia-cle:${getClientIP(request)}`, 20, 60000);
    if (!limiteCle.allowed) {
      logger.warn('VoixIA — trop de tentatives de clé', { ip: getClientIP(request) });
      return { error: 'Trop de tentatives — réessayez dans une minute', status: 429 };
    }


    // ── Fenêtre de rotation ──
    // La clé vit à DEUX endroits : les secrets du Worker et /opt/voixia/.env sur
    // le serveur de l'agent. Avec une seule valeur acceptée, les tourner l'une
    // après l'autre coupe TOUS les appels entrants pendant l'intervalle
    // (resolve-phone en 401, l'agent ne décroche plus).
    // `VOIXIA_API_KEY_ROTATION` est un second secret TEMPORAIRE qui porte la
    // nouvelle clé le temps de la bascule : les deux valeurs sont acceptées, le
    // serveur peut passer quand il veut, et on supprime ce secret juste après.
    // ⚠️ Le laisser en place laisserait DEUX clés valides indéfiniment — c'est
    // exactement ce qu'une rotation cherche à supprimer. À effacer sitôt la
    // bascule vérifiée (procédure § r de CLAUDE.md).
    // ÉTAT AU 15/08/2026 : fenêtre FERMÉE — le secret de rotation est supprimé,
    // l'ancienne clé répond 401. Ce chemin reste pour la prochaine rotation.
    const cleValide = timingSafeEqual(apiKey, env.VOIXIA_API_KEY)
      || (env.VOIXIA_API_KEY_ROTATION
          && timingSafeEqual(apiKey, env.VOIXIA_API_KEY_ROTATION));

    if (!cleValide) {
      logger.warn('VoixIA auth failed — clé API invalide', { ip: getClientIP(request) });
      // Comptage agrégé pour l'alerte quotidienne : non bloquant, et la table ne
      // grossit que d'une ligne par jour quoi qu'il arrive.
      compter401(env).catch(() => {});
      return { error: 'Clé API VoixIA invalide', status: 401 };
    }

    if (env.VOIXIA_API_KEY_ROTATION) {
      logger.warn('[Sécurité] Fenêtre de rotation OUVERTE — deux clés VoixIA sont valides. '
        + 'Supprimer VOIXIA_API_KEY_ROTATION dès la bascule terminée.');
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

    const payload = await verifyToken(token, env.JWT_SECRET);
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

    // Audit non-bloquant (fire-and-forget) — ne retarde pas la reponse temps-reel
    logAudit(env, {
      tenant_id: tenantId,
      user_id: userId,
      action: 'voixia.api_call',
      resource_type: 'voixia',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('User-Agent')
    }).catch(() => {});

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

/**
 * Compte les clés refusées, un agrégat par jour (chantier ANTI-ROBOT, 15/08/2026).
 *
 * POURQUOI EN BASE ET PAS DANS LES LOGS : `[observability.logs]` était désactivé —
 * les logs du Worker n'étaient pas conservés, donc un balayage de clés était non
 * seulement gratuit mais INVISIBLE. Les logs sont activés au même lot, mais un
 * compteur en base reste ce que le cron peut lire pour alerter.
 *
 * `INSERT … ON CONFLICT DO UPDATE` : une seule ligne par jour. Un attaquant nous
 * fait écrire une fois par tentative, mais la table ne grossit pas — compromis
 * assumé, faute de KV ou de Durable Object dans les liaisons déclarées.
 *
 * Ne lève jamais : l'authentification ne doit pas dépendre de la télémétrie.
 */
async function compter401(env) {
  if (!env?.DB) return;
  const jour = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(`
    INSERT INTO voixia_401_jour (jour, tentatives, updated_at)
    VALUES (?, 1, datetime('now'))
    ON CONFLICT (jour) DO UPDATE
      SET tentatives = tentatives + 1, updated_at = datetime('now')
  `).bind(jour).run();
}

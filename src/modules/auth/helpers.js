// src/auth.js - Fonctions d'authentification (Edge-compatible, Web Crypto)
import { logger } from '../../utils/logger.js';

/**
 * Génère un ID unique avec préfixe
 */
export function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}${randomStr}`;
}

/**
 * Génère un slug unique à partir d'un nom d'entreprise
 * Exemple: "Agence Dubois Immobilier" -> "agence-dubois-immobilier"
 */
export function generateSlug(companyName) {
  return companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, ''); // Enlève les tirets au début/fin
}

/**
 * Hash un mot de passe avec SHA-256 (Web Crypto)
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérifie un mot de passe contre un hash
 */
export async function verifyPassword(password, hash) {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// --- JWT helpers (HMAC-SHA256, Web Crypto) ---

function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

function parseExpiry(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400; // Default 7d
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { 's': 1, 'm': 60, 'h': 3600, 'd': 86400 };
  return value * (multipliers[unit] || 86400);
}

/**
 * Génère un JWT token (async, Web Crypto HMAC-SHA256)
 */
export async function generateToken(payload, secret, expiresIn = '7d') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(expiresIn);
  const jwtPayload = { ...payload, iat: now, exp };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const signature = await hmacSign(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Vérifie et décode un JWT token (async, Web Crypto HMAC-SHA256)
 */
export async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSignature = await hmacSign(`${headerB64}.${payloadB64}`, secret);
    if (signatureB64 !== expectedSignature) return null;
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Vérifie la signature d'un JWT mais IGNORE l'expiration.
 * Utilisé par le refresh token endpoint pour accepter des tokens expirés.
 * Retourne le payload décodé si la signature est valide, null sinon.
 */
export async function verifyTokenIgnoreExpiry(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSignature = await hmacSign(`${headerB64}.${payloadB64}`, secret);
    if (signatureB64 !== expectedSignature) return null;
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Valide un email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide la force d'un mot de passe
 * Minimum 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
 */
export function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Middleware d'authentification
 * Vérifie le JWT token et retourne user + tenant
 */
export async function requireAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      error: 'Token manquant. Utilisez: Authorization: Bearer <token>', 
      status: 401 
    };
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Vérifier JWT
    const decoded = await verifyToken(token, env.JWT_SECRET);
    
    if (!decoded) {
      return { error: 'Token invalide ou expiré', status: 401 };
    }
    
    // Vérifier session en DB
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
    ).bind(token).first();
    
    if (!session) {
      return { error: 'Session invalide ou expirée', status: 401 };
    }
    
    // Récupérer user (include phone, phone_verified, email_verified for /me endpoint)
    const user = await env.DB.prepare(
      'SELECT id, tenant_id, email, name, role, is_active, weekly_report_enabled, phone, phone_verified, email_verified FROM users WHERE id = ?'
    ).bind(decoded.user_id).first();
    
    if (!user) {
      return { error: 'Utilisateur introuvable', status: 401 };
    }
    
    if (!user.is_active) {
      return { error: 'Compte désactivé', status: 403 };
    }
    
    // Récupérer tenant
    const tenant = await env.DB.prepare(
      'SELECT * FROM tenants WHERE id = ?'
    ).bind(decoded.tenant_id).first();
    
    if (!tenant) {
      return { error: 'Organisation introuvable', status: 401 };
    }
    
    // Allow null status (legacy) or active/trial status
    if (tenant.status && tenant.status !== 'active' && tenant.status !== 'trial') {
      return { error: 'Organisation inactive', status: 403 };
    }
    
    return { user, tenant, session };
    
  } catch (error) {
    logger.error('Auth error', { error: error.message });
    return { error: 'Erreur d\'authentification', status: 500 };
  }
}

/**
 * Enregistre une action dans les audit logs
 */
export async function logAudit(env, {
  tenant_id,
  user_id = null,
  action,
  resource_type = null,
  resource_id = null,
  changes = null,
  ip_address = null,
  user_agent = null
}) {
  try {
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        id, tenant_id, user_id, action, resource_type, resource_id,
        changes, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      generateId('audit'),
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      changes ? JSON.stringify(changes) : null,
      ip_address,
      user_agent
    ).run();
  } catch (error) {
    logger.error('Audit log error', { error: error.message });
    // Ne pas bloquer la requête si l'audit échoue
  }
}

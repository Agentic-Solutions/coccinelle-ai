// src/auth.js - Fonctions d'authentification
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
 * Hash un mot de passe avec bcrypt
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Vérifie un mot de passe contre un hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Génère un JWT token
 */
export function generateToken(payload, secret, expiresIn = '7d') {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Vérifie et décode un JWT token
 */
export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
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
    const decoded = verifyToken(token, env.JWT_SECRET);
    
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
    
    // Récupérer user
    const user = await env.DB.prepare(
      'SELECT id, tenant_id, email, name, role, is_active FROM users WHERE id = ?'
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
    
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return { error: 'Organisation inactive', status: 403 };
    }
    
    return { user, tenant, session };
    
  } catch (error) {
    console.error('Auth error:', error);
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
    console.error('Audit log error:', error);
    // Ne pas bloquer la requête si l'audit échoue
  }
}

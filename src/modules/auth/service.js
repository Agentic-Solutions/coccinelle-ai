// Module Auth - Services (JWT, Bcrypt, etc.)
import { logger } from '../../utils/logger.js';

// Fonction pour hasher un mot de passe (simulation bcrypt)
export async function hashPassword(password) {
  // Note: Pour production, utiliser une vraie lib bcrypt
  // Ici c'est une simulation simple
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fonction pour vérifier un mot de passe
export async function verifyPassword(password, hash) {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// Fonction pour générer un JWT
export async function generateJWT(payload, secret, expiresIn = '24h') {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(expiresIn);
  
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Fonction pour vérifier un JWT
export async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new Error('Invalid token format');
    }
    
    // Vérifier la signature
    const expectedSignature = await sign(`${headerB64}.${payloadB64}`, secret);
    if (signatureB64 !== expectedSignature) {
      throw new Error('Invalid signature');
    }
    
    // Décoder le payload
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    
    // Vérifier l'expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }
    
    return payload;
    
  } catch (error) {
    logger.error('JWT verification failed', { error: error.message });
    throw error;
  }
}

// Utilitaires
function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function sign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

function parseExpiry(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 86400; // Default 24h
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
  };
  
  return value * (multipliers[unit] || 3600);
}

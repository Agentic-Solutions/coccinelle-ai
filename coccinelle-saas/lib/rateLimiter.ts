/**
 * Rate Limiter simple en mémoire
 * Limite le nombre de requêtes par utilisateur/tenant
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en mémoire (en production, utiliser Redis)
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number; // Nombre max de requêtes
  windowMs: number;    // Fenêtre de temps en ms
}

// Configuration par défaut: 10 requêtes par 60 secondes
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Vérifie si une requête est autorisée
 * @param identifier - Identifiant unique (tenant ID, user ID, IP, etc.)
 * @param config - Configuration du rate limit
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  // Première requête ou fenêtre expirée
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    store.set(identifier, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Incrémenter le compteur
  entry.count++;

  // Limite dépassée
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // en secondes
    };
  }

  // OK
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset le rate limit pour un identifiant
 * Utile pour les tests ou administrateurs
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Nettoie les entrées expirées (à appeler périodiquement)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}

// Nettoyage automatique toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

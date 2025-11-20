/**
 * Configuration centralisée de l'application
 */

// Détecter si on utilise l'API locale ou externe
const useLocalAPI = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const API_CONFIG = {
  // Utiliser l'API locale en développement, externe en production
  baseURL: useLocalAPI
    ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    : (process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev'),
  apiKey: process.env.NEXT_PUBLIC_API_KEY || 'demo-key-12345',
  useLocalAPI,

  // Endpoints - adaptés selon API locale ou externe
  endpoints: {
    knowledge: {
      crawl: useLocalAPI ? '/api/knowledge/crawl' : '/api/v1/knowledge/crawl',
      documents: useLocalAPI ? '/api/knowledge/documents' : '/api/v1/knowledge/documents',
      upload: useLocalAPI ? '/api/knowledge/documents/upload' : '/api/v1/knowledge/documents/upload',
      ask: useLocalAPI ? '/api/knowledge/ask' : '/api/v1/knowledge/ask'
    },
    vapi: {
      calls: '/api/v1/vapi/calls'
    },
    appointments: '/api/v1/appointments',
    crm: {
      integrations: '/api/crm/integrations',
      sync: '/api/crm/sync'
    }
  }
};

/**
 * Utilitaires pour construire des URLs complètes
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}${endpoint}`;
};

/**
 * Headers par défaut pour les requêtes API
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Récupérer l'ID du tenant actuel
 * Pour l'instant retourne un ID basé sur l'email stocké, sinon un ID par défaut
 * TODO: À connecter avec le vrai système d'authentification
 */
export const getCurrentTenantId = (): string => {
  if (typeof window === 'undefined') return 'default-tenant';

  // Essayer de récupérer l'email depuis l'objet user
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.email) {
        // Créer un ID unique basé sur l'email
        return `tenant_${btoa(user.email).replace(/=/g, '').substring(0, 16)}`;
      }
    }
  } catch (e) {
    // Si erreur de parsing, continuer vers le fallback
  }

  // Sinon, créer ou récupérer un ID unique pour ce navigateur
  let browserId = localStorage.getItem('browser_tenant_id');
  if (!browserId) {
    browserId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('browser_tenant_id', browserId);
  }

  return browserId;
};

/**
 * Clé localStorage isolée par tenant
 */
export const getTenantStorageKey = (key: string): string => {
  return `${getCurrentTenantId()}_${key}`;
};

/**
 * Migre les anciens documents vers le tenant actuel
 * Cette fonction est appelée une seule fois au chargement pour déplacer
 * les documents de 'kb_documents' vers 'tenant_XXX_kb_documents'
 */
export const migrateOldDocuments = (): void => {
  if (typeof window === 'undefined') return;

  const migrationKey = `${getCurrentTenantId()}_migration_done`;

  // Si migration déjà faite pour ce tenant, ne rien faire
  if (localStorage.getItem(migrationKey) === 'true') {
    return;
  }

  // Vérifier s'il y a des anciens documents
  const oldDocs = localStorage.getItem('kb_documents');
  if (oldDocs && oldDocs !== '[]') {
    try {
      // Récupérer les documents du tenant actuel
      const tenantKey = getTenantStorageKey('kb_documents');
      const tenantDocs = JSON.parse(localStorage.getItem(tenantKey) || '[]');

      // Si le tenant a déjà des documents, ne pas migrer (éviter les doublons)
      if (tenantDocs.length === 0) {
        // Migrer les anciens documents vers le tenant actuel
        localStorage.setItem(tenantKey, oldDocs);
        console.log('📦 Migration: Anciens documents déplacés vers le tenant actuel');
      }
    } catch (e) {
      console.error('❌ Erreur lors de la migration des documents:', e);
    }
  }

  // Marquer la migration comme faite
  localStorage.setItem(migrationKey, 'true');
};

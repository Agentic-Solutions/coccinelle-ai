/**
 * Module Email Inbound - Réception des emails via Cloudflare Email Routing
 * 
 * ARCHITECTURE CENTRALISÉE :
 * - Tous les emails arrivent sur : {slug}@coccinelle.ai
 * - Le Worker extrait le slug et trouve le tenant correspondant
 * - Pas de configuration DNS requise côté client !
 * 
 * Exemple : salon-marie@coccinelle.ai → tenant avec slug "salon-marie"
 */

import { logger } from '../../utils/logger.js';

/**
 * Génère un UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Parse le contenu d'un email (extrait le texte brut)
 */
async function parseEmailContent(message) {
  try {
    // Récupère le contenu brut de l'email
    const rawEmail = await new Response(message.raw).text();
    
    // Parse basique - extrait le body après les headers
    const parts = rawEmail.split('\r\n\r\n');
    if (parts.length > 1) {
      // Le body est tout ce qui vient après les headers
      let body = parts.slice(1).join('\r\n\r\n');
      
      // Si c'est du multipart, essaie d'extraire le text/plain
      if (rawEmail.includes('Content-Type: text/plain')) {
        const textMatch = body.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=--|\r\n\r\n--)/);
        if (textMatch) {
          body = textMatch[1];
        }
      }
      
      // Nettoie le body
      body = body.replace(/=\r\n/g, ''); // Quoted-printable
      body = body.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      body = body.trim();
      
      return body || '[Contenu non lisible]';
    }
    
    return '[Email vide]';
  } catch (error) {
    logger.error('Erreur parsing email', { error: error.message });
    return '[Erreur de lecture]';
  }
}

/**
 * Extrait le sujet de l'email depuis les headers
 */
function getSubject(message) {
  try {
    const subject = message.headers.get('subject');
    return subject || '(Sans objet)';
  } catch {
    return '(Sans objet)';
  }
}

/**
 * Extrait le slug de l'adresse email destinataire
 * Exemple: "salon-marie@coccinelle.ai" → "salon-marie"
 */
function extractSlugFromEmail(toEmail) {
  try {
    // Extrait la partie avant le @
    const localPart = toEmail.split('@')[0]?.toLowerCase();
    return localPart || null;
  } catch {
    return null;
  }
}

/**
 * Trouve le tenant par son slug
 * Cherche dans la table tenants où slug = {slug extrait}
 */
async function findTenantBySlug(db, slug) {
  try {
    if (!slug) return null;
    
    // Cherche le tenant par son slug
    const result = await db.prepare(`
      SELECT id FROM tenants 
      WHERE slug = ? AND status = 'active'
    `).bind(slug).first();
    
    if (result) return result.id;
    
    // Si pas trouvé avec status active, cherche quand même (pour les tests)
    const anyResult = await db.prepare(`
      SELECT id FROM tenants 
      WHERE slug = ?
    `).bind(slug).first();
    
    return anyResult?.id || null;
  } catch (error) {
    logger.error('Erreur recherche tenant par slug', { error: error.message, slug });
    return null;
  }
}

/**
 * FALLBACK : Trouve le tenant par domaine email (ancienne méthode)
 * Utilisé si le slug n'est pas trouvé (compatibilité)
 */
async function findTenantByEmailDomain(db, toEmail) {
  try {
    const domain = toEmail.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    
    // Cherche dans email_domains
    const result = await db.prepare(`
      SELECT tenant_id FROM email_domains 
      WHERE domain = ? AND status = 'verified'
    `).bind(domain).first();
    
    if (result) return result.tenant_id;
    
    const pendingResult = await db.prepare(`
      SELECT tenant_id FROM email_domains 
      WHERE domain = ?
    `).bind(domain).first();
    
    return pendingResult?.tenant_id || null;
  } catch (error) {
    logger.error('Erreur recherche tenant par domaine', { error: error.message });
    return null;
  }
}

/**
 * Trouve ou crée une conversation pour cet email
 * Utilise client_email et client_name (colonnes correctes)
 */
async function findOrCreateConversation(db, tenantId, fromEmail, fromName) {
  try {
    // Cherche une conversation existante avec ce client
    const existing = await db.prepare(`
      SELECT id FROM omni_conversations 
      WHERE tenant_id = ? AND client_email = ? AND status = 'active'
      ORDER BY last_message_at DESC
      LIMIT 1
    `).bind(tenantId, fromEmail).first();
    
    if (existing) {
      // Met à jour last_message_at
      await db.prepare(`
        UPDATE omni_conversations 
        SET last_message_at = CURRENT_TIMESTAMP, 
            current_channel = 'email',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(existing.id).run();
      
      return existing.id;
    }
    
    // Crée une nouvelle conversation
    const conversationId = generateUUID();
    await db.prepare(`
      INSERT INTO omni_conversations (
        id, tenant_id, client_email, client_name, 
        current_channel, active_channels, status,
        first_message_at, last_message_at
      ) VALUES (?, ?, ?, ?, 'email', '["email"]', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(conversationId, tenantId, fromEmail, fromName || fromEmail.split('@')[0]).run();
    
    return conversationId;
  } catch (error) {
    logger.error('Erreur création conversation', { error: error.message });
    throw error;
  }
}

/**
 * Stocke le message email dans la base
 */
async function storeEmailMessage(db, conversationId, fromEmail, subject, content) {
  try {
    const messageId = generateUUID();
    
    // Combine sujet et contenu pour le stockage
    const fullContent = subject !== '(Sans objet)' 
      ? `📧 ${subject}\n\n${content}`
      : content;
    
    await db.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, 
        content, content_type, sender_role
      ) VALUES (?, ?, 'email', 'inbound', ?, 'text', 'customer')
    `).bind(messageId, conversationId, fullContent).run();
    
    return messageId;
  } catch (error) {
    logger.error('Erreur stockage message', { error: error.message });
    throw error;
  }
}

/**
 * Handler principal pour les emails entrants
 * Appelé par Cloudflare Email Routing
 * 
 * LOGIQUE DE ROUTAGE :
 * 1. Essaie d'abord de trouver le tenant par SLUG (nouvelle méthode)
 * 2. Si pas trouvé, fallback sur le DOMAINE (ancienne méthode)
 */
export async function handleInboundEmail(message, env, ctx) {
  const startTime = Date.now();
  
  try {
    // Extrait les informations de l'email
    const fromEmail = message.from;
    const toEmail = message.to;
    const subject = getSubject(message);
    
    // Extrait le nom de l'expéditeur si disponible
    const fromHeader = message.headers.get('from') || fromEmail;
    const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
    const fromName = nameMatch ? nameMatch[1].trim() : null;
    
    logger.info('📧 Email entrant reçu', { 
      from: fromEmail, 
      to: toEmail, 
      subject 
    });
    
    // === NOUVELLE LOGIQUE : ROUTAGE PAR SLUG ===
    let tenantId = null;
    const slug = extractSlugFromEmail(toEmail);
    
    if (slug) {
      logger.info('🔍 Recherche tenant par slug', { slug });
      tenantId = await findTenantBySlug(env.DB, slug);
      
      if (tenantId) {
        logger.info('✅ Tenant trouvé par slug', { tenantId, slug });
      }
    }
    
    // === FALLBACK : ROUTAGE PAR DOMAINE (ancienne méthode) ===
    if (!tenantId) {
      logger.info('🔍 Fallback: recherche tenant par domaine');
      tenantId = await findTenantByEmailDomain(env.DB, toEmail);
      
      if (tenantId) {
        logger.info('✅ Tenant trouvé par domaine', { tenantId, domain: toEmail.split('@')[1] });
      }
    }
    
    // === AUCUN TENANT TROUVÉ ===
    if (!tenantId) {
      logger.warn('❌ Tenant non trouvé', { to: toEmail, slug });
      message.setReject('Destinataire inconnu');
      return;
    }
    
    // Parse le contenu de l'email
    const content = await parseEmailContent(message);
    
    // Trouve ou crée la conversation
    const conversationId = await findOrCreateConversation(
      env.DB, tenantId, fromEmail, fromName
    );
    
    // Stocke le message
    const messageId = await storeEmailMessage(
      env.DB, conversationId, fromEmail, subject, content
    );
    
    const duration = Date.now() - startTime;
    logger.info('✅ Email traité avec succès', { 
      messageId, 
      conversationId,
      tenantId,
      duration: `${duration}ms` 
    });
    
    // Accepte l'email (ne pas rejeter)
    // Cloudflare Email Routing considère le traitement réussi
    
  } catch (error) {
    logger.error('❌ Erreur traitement email entrant', { 
      error: error.message,
      stack: error.stack 
    });
    
    // En cas d'erreur, on rejette
    message.setReject('Erreur de traitement');
  }
}

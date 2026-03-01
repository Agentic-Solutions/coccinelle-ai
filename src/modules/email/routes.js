/**
 * Routes API pour le service email - VERSION COMPLETE
 */

import { fetchNewEmails, sendEmail, markAsRead, getConnectedEmailInfo } from './email-service.js';

/**
 * GET /api/v1/email/check - Vérifie les nouveaux emails
 */
export async function handleCheckEmails(request, env, ctx, tenantId) {
  try {
    const emails = await fetchNewEmails(env.DB, env, tenantId);
    return Response.json({ 
      success: true, 
      count: emails.length,
      emails: emails 
    });
  } catch (error) {
    console.error('Erreur check emails:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/email/inbox - Récupère les emails de l'inbox
 */
export async function handleGetInbox(request, env, ctx, tenantId) {
  try {
    const emails = await fetchNewEmails(env.DB, env, tenantId);
    
    // Trie par date décroissante
    emails.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return Response.json({ 
      success: true,
      count: emails.length,
      emails: emails
    });
  } catch (error) {
    console.error('Erreur get inbox:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/email/history - Récupère l'historique des conversations
 */
export async function handleGetHistory(request, env, ctx, tenantId) {
  try {
    // Récupère les conversations depuis la DB
    const conversations = await env.DB.prepare(`
      SELECT * FROM omni_conversations 
      WHERE tenant_id = ? AND channel = 'email'
      ORDER BY updated_at DESC
      LIMIT 50
    `).bind(tenantId).all();
    
    return Response.json({ 
      success: true,
      conversations: conversations.results || []
    });
  } catch (error) {
    console.error('Erreur get history:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/email/status - Récupère le statut de connexion email
 */
export async function handleGetStatus(request, env, ctx, tenantId) {
  try {
    const info = await getConnectedEmailInfo(env.DB, tenantId);
    
    if (info) {
      return Response.json({ 
        success: true,
        connected: true,
        provider: info.provider,
        email: info.email
      });
    } else {
      return Response.json({ 
        success: true,
        connected: false,
        provider: null,
        email: null
      });
    }
  } catch (error) {
    console.error('Erreur get status:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/email/process-all - Traite tous les emails en attente
 */
export async function handleProcessAll(request, env, ctx) {
  try {
    // Récupère tous les tenants avec email connecté
    const tenants = await env.DB.prepare(`
      SELECT DISTINCT tenant_id FROM oauth_google_tokens
      UNION
      SELECT DISTINCT tenant_id FROM oauth_outlook_tokens
    `).all();
    
    let processed = 0;
    let errors = 0;
    
    for (const row of (tenants.results || [])) {
      try {
        const emails = await fetchNewEmails(env.DB, env, row.tenant_id);
        processed += emails.length;
      } catch (e) {
        errors++;
        console.error(`Erreur tenant ${row.tenant_id}:`, e.message);
      }
    }
    
    return Response.json({ 
      success: true,
      tenantsProcessed: tenants.results?.length || 0,
      emailsProcessed: processed,
      errors: errors
    });
  } catch (error) {
    console.error('Erreur process all:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/email/send - Envoie un email
 */
export async function handleSendEmail(request, env, ctx, tenantId) {
  try {
    const body = await request.json();
    const { to, subject, message, provider, replyToId } = body;
    
    if (!to || !subject || !message) {
      return Response.json({ 
        success: false, 
        error: 'Champs requis: to, subject, message' 
      }, { status: 400 });
    }
    
    // Détermine le provider si non spécifié
    let emailProvider = provider;
    if (!emailProvider) {
      const info = await getConnectedEmailInfo(env.DB, tenantId);
      if (!info) {
        return Response.json({ 
          success: false, 
          error: 'Aucun compte email connecté' 
        }, { status: 400 });
      }
      emailProvider = info.provider;
    }
    
    const result = await sendEmail(env.DB, env, tenantId, emailProvider, to, subject, message, replyToId);
    
    return Response.json({ 
      success: true,
      result: result
    });
  } catch (error) {
    console.error('Erreur send email:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/email/mark-read - Marque un email comme lu
 */
export async function handleMarkAsRead(request, env, ctx, tenantId) {
  try {
    const body = await request.json();
    const { messageId, provider } = body;
    
    if (!messageId || !provider) {
      return Response.json({ 
        success: false, 
        error: 'Champs requis: messageId, provider' 
      }, { status: 400 });
    }
    
    const result = await markAsRead(env.DB, env, tenantId, provider, messageId);
    
    return Response.json({ 
      success: true,
      marked: result
    });
  } catch (error) {
    console.error('Erreur mark as read:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/email/auto-reply - Sara répond automatiquement aux emails
 */
export async function handleAutoReply(request, env, ctx, tenantId) {
  try {
    // Import dynamique pour éviter les problèmes de circular dependency
    const { processAutoReply } = await import('./email-service.js');
    
    const result = await processAutoReply(env.DB, env, tenantId);
    
    return Response.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Erreur auto-reply:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/email/conversation/:emailId - Récupère l'email + réponse Sara
 */
export async function handleGetConversation(request, env, ctx, tenantId) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const emailId = pathParts[pathParts.length - 1];

    if (!emailId) {
      return Response.json({ success: false, error: 'emailId requis' }, { status: 400 });
    }

    // Récupérer la réponse Sara depuis email_processed
    const saraReply = await env.DB.prepare(`
      SELECT * FROM email_processed 
      WHERE tenant_id = ? AND email_id = ?
    `).bind(tenantId, emailId).first();

    return Response.json({ 
      success: true,
      emailId,
      saraReply: saraReply ? {
        reply: saraReply.sara_reply,
        processedAt: saraReply.processed_at,
        status: saraReply.status
      } : null
    });
  } catch (error) {
    console.error('Erreur get conversation:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/email/stats - Stats des emails traités par Sara
 */
export async function handleGetStats(request, env, ctx, tenantId, corsHeaders = {}) {
  try {
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_processed WHERE tenant_id = ?
    `).bind(tenantId).first();
    
    return Response.json({ 
      success: true,
      repliedCount: result?.count || 0
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Erreur stats:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      repliedCount: 0
    }, { status: 500, headers: corsHeaders });
  }
}

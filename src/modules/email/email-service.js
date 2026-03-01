/**
 * Service Email Unifié pour Coccinelle.ai
 * Gère la lecture et l'envoi d'emails via Gmail et Outlook
 */

import { getValidAccessToken as getGoogleToken, getGoogleTokens } from '../oauth/google.js';
import { getValidAccessToken as getOutlookToken, getOutlookTokens } from '../oauth/outlook.js';

// ============================================
// GMAIL API FUNCTIONS
// ============================================

/**
 * Récupère les nouveaux emails Gmail (non lus)
 */
async function fetchGmailEmails(accessToken, maxResults = 10) {
  // Liste les messages non lus
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=${maxResults}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!listResponse.ok) {
    const error = await listResponse.text();
    throw new Error(`Erreur liste Gmail: ${error}`);
  }

  const listData = await listResponse.json();
  
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Récupère le détail de chaque message
  const emails = [];
  for (const msg of listData.messages) {
    const msgResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (msgResponse.ok) {
      const msgData = await msgResponse.json();
      emails.push(parseGmailMessage(msgData));
    }
  }

  return emails;
}

/**
 * Parse un message Gmail en format standard
 */
function parseGmailMessage(msg) {
  const headers = msg.payload.headers || [];
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Extraire le corps du message
  let body = '';
  if (msg.payload.body?.data) {
    body = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  } else if (msg.payload.parts) {
    const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body: body,
    snippet: msg.snippet,
    provider: 'gmail'
  };
}

/**
 * Envoie un email via Gmail
 */
async function sendGmailEmail(accessToken, to, subject, body, replyToMessageId = null) {
  // Construit le message au format RFC 2822
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ];

  if (replyToMessageId) {
    emailLines.unshift(`In-Reply-To: ${replyToMessageId}`);
    emailLines.unshift(`References: ${replyToMessageId}`);
  }

  const email = emailLines.join('\r\n');
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur envoi Gmail: ${error}`);
  }

  return response.json();
}

/**
 * Marque un email Gmail comme lu
 */
async function markGmailAsRead(accessToken, messageId) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD']
      })
    }
  );

  return response.ok;
}

// ============================================
// OUTLOOK/MICROSOFT GRAPH API FUNCTIONS
// ============================================

/**
 * Récupère les nouveaux emails Outlook (non lus)
 */
async function fetchOutlookEmails(accessToken, maxResults = 10) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=isRead eq false&$top=${maxResults}&$orderby=receivedDateTime desc`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur liste Outlook: ${error}`);
  }

  const data = await response.json();
  
  return (data.value || []).map(msg => ({
    id: msg.id,
    conversationId: msg.conversationId,
    from: msg.from?.emailAddress?.address || '',
    fromName: msg.from?.emailAddress?.name || '',
    to: msg.toRecipients?.[0]?.emailAddress?.address || '',
    subject: msg.subject || '',
    date: msg.receivedDateTime,
    body: msg.body?.content || '',
    bodyType: msg.body?.contentType || 'text',
    snippet: msg.bodyPreview || '',
    provider: 'outlook'
  }));
}

/**
 * Envoie un email via Outlook
 */
async function sendOutlookEmail(accessToken, to, subject, body, replyToMessageId = null) {
  const message = {
    message: {
      subject: subject,
      body: {
        contentType: 'Text',
        content: body
      },
      toRecipients: [
        {
          emailAddress: { address: to }
        }
      ]
    },
    saveToSentItems: true
  };

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/sendMail',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur envoi Outlook: ${error}`);
  }

  return { success: true };
}

/**
 * Marque un email Outlook comme lu
 */
async function markOutlookAsRead(accessToken, messageId) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isRead: true })
    }
  );

  return response.ok;
}

// ============================================
// UNIFIED API - FONCTIONS EXPORTÉES
// ============================================

/**
 * Récupère les nouveaux emails pour un tenant (tous providers confondus)
 */
export async function fetchNewEmails(db, env, tenantId) {
  const emails = [];

  // Essaie Gmail
  const gmailToken = await getGoogleToken(db, tenantId, env);
  if (gmailToken) {
    try {
      const gmailEmails = await fetchGmailEmails(gmailToken);
      emails.push(...gmailEmails);
    } catch (error) {
      console.error('Erreur fetch Gmail:', error.message);
    }
  }

  // Essaie Outlook
  const outlookToken = await getOutlookToken(db, env, tenantId);
  if (outlookToken) {
    try {
      const outlookEmails = await fetchOutlookEmails(outlookToken);
      emails.push(...outlookEmails);
    } catch (error) {
      console.error('Erreur fetch Outlook:', error.message);
    }
  }

  return emails;
}

/**
 * Envoie un email via le provider approprié
 */
export async function sendEmail(db, env, tenantId, provider, to, subject, body, replyToId = null) {
  if (provider === 'gmail') {
    const token = await getGoogleToken(db, tenantId, env);
    if (!token) throw new Error('Gmail non connecté');
    return sendGmailEmail(token, to, subject, body, replyToId);
  }

  if (provider === 'outlook') {
    const token = await getOutlookToken(db, env, tenantId);
    if (!token) throw new Error('Outlook non connecté');
    return sendOutlookEmail(token, to, subject, body, replyToId);
  }

  throw new Error(`Provider non supporté: ${provider}`);
}

/**
 * Marque un email comme lu
 */
export async function markAsRead(db, env, tenantId, provider, messageId) {
  if (provider === 'gmail') {
    const token = await getGoogleToken(db, tenantId, env);
    if (!token) return false;
    return markGmailAsRead(token, messageId);
  }

  if (provider === 'outlook') {
    const token = await getOutlookToken(db, env, tenantId);
    if (!token) return false;
    return markOutlookAsRead(token, messageId);
  }

  return false;
}

/**
 * Récupère le provider et l'email connecté pour un tenant
 */
export async function getConnectedEmailInfo(db, tenantId) {
  // Vérifie Gmail
  const gmailTokens = await getGoogleTokens(db, tenantId);
  if (gmailTokens) {
    return { provider: 'gmail', email: gmailTokens.email };
  }

  // Vérifie Outlook
  const outlookTokens = await getOutlookTokens(db, tenantId);
  if (outlookTokens) {
    return { provider: 'outlook', email: outlookTokens.email };
  }

  return null;
}

/**
 * ============================================
 * RÉPONSE AUTOMATIQUE SARA - EMAIL
 * ============================================
 */

import { ClaudeAIService } from '../omnichannel/services/claude-ai.js';

/**
 * Traite les emails non lus et génère des réponses automatiques avec Sara
 */
export async function processAutoReply(db, env, tenantId) {
  const results = {
    processed: 0,
    skipped: 0,
    errors: [],
    replies: []
  };

  try {
    // 1. Récupérer les emails
    const emails = await fetchNewEmails(db, env, tenantId);
    
    if (!emails || emails.length === 0) {
      return { ...results, message: 'Aucun email à traiter' };
    }

    // 2. Récupérer les emails déjà traités
    const processedEmails = await db.prepare(`
      SELECT email_id FROM email_processed WHERE tenant_id = ?
    `).bind(tenantId).all();
    
    const processedIds = new Set(processedEmails.results?.map(e => e.email_id) || []);

    // 3. Récupérer la configuration de l'agent Sara
    const agentConfig = await db.prepare(`
      SELECT * FROM omni_agent_configs WHERE tenant_id = ? LIMIT 1
    `).bind(tenantId).first();

    const saraConfig = {
      agent_name: agentConfig?.agent_name || 'Sara',
      agent_personality: agentConfig?.agent_personality || 'professionnelle et chaleureuse',
      system_prompt: agentConfig?.system_prompt || null
    };

    // 4. Récupérer la knowledge base
    let knowledgeContext = '';
    const knowledgeDocs = await db.prepare(`
      SELECT content FROM knowledge_documents WHERE tenant_id = ? LIMIT 10
    `).bind(tenantId).all();
    
    if (knowledgeDocs.results?.length > 0) {
      knowledgeContext = knowledgeDocs.results.map(d => d.content).join('\n\n');
    }

    // 5. Récupérer info email connecté
    const emailInfo = await getConnectedEmailInfo(db, tenantId);
    if (!emailInfo) {
      return { ...results, error: 'Aucun compte email connecté' };
    }

    // 6. Initialiser le service IA
    const aiService = new ClaudeAIService(env.OPENAI_API_KEY);

    // 7. Traiter chaque email non traité
    for (const email of emails) {
      try {
        // Vérifier si déjà traité
        if (processedIds.has(email.id)) {
          results.skipped++;
          continue;
        }

        // Extraire l'email de l'expéditeur
        const fromEmail = extractEmailAddress(email.from);
        
        // Ne pas répondre à ses propres emails ou aux no-reply
        if (isNoReplyEmail(fromEmail) || fromEmail === emailInfo.email) {
          results.skipped++;
          continue;
        }

        // Créer une session IA pour cet email
        const session = await aiService.createSession(saraConfig, knowledgeContext);

        // Construire le contexte pour Sara
        const emailContext = `
Tu reçois un email de ${email.from}.
Sujet: ${email.subject || '(Sans objet)'}

Contenu de l'email:
${email.body}

Réponds de manière professionnelle et utile. Signe avec ton nom (Sara).
`;

        // Générer la réponse
        const saraReply = await aiService.streamResponse(session, emailContext);

        // Envoyer la réponse via Gmail/Outlook
        const replySubject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || 'Votre message'}`;
        
        await sendEmail(db, env, tenantId, emailInfo.provider, fromEmail, replySubject, saraReply, email.id);

        // Enregistrer dans email_processed
        const processedId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.prepare(`
          INSERT INTO email_processed (id, tenant_id, email_id, from_email, subject, original_body, sara_reply, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'sent')
        `).bind(
          processedId,
          tenantId,
          email.id,
          fromEmail,
          email.subject,
          email.body?.substring(0, 5000),
          saraReply
        ).run();

        results.processed++;
        results.replies.push({
          to: fromEmail,
          subject: replySubject,
          preview: saraReply.substring(0, 100) + '...'
        });

      } catch (emailError) {
        results.errors.push({
          emailId: email.id,
          error: emailError.message
        });
      }
    }

    return results;

  } catch (error) {
    return {
      ...results,
      error: error.message
    };
  }
}

/**
 * Extrait l'adresse email depuis un format "Nom <email@example.com>"
 */
function extractEmailAddress(from) {
  if (!from) return '';
  const match = from.match(/<(.+)>/);
  if (match) return match[1];
  return from;
}

/**
 * Vérifie si c'est un email no-reply ou automatique
 */
function isNoReplyEmail(email) {
  if (!email) return true;
  const lowerEmail = email.toLowerCase();
  return lowerEmail.includes('noreply') ||
         lowerEmail.includes('no-reply') ||
         lowerEmail.includes('mailer-daemon') ||
         lowerEmail.includes('postmaster') ||
         lowerEmail.includes('notification') ||
         lowerEmail.includes('alert') ||
         lowerEmail.includes('newsletter') ||
         lowerEmail.includes('marketing') ||
         lowerEmail.includes('promo');
}

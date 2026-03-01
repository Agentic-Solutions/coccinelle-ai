/**
 * Processeur d'emails pour Coccinelle.ai
 * Utilise Sara (Claude AI) pour générer des réponses automatiques
 */

import { fetchNewEmails, sendEmail, markAsRead, getConnectedEmailInfo } from './email-service.js';

/**
 * Génère une réponse avec Sara (Claude AI)
 */
async function generateSaraResponse(env, tenantId, emailContent, knowledgeContext) {
  const systemPrompt = `Tu es Sara, l'assistante virtuelle de cette entreprise.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec les informations fournies dans le contexte ci-dessous
2. Si tu ne trouves pas l'information, dis poliment que tu vas transmettre la demande à l'équipe
3. Sois professionnelle, chaleureuse et concise
4. Ne jamais inventer d'informations (prix, horaires, services) non présentes dans le contexte
5. Termine toujours par une formule de politesse

CONTEXTE DE L'ENTREPRISE :
${knowledgeContext || "Aucune information disponible."}

---
Tu réponds à un email client. Génère une réponse appropriée.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Email reçu:\n\nSujet: ${emailContent.subject}\n\nMessage:\n${emailContent.body}\n\n---\nGénère une réponse professionnelle à cet email.`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur Claude API: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Charge le contexte Knowledge Base pour un tenant
 */
async function loadKnowledgeContext(db, tenantId) {
  try {
    // Récupère les chunks de la knowledge base
    const chunks = await db.prepare(`
      SELECT kc.content 
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kd.tenant_id = ? AND kd.status = 'completed'
      ORDER BY kc.created_at DESC
      LIMIT 20
    `).bind(tenantId).all();

    if (!chunks.results || chunks.results.length === 0) {
      return null;
    }

    return chunks.results.map(c => c.content).join('\n\n---\n\n');
  } catch (error) {
    console.error('Erreur chargement KB:', error);
    return null;
  }
}

/**
 * Sauvegarde un email traité dans la base de données
 */
async function saveProcessedEmail(db, tenantId, email, response, status) {
  const now = new Date().toISOString();
  
  try {
    await db.prepare(`
      INSERT INTO processed_emails (
        tenant_id, provider, message_id, from_email, to_email, 
        subject, body_snippet, sara_response, status, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      email.provider,
      email.id,
      email.from,
      email.to,
      email.subject,
      email.snippet || email.body?.substring(0, 200),
      response,
      status,
      now
    ).run();
  } catch (error) {
    console.error('Erreur sauvegarde email:', error);
  }
}

/**
 * Vérifie si un email a déjà été traité
 */
async function isEmailAlreadyProcessed(db, tenantId, messageId) {
  const existing = await db.prepare(
    'SELECT id FROM processed_emails WHERE tenant_id = ? AND message_id = ?'
  ).bind(tenantId, messageId).first();
  
  return !!existing;
}

/**
 * Traite un seul email entrant
 */
async function processEmail(db, env, tenantId, email) {
  console.log(`📧 Traitement email: ${email.subject} de ${email.from}`);

  // Vérifie si déjà traité
  if (await isEmailAlreadyProcessed(db, tenantId, email.id)) {
    console.log('⏭️ Email déjà traité, skip');
    return { skipped: true };
  }

  try {
    // Charge le contexte KB
    const knowledgeContext = await loadKnowledgeContext(db, tenantId);

    // Génère la réponse avec Sara
    const saraResponse = await generateSaraResponse(env, tenantId, email, knowledgeContext);
    console.log('✅ Réponse générée par Sara');

    // Extrait l'adresse email du "from" (format: "Nom <email@domain.com>")
    let replyTo = email.from;
    const emailMatch = email.from.match(/<(.+)>/);
    if (emailMatch) {
      replyTo = emailMatch[1];
    }

    // Envoie la réponse
    const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    await sendEmail(db, env, tenantId, email.provider, replyTo, subject, saraResponse, email.id);
    console.log(`📤 Réponse envoyée à ${replyTo}`);

    // Marque comme lu
    await markAsRead(db, env, tenantId, email.provider, email.id);

    // Sauvegarde
    await saveProcessedEmail(db, tenantId, email, saraResponse, 'sent');

    return { success: true, response: saraResponse };

  } catch (error) {
    console.error('❌ Erreur traitement email:', error);
    await saveProcessedEmail(db, tenantId, email, null, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Traite tous les nouveaux emails pour un tenant
 */
export async function processNewEmailsForTenant(db, env, tenantId) {
  console.log(`\n🔄 Vérification emails pour tenant: ${tenantId}`);

  // Récupère les nouveaux emails
  const emails = await fetchNewEmails(db, env, tenantId);
  
  if (emails.length === 0) {
    console.log('📭 Aucun nouvel email');
    return { processed: 0 };
  }

  console.log(`📬 ${emails.length} nouveau(x) email(s) trouvé(s)`);

  const results = [];
  for (const email of emails) {
    const result = await processEmail(db, env, tenantId, email);
    results.push(result);
  }

  const processed = results.filter(r => r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  const errors = results.filter(r => !r.success && !r.skipped).length;

  console.log(`✅ Traité: ${processed}, ⏭️ Skippé: ${skipped}, ❌ Erreurs: ${errors}`);

  return { processed, skipped, errors };
}

/**
 * Traite les emails pour TOUS les tenants avec OAuth connecté
 */
export async function processAllTenantEmails(db, env) {
  console.log('\n========================================');
  console.log('🚀 Début du traitement des emails');
  console.log('========================================\n');

  // Récupère tous les tenants avec Gmail connecté
  const gmailTenants = await db.prepare(
    'SELECT DISTINCT tenant_id FROM oauth_google_tokens'
  ).all();

  // Récupère tous les tenants avec Outlook connecté
  const outlookTenants = await db.prepare(
    'SELECT DISTINCT tenant_id FROM oauth_outlook_tokens'
  ).all();

  // Combine et déduplique
  const tenantIds = new Set([
    ...(gmailTenants.results || []).map(t => t.tenant_id),
    ...(outlookTenants.results || []).map(t => t.tenant_id)
  ]);

  console.log(`📋 ${tenantIds.size} tenant(s) avec email connecté`);

  const allResults = [];
  for (const tenantId of tenantIds) {
    try {
      const result = await processNewEmailsForTenant(db, env, tenantId);
      allResults.push({ tenantId, ...result });
    } catch (error) {
      console.error(`❌ Erreur tenant ${tenantId}:`, error);
      allResults.push({ tenantId, error: error.message });
    }
  }

  console.log('\n========================================');
  console.log('✅ Traitement terminé');
  console.log('========================================\n');

  return allResults;
}

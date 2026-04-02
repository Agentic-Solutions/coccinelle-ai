/**
 * Orchestrateur Omnicanal Coccinelle.ai
 * Gere les 5 scenarios de communication automatique :
 * 1. Appel -> SMS confirmation
 * 2. Appel -> Email recapitulatif
 * 3. SMS recu -> Reponse IA
 * 4. WhatsApp recu -> Creer prospect CRM
 * 5. Appel -> Creer prospect CRM
 */

import { logger } from '../../utils/logger.js';

// Fonction principale — declenchee apres chaque evenement
export async function handleOmniEvent(env, tenantId, event) {
  /*
  event = {
    type: 'call_ended' | 'message_received' | 'appointment_created',
    channel: 'voice' | 'sms' | 'whatsapp' | 'email',
    contact: { phone, email, name },
    data: { duration, transcript, summary, rdv_date, message }
  }
  */

  // 1. Recuperer les regles actives pour cet evenement
  const rules = await env.DB.prepare(`
    SELECT * FROM omni_rules
    WHERE tenant_id = ?
    AND trigger_event = ?
    AND trigger_channel = ?
    AND is_active = 1
  `).bind(tenantId, event.type, event.channel).all();

  if (!rules.results?.length) return { executed: 0, results: [] };

  // 2. Recuperer infos tenant
  const tenant = await env.DB.prepare(`
    SELECT name, email, phone FROM tenants WHERE id = ?
  `).bind(tenantId).first();

  const results = [];

  // 3. Executer chaque regle (avec delai si configure)
  for (const rule of rules.results) {
    try {
      // Delai configurable
      if (rule.delay_seconds > 0) {
        // Pour les Workers, on execute immediatement mais on log le delai
        // En production on utilisera Durable Objects ou Queues pour le vrai delai
        logger.info('Omni rule delayed', { rule_id: rule.id, delay: rule.delay_seconds });
      }

      const result = await executeRule(env, rule, tenant, tenantId, event);
      results.push({ rule_id: rule.id, ...result });

      // Logger l'execution
      await env.DB.prepare(`
        INSERT INTO omni_rule_executions
        (rule_id, tenant_id, contact_phone, contact_email,
         trigger_data, status, result)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rule.id, tenantId,
        event.contact?.phone || null,
        event.contact?.email || null,
        JSON.stringify(event.data || {}),
        result.success ? 'success' : 'error',
        JSON.stringify(result)
      ).run();

    } catch (err) {
      logger.error('Omni rule execution error', { rule_id: rule.id, error: err.message });
      results.push({ rule_id: rule.id, success: false, error: err.message });
    }
  }

  return { executed: results.length, results };
}

// Executer une regle selon son type d'action
async function executeRule(env, rule, tenant, tenantId, event) {
  // Resoudre les variables dans le template
  const resolveTemplate = (template) => {
    if (!template) return '';
    return template
      .replace(/\{company_name\}/g, tenant?.name || 'notre equipe')
      .replace(/\{contact_name\}/g, event.contact?.name || 'Cher client')
      .replace(/\{contact_phone\}/g, event.contact?.phone || '')
      .replace(/\{duration\}/g, event.data?.duration || '')
      .replace(/\{summary\}/g, event.data?.summary || '')
      .replace(/\{rdv_date\}/g, event.data?.rdv_date || '');
  };

  switch (rule.action_type) {

    case 'send_message': {
      // SMS via Twilio
      const message = resolveTemplate(rule.action_template);
      const to = event.contact?.phone;
      if (!to) return { success: false, error: 'No phone number' };

      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        return { success: false, error: 'Twilio non configure' };
      }

      const twilioAuth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: env.TWILIO_PHONE_NUMBER || '+33939035760',
            To: to,
            Body: message
          })
        }
      );
      const data = await resp.json();
      return { success: resp.ok, channel: 'sms', message_sid: data.sid, error: data.message };
    }

    case 'send_email': {
      // Email via Resend
      const subject = resolveTemplate(rule.action_template);
      const to = event.contact?.email;
      if (!to) return { success: false, error: 'No email address' };
      if (!env.RESEND_API_KEY) return { success: false, error: 'Resend non configure' };

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#111">Recapitulatif de votre appel</h2>
          <p>Bonjour ${event.contact?.name || 'Cher client'},</p>
          <p>Merci pour votre appel avec <strong>${tenant?.name || 'notre equipe'}</strong>.</p>
          ${event.data?.summary ? `<p><strong>Resume :</strong> ${event.data.summary}</p>` : ''}
          ${event.data?.rdv_date ? `<p><strong>Rendez-vous confirme :</strong> ${event.data.rdv_date}</p>` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="color:#666;font-size:12px">${tenant?.name || 'Coccinelle.ai'} — Agent IA omnicanal</p>
        </div>`;

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
          to: [to],
          subject,
          html
        })
      });
      const data = await resp.json();
      return { success: resp.ok, channel: 'email', email_id: data.id, error: data.error?.message };
    }

    case 'ai_reply': {
      // Reponse IA via Anthropic Claude
      const userMessage = event.data?.message || '';
      if (!userMessage) return { success: false, error: 'No message content' };
      if (!env.ANTHROPIC_API_KEY) return { success: false, error: 'Anthropic non configure' };

      const systemPrompt = `Tu es l'assistant de ${tenant?.name || 'notre equipe'}. Reponds de facon concise et professionnelle en francais. Maximum 160 caracteres pour SMS.`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      });
      const data = await resp.json();
      const reply = data.content?.[0]?.text || 'Merci, un conseiller vous recontacte bientot.';

      // Envoyer la reponse via SMS (Twilio)
      if (event.contact?.phone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
        const twilioAuth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              From: env.TWILIO_PHONE_NUMBER || '+33939035760',
              To: event.contact.phone,
              Body: reply
            })
          }
        );
      }
      return { success: true, channel: 'ai_reply', reply };
    }

    case 'create_prospect': {
      // Creer prospect dans CRM
      const phone = event.contact?.phone;
      if (!phone) return { success: false, error: 'No phone number' };

      const existing = await env.DB.prepare(`
        SELECT id FROM prospects WHERE tenant_id = ? AND phone = ?
      `).bind(tenantId, phone).first();

      if (existing) {
        // Incrementer interaction_count
        await env.DB.prepare(`
          UPDATE prospects SET interaction_count = interaction_count + 1, updated_at = datetime('now')
          WHERE id = ?
        `).bind(existing.id).run();
        return { success: true, channel: 'crm', action: 'updated', prospect_id: existing.id };
      }

      const prospectId = `prsp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await env.DB.prepare(`
        INSERT INTO prospects (id, tenant_id, first_name, phone, email, source, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'new', datetime('now'))
      `).bind(
        prospectId, tenantId,
        event.contact?.name || 'Inconnu',
        phone,
        event.contact?.email || null,
        event.channel || 'omnicanal'
      ).run();

      return { success: true, channel: 'crm', action: 'created', prospect_id: prospectId };
    }

    default:
      return { success: false, error: `Action inconnue: ${rule.action_type}` };
  }
}

// Scenario 1 : Appel termine — declenche depuis VoixIA
export async function onCallEnded(env, tenantId, callData) {
  return handleOmniEvent(env, tenantId, {
    type: 'call_ended',
    channel: 'voice',
    contact: {
      phone: callData.caller_phone,
      email: callData.contact_email,
      name: callData.contact_name
    },
    data: {
      duration: callData.duration,
      summary: callData.summary,
      rdv_date: callData.rdv_date,
      transcript: callData.transcript
    }
  });
}

// Scenario 2 : SMS recu — declenche depuis webhook Twilio
export async function onSmsReceived(env, tenantId, smsData) {
  return handleOmniEvent(env, tenantId, {
    type: 'message_received',
    channel: 'sms',
    contact: { phone: smsData.From, name: null },
    data: { message: smsData.Body }
  });
}

// Scenario 3 : WhatsApp recu — declenche depuis webhook Meta
export async function onWhatsAppReceived(env, tenantId, waData) {
  return handleOmniEvent(env, tenantId, {
    type: 'message_received',
    channel: 'whatsapp',
    contact: { phone: waData.from, name: waData.profile_name },
    data: { message: waData.text }
  });
}

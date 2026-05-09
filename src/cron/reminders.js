/**
 * Cron Job — SMS Rappel J-1 pour RDV
 *
 * Envoie automatiquement un SMS de rappel la veille de chaque RDV.
 * Cron trigger : 0 17 * * * (17h UTC = 18h/19h Paris)
 *
 * Exporte :
 * - handleScheduled(event, env, ctx) — point d'entree cron
 * - sendTomorrowReminders(env) — logique reutilisable (cron + route manuelle)
 */

import { logger } from '../utils/logger.js';

/**
 * Point d'entree du cron trigger Cloudflare Workers.
 */
export async function handleScheduled(event, env, ctx) {
  logger.info('Cron reminder started', { cron: event.cron, scheduledTime: event.scheduledTime });
  try {
    const result = await sendTomorrowReminders(env);
    logger.info('Cron reminder completed', { sent: result.sent, errors: result.errors });
  } catch (error) {
    logger.error('Cron reminder failed', { error: error.message, stack: error.stack });
  }
}

/**
 * Envoie les SMS de rappel pour tous les RDV de demain (tous tenants).
 * Reutilisable par le cron ET par la route manuelle POST /api/v1/reminders/send-tomorrow.
 */
export async function sendTomorrowReminders(env) {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  logger.info('Sending reminders for date', { date: dateStr });

  // Query tous les RDV de demain, tous tenants, non rappeles
  const { results: appointments } = await env.DB.prepare(`
    SELECT a.id, a.customer_name, a.customer_phone, a.scheduled_at, a.notes,
      t.name AS company_name, t.id AS tenant_id,
      COALESCE(ca.first_name || ' ' || ca.last_name, '') AS agent_name,
      s.name AS service_name, s.duration_minutes,
      COALESCE(a.customer_phone, p.phone) AS phone
    FROM appointments a
    JOIN tenants t ON a.tenant_id = t.id
    LEFT JOIN commercial_agents ca ON a.agent_id = ca.id
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN prospects p ON a.prospect_id = p.id
    WHERE DATE(a.scheduled_at) = ?
      AND a.status NOT IN ('cancelled','completed')
      AND a.reminder_sent = 0
      AND COALESCE(a.customer_phone, p.phone) IS NOT NULL
      AND COALESCE(a.customer_phone, p.phone) != ''
  `).bind(dateStr).all();

  if (!appointments || appointments.length === 0) {
    logger.info('No appointments to remind for', { date: dateStr });
    return { sent: 0, errors: 0, details: [] };
  }

  logger.info(`Found ${appointments.length} appointments to remind`);

  let sent = 0;
  let errors = 0;
  const details = [];

  for (const apt of appointments) {
    try {
      const phone = apt.phone;
      const customerName = apt.customer_name || 'Client';

      // Formater heure en fr-FR (Europe/Paris)
      const scheduledDate = new Date(apt.scheduled_at);
      const heureStr = scheduledDate.toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit'
      });
      const jourStr = scheduledDate.toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      // Construire le message
      let message = `Rappel : Votre RDV`;
      if (apt.service_name) {
        message += ` ${apt.service_name}`;
      }
      message += ` demain ${jourStr} a ${heureStr}`;
      if (apt.agent_name && apt.agent_name.trim()) {
        message += ` avec ${apt.agent_name.trim()}`;
      }
      if (apt.company_name) {
        message += ` chez ${apt.company_name}`;
      }
      message += `. Repondez CONFIRMER ou ANNULER.`;

      // Envoyer via Twilio
      const smsResult = await sendSMSViaTwilio(env, phone, message, apt.tenant_id);

      if (smsResult.success) {
        // Marquer comme envoye
        await env.DB.prepare(`
          UPDATE appointments SET reminder_sent = 1, reminder_sent_at = datetime('now') WHERE id = ?
        `).bind(apt.id).run();
        sent++;
        details.push({ id: apt.id, name: customerName, phone, status: 'sent' });
        logger.info('Reminder sent', { appointmentId: apt.id, phone });
      } else {
        errors++;
        details.push({ id: apt.id, name: customerName, phone, status: 'error', error: smsResult.error });
        logger.warn('Reminder send failed', { appointmentId: apt.id, phone, error: smsResult.error });
      }
    } catch (err) {
      errors++;
      details.push({ id: apt.id, name: apt.customer_name, phone: apt.phone, status: 'error', error: err.message });
      logger.error('Reminder error', { appointmentId: apt.id, error: err.message });
    }
  }

  return { sent, errors, details };
}

/**
 * Envoie un SMS via Twilio (meme pattern que sendTwilioSMS dans twilio/routes.js).
 */
async function sendSMSViaTwilio(env, to, message, tenantId) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER || '+33939035760';

  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('From', from);
  formData.append('To', to);
  formData.append('Body', message);

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'SMS send failed' };
    }

    // Log SMS en DB
    try {
      await env.DB.prepare(`
        INSERT INTO sms_messages (id, tenant_id, to_number, from_number, message, status, direction, twilio_sid, created_at)
        VALUES (?, ?, ?, ?, ?, 'sent', 'outbound', ?, datetime('now'))
      `).bind(
        `sms_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId || 'unknown',
        to,
        from,
        message,
        data.sid
      ).run();
    } catch (dbErr) {
      logger.warn('Could not log reminder SMS to DB', { error: dbErr.message });
    }

    return { success: true, messageSid: data.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

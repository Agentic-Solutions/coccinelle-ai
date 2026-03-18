import { logger } from './logger.js';
import { sendPushToTenant } from '../modules/push/push-service.js';

/**
 * Helper pour créer des notifications en base + envoi push navigateur
 */
export async function createNotification(env, { tenant_id, user_id, type, title, message, data }) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await env.DB.prepare(`
    INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, tenant_id, user_id || null, type, title, message || null, data ? JSON.stringify(data) : null).run();

  // Send browser push notification (best-effort, non-blocking)
  try {
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY_JWK) {
      const pushUrl = type === 'new_appointment' ? '/dashboard/appointments'
        : type === 'missed_call' ? '/dashboard/calls'
        : type === 'new_prospect' ? '/dashboard/prospects'
        : type === 'new_message' ? '/dashboard/inbox'
        : '/dashboard';

      await sendPushToTenant(env, tenant_id, {
        title: title,
        body: message || '',
        url: pushUrl,
        tag: type,
      });
    }
  } catch (pushErr) {
    logger.warn('Push notification failed (non-blocking)', { error: pushErr.message });
  }

  return id;
}

/**
 * N3 — Confirmation RDV unifiée
 * Envoie une confirmation de RDV via le canal approprié (email, sms, ou les deux).
 * Vérifie confirmation_sent pour éviter les doublons.
 * Logue dans omni_messages.
 *
 * @param {object} env - Cloudflare env bindings
 * @param {string} appointmentId - ID du RDV
 * @param {string} channel - 'email', 'sms', ou 'both'
 * @returns {object} { sent: boolean, channels: string[], errors: string[] }
 */
export async function sendAppointmentConfirmation(env, appointmentId, channel = 'both') {
  const result = { sent: false, channels: [], errors: [] };

  try {
    // Récupérer le RDV avec les infos prospect/customer
    const appointment = await env.DB.prepare(`
      SELECT a.*,
        (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as prospect_name, p.phone as prospect_phone, p.email as prospect_email,
        at.name as type_name, at.duration_minutes as type_duration
      FROM appointments a
      LEFT JOIN prospects p ON a.prospect_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.id = ?
    `).bind(appointmentId).first();

    if (!appointment) {
      result.errors.push('RDV non trouvé');
      return result;
    }

    // Vérifier si la confirmation a déjà été envoyée
    if (appointment.confirmation_sent === 1) {
      logger.info('Confirmation déjà envoyée', { appointmentId });
      result.sent = true;
      result.channels.push(appointment.confirmation_channel || 'unknown');
      return result;
    }

    const customerName = appointment.customer_name || appointment.prospect_name || 'Client';
    const customerPhone = appointment.customer_phone || appointment.prospect_phone;
    const customerEmail = appointment.prospect_email;
    const scheduledAt = appointment.scheduled_at;
    const typeName = appointment.type_name || appointment.service_type || 'Rendez-vous';
    const duration = appointment.type_duration || appointment.duration_minutes || 30;

    const dateStr = formatDateFR(scheduledAt);
    const channelsUsed = [];

    // Envoi Email
    if ((channel === 'email' || channel === 'both') && customerEmail && env.RESEND_API_KEY) {
      try {
        const emailResult = await sendConfirmationEmailInternal(env, {
          to: customerEmail,
          name: customerName,
          date: dateStr,
          typeName,
          duration,
          appointmentId
        });
        if (emailResult.success) {
          channelsUsed.push('email');
          // Log dans omni_messages
          await logOmniMessage(env, appointment, 'email', `Confirmation RDV : ${typeName} le ${dateStr}`, emailResult.id);
        } else {
          result.errors.push('Email: ' + emailResult.error);
        }
      } catch (emailErr) {
        result.errors.push('Email: ' + emailErr.message);
      }
    }

    // Envoi SMS
    if ((channel === 'sms' || channel === 'both') && customerPhone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      try {
        const smsBody = `Bonjour ${customerName}, votre ${typeName} est confirmé pour le ${dateStr} (${duration} min). A bientot ! - Coccinelle.ai`;
        const smsResult = await sendConfirmationSMSInternal(env, customerPhone, smsBody);
        if (smsResult.success) {
          channelsUsed.push('sms');
          await logOmniMessage(env, appointment, 'sms', smsBody, smsResult.sid);
        } else {
          result.errors.push('SMS: ' + smsResult.error);
        }
      } catch (smsErr) {
        result.errors.push('SMS: ' + smsErr.message);
      }
    }

    // Marquer la confirmation comme envoyée
    if (channelsUsed.length > 0) {
      const confirmationChannel = channelsUsed.join(',');
      await env.DB.prepare(`
        UPDATE appointments SET confirmation_sent = 1, confirmation_channel = ? WHERE id = ?
      `).bind(confirmationChannel, appointmentId).run();

      result.sent = true;
      result.channels = channelsUsed;
      logger.info('Confirmation RDV envoyée', { appointmentId, channels: channelsUsed });
    }
  } catch (error) {
    logger.error('sendAppointmentConfirmation error', { appointmentId, error: error.message });
    result.errors.push(error.message);
  }

  return result;
}

// --- Helpers internes ---

async function sendConfirmationEmailInternal(env, { to, name, date, typeName, duration, appointmentId }) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1f2937; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">coccinelle.ai</h1>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">Confirmation de rendez-vous</p>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151;">Bonjour ${name},</p>
        <p style="color: #374151; line-height: 1.6;">Votre rendez-vous est bien confirmé.</p>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Type</td>
              <td style="padding: 6px 0; color: #1f2937; font-weight: 600; text-align: right;">${typeName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date</td>
              <td style="padding: 6px 0; color: #1f2937; font-weight: 600; text-align: right;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Duree</td>
              <td style="padding: 6px 0; color: #1f2937; font-weight: 600; text-align: right;">${duration} min</td>
            </tr>
          </table>
        </div>
        <p style="color: #374151; line-height: 1.6;">A bientot !</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Coccinelle.ai — Assistant intelligent<br/>
          <a href="mailto:contact@agenticsolutions.fr" style="color: #6b7280;">contact@agenticsolutions.fr</a>
        </p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || 'Sara - coccinelle.ai <sara@coccinelle.ai>',
      to: [to],
      subject: `Confirmation : ${typeName} le ${date}`,
      html
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.message || 'Email send failed' };
  }
  return { success: true, id: data.id };
}

async function sendConfirmationSMSInternal(env, to, body) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER || '+33939035760';

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('From', from);
  formData.append('To', to);
  formData.append('Body', body);

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
  return { success: true, sid: data.sid };
}

async function logOmniMessage(env, appointment, channel, content, externalId) {
  try {
    const conversationId = appointment.retell_call_id || appointment.id;
    await env.DB.prepare(`
      INSERT INTO omni_messages (id, conversation_id, channel, direction, content, content_type, sender_role, message_sid)
      VALUES (?, ?, ?, 'outbound', ?, 'text', 'system', ?)
    `).bind(
      `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      channel,
      content,
      externalId || null
    ).run();
  } catch (err) {
    logger.warn('Could not log confirmation to omni_messages', { error: err.message });
  }
}

function formatDateFR(isoDate) {
  try {
    const date = new Date(isoDate);
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    const day = days[date.getDay()];
    const d = date.getDate();
    const month = months[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${d} ${month} a ${hours}h${minutes}`;
  } catch {
    return isoDate;
  }
}

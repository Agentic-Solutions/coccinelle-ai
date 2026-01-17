/**
 * Module Notifications - Email & SMS pour rendez-vous
 * Support Resend (email) et Twilio (SMS)
 */

import { logger } from '../../utils/logger.js';

/**
 * Envoyer un email de confirmation de rendez-vous via Resend
 */
export async function sendConfirmationEmail(env, appointment, customerEmail, customerName) {
  if (!env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const emailBody = {
    from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to: [customerEmail],
    subject: 'Confirmation de votre rendez-vous',
    html: `
      <h2>Votre rendez-vous est confirmé !</h2>
      <p>Bonjour ${customerName},</p>
      <p>Votre rendez-vous a bien été enregistré pour le <strong>${new Date(appointment.scheduled_at).toLocaleString('fr-FR')}</strong>.</p>
      <p>Nous vous attendons !</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Cet email est envoyé automatiquement par Coccinelle.AI
      </p>
    `
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailBody)
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Resend API error', { error: data });
      return { success: false, error: data.message || 'Email send failed' };
    }

    logger.info('Confirmation email sent', { emailId: data.id, to: customerEmail });
    return { success: true, emailId: data.id };
  } catch (error) {
    logger.error('Error sending confirmation email', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer un SMS de rappel via Twilio
 */
export async function sendSMSReminder(env, appointment, customerPhone, customerName) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio credentials not configured, skipping SMS');
    return { success: false, error: 'SMS service not configured' };
  }

  const messageBody = `Bonjour ${customerName}, rappel: votre rendez-vous est prévu le ${new Date(appointment.scheduled_at).toLocaleString('fr-FR')}. À bientôt !`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('From', env.TWILIO_PHONE_NUMBER || '+33939035760');
  formData.append('To', customerPhone);
  formData.append('Body', messageBody);

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Twilio API error', { error: data });
      return { success: false, error: data.message || 'SMS send failed' };
    }

    logger.info('SMS reminder sent', { messageSid: data.sid, to: customerPhone });
    return { success: true, messageSid: data.sid };
  } catch (error) {
    logger.error('Error sending SMS reminder', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer les notifications pour un rendez-vous (email + SMS si configuré)
 */
export async function sendAppointmentNotifications(env, appointment, customer, settings) {
  const results = {
    email: null,
    sms: null
  };

  // Envoyer email de confirmation si activé
  if (settings?.notifications?.emailConfirmation && customer.email) {
    results.email = await sendConfirmationEmail(
      env,
      appointment,
      customer.email,
      customer.name || 'Client'
    );
  }

  // Envoyer SMS de rappel si activé
  if (settings?.notifications?.smsReminder && customer.phone) {
    results.sms = await sendSMSReminder(
      env,
      appointment,
      customer.phone,
      customer.name || 'Client'
    );
  }

  return results;
}

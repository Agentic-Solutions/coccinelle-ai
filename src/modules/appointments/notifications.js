/**
 * Module Notifications - Email & SMS pour rendez-vous
 * N3 : Utilise la fonction unifiée sendAppointmentConfirmation de utils/notifications.js
 */

import { logger } from '../../utils/logger.js';
import { sendAppointmentConfirmation } from '../../utils/notifications.js';

/**
 * Envoyer les notifications pour un rendez-vous (email + SMS si configuré)
 * Délègue à la fonction unifiée sendAppointmentConfirmation (N3)
 */
export async function sendAppointmentNotifications(env, appointment, customer, settings) {
  // Déterminer le canal à utiliser selon les settings
  let channel = 'both';
  const emailEnabled = settings?.notifications?.emailConfirmation && customer.email;
  const smsEnabled = settings?.notifications?.smsReminder && customer.phone;

  if (emailEnabled && !smsEnabled) channel = 'email';
  else if (!emailEnabled && smsEnabled) channel = 'sms';
  else if (!emailEnabled && !smsEnabled) {
    return { email: null, sms: null };
  }

  // Utiliser la fonction unifiée
  const result = await sendAppointmentConfirmation(env, appointment.id, channel);

  return {
    email: result.channels.includes('email') ? { success: true } : null,
    sms: result.channels.includes('sms') ? { success: true } : null,
    errors: result.errors
  };
}

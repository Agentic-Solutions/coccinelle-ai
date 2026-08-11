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
import { envoyerSmsTrace } from '../modules/shared/sms-envoi.js';
import { reconcilePendingBundles } from '../modules/compliance/routes.js';

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
  // Conformité : réconcilie les bundles Twilio en revue (débloque l'attribution).
  try {
    await reconcilePendingBundles(env);
  } catch (error) {
    logger.error('Cron bundle reconcile failed', { error: error.message, stack: error.stack });
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
      t.name AS company_name, t.id AS tenant_id, t.slug AS tenant_slug,
      a.prospect_id,
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
      -- Pas de rappel pour un rendez-vous pris il y a moins de 24 h : le client
      -- vient de le fixer, le lui rappeler le soir meme fait redondant et
      -- ferait douter d'un doublon.
      AND julianday(a.scheduled_at) - julianday(a.created_at) >= 1
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

      // ⚠️ `scheduled_at` est une date-heure NAIVE et deja LOCALE
      // (« 2026-08-12T16:00:00 ») : c'est l'heure affichee au client. La relire
      // avec new Date() la fait interpreter comme de l'UTC, et la reafficher en
      // Europe/Paris ajoute deux heures — un RDV de 16h etait rappele pour 18h
      // (constate en recette reelle le 11/08/2026, apres correction du meme
      // defaut dans public/booking.js : le bug vivait dans DEUX fichiers).
      const partie = String(apt.scheduled_at).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
      const heureStr = partie ? `${partie[4]}:${partie[5]}` : String(apt.scheduled_at);
      const jourStr = partie
        ? new Date(Date.UTC(+partie[1], +partie[2] - 1, +partie[3])).toLocaleDateString('fr-FR', {
            timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
          })
        : '';

      // Message court : un rappel se lit sur l'ecran de veille, il ne se
      // deroule pas. Le lien remplace « Repondez CONFIRMER ou ANNULER », qui
      // promettait un traitement des reponses entrantes qui n'existe pas.
      let message = `Rappel : RDV demain ${jourStr} a ${heureStr}`;
      if (apt.company_name) message += ` chez ${apt.company_name}`;
      message += '.';
      if (apt.tenant_slug) {
        message += ` Modifier : https://coccinelle.ai/b/${encodeURIComponent(apt.tenant_slug)}`;
      }

      // Envoi trace : part par Twilio ET apparait dans l'historique du contact.
      const smsResult = await envoyerSmsTrace(env, {
        tenantId: apt.tenant_id,
        to: phone,
        message,
        type: 'rappel_rdv',        // pas d'ajout automatique de lien : il est deja la
        prospectId: apt.prospect_id || null,
        nomContact: customerName,
      });
      smsResult.success = smsResult.envoye;

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

/*
 * `sendSMSViaTwilio` a ete retiree le 11/08/2026 : elle envoyait sans laisser
 * de trace dans l'historique du contact. Les rappels passent desormais par
 * shared/sms-envoi.js, qui envoie ET rattache le message a la conversation.
 */

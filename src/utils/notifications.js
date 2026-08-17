import { logger } from './logger.js';
import { sendPushToTenant } from '../modules/push/push-service.js';
import { envoyerSmsTrace } from '../modules/shared/sms-envoi.js';

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
      // ── Destinations des notifications (corrige le 13/08/2026) ──
      //
      // Les QUATRE URL precedentes etaient mortes : trois pointaient sur des
      // redirections legacy, qui en export statique affichent une page d'erreur
      // au lieu de rediriger (regle i.16bis), et « /dashboard/calls » n'a JAMAIS
      // existe. Autrement dit, taper sur une notification menait toujours dans
      // le mur — le chemin le plus court entre un client et la perte de
      // confiance, puisque c'est lui qui declenche le geste.
      //
      // Ces URL doivent viser des pages REELLES. Toute modification ici se
      // verifie avec design/menage/verifier-liens.sh, qui echoue si une URL
      // referencee ne correspond a aucune page construite.
      const pushUrl = type === 'new_appointment' ? '/dashboard/rdv'
        : type === 'missed_call' ? '/dashboard/analytics/calls'
        : type === 'new_prospect' ? '/dashboard/crm/prospects'
        : type === 'new_message' ? '/dashboard/conversations'
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
 * ⚠️ SMS UNIQUEMENT depuis le 15/08/2026 — décision produit.
 *
 * Coccinelle ne parle jamais d'e-mail à ses clients : le produit, c'est la voix
 * et le SMS après appel. Un contact ne doit donc pas recevoir un message d'un
 * canal dont le produit ne parle nulle part — il ne saurait ni d'où il vient, ni
 * comment s'en désabonner, et le garagiste ne le verrait pas dans son historique.
 *
 * Le paramètre `channel` est CONSERVÉ dans la signature mais n'influe plus que
 * sur l'absence d'envoi : `'email'` seul ne produit plus rien. Le supprimer
 * aurait cassé quatre appelants sans nécessité, et le garder documenté explique
 * pourquoi un appel avec `'email'` ne fait rien.
 *
 * @param {object} env - Cloudflare env bindings
 * @param {string} appointmentId - ID du RDV
 * @param {string} channel - `'sms'` ou `'both'` : identiques. `'email'` : aucun envoi.
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
    // `prospect_email` n'est plus lu : 27 contacts sur 34 en ont une en base, et
    // aucun ne doit recevoir d'e-mail. L'adresse est CONSERVÉE (la finalité est
    // suspendue, pas disparue — le canal reviendra avec MailIA), simplement plus
    // utilisée pour envoyer.
    const scheduledAt = appointment.scheduled_at;
    const typeName = appointment.type_name || appointment.service_type || 'Rendez-vous';
    const duration = appointment.type_duration || appointment.duration_minutes || 30;

    const dateStr = formatDateFR(scheduledAt);
    const channelsUsed = [];

    // ── L'ENVOI E-MAIL AU CONTACT EST SUPPRIMÉ (15/08/2026) ──
    //
    // Ce bloc envoyait la confirmation de rendez-vous à `prospect_email` dès que
    // `channel` valait `'email'` ou `'both'` — et `'both'` est le DÉFAUT de la
    // fonction. `retell/routes.js:874` le passe même explicitement. Un contact
    // avec une adresse en base recevait donc un e-mail que rien, dans le produit,
    // n'annonce ni ne montre.
    //
    // `sendConfirmationEmailInternal` est supprimée avec lui : ce bloc était son
    // unique appelant.

    // Envoi SMS — le seul canal vers les contacts.
    if (channel !== 'email' && customerPhone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      // ── Chemin UNIQUE (chantier COMPACTION, 17/08/2026) ──
      // Avant : appel direct a Twilio via `sendConfirmationSMSInternal`, donc sans
      // compaction GSM-7 et sans plafond quotidien. Le message porte « confirmé » (é,
      // dans la table) mais aussi « A bientot » — et le NOM du client, qui peut fort
      // bien contenir un « ç » ou un « ô ». Un Francois ou une Chloé faisait basculer
      // tout le message en UCS-2, a 70 unites par segment.
      //
      // `type: 'confirmation_rdv'` : c'est un message CLIENT, donc il est trace dans
      // « Mes communications » (il n'est pas dans `EST_INTERNE`) et il ne recoit pas de
      // lien de reservation — le rendez-vous est deja pris (`TYPES_SMS`).
      try {
        const smsBody = `Bonjour ${customerName}, votre ${typeName} est confirmé pour le ${dateStr} (${duration} min). A bientot ! - Coccinelle.ai`;
        const envoi = await envoyerSmsTrace(env, {
          tenantId: appointment.tenant_id || null,
          to: customerPhone,
          message: smsBody,
          type: 'confirmation_rdv',
          nomContact: customerName,
          // Numero lu dans la jointure du rendez-vous (`appointment.customer_phone`
          // ou la fiche prospect) : nos donnees, pas une saisie. Le REFUS s'applique
          // quand meme — c'est la garde de CONTACT qui n'a rien a verifier ici.
          destinataireVerifie: true,
        });
        if (envoi.envoye) {
          channelsUsed.push('sms');
          // `envoyerSmsTrace` trace deja dans la conversation du contact : la trace
          // manuelle `logOmniMessage` faisait doublon et est supprimee.
        } else {
          result.errors.push('SMS: ' + (envoi.erreur || 'echec'));
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

/*
 * `sendConfirmationEmailInternal` supprimee le 15/08/2026 (45 lignes) : elle
 * composait le gabarit HTML de la confirmation de rendez-vous et l'envoyait par
 * Resend au CONTACT. Son unique appelant a ete retire — Coccinelle ne parle
 * jamais d'e-mail a ses clients, la confirmation part en SMS.
 *
 * A ne pas confondre avec les e-mails qui RESTENT, et qui sont les NOTRES :
 * verification d'adresse a l'inscription (`auth/routes.js`), mot de passe
 * oublie, invitation d'equipe (`users/routes.js`), tickets vers
 * support@coccinelle.ai (`support/routes.js`), notifications de conformite
 * (`compliance/notify.js`). Ceux-la ne sont pas une fonction vendue.
 */

/*
 * ⛔ `sendConfirmationSMSInternal` et `logOmniMessage` supprimees le 17/08/2026.
 *
 * La premiere appelait Twilio DIRECTEMENT (sans compaction GSM-7, sans plafond) ; la
 * seconde ecrivait une trace a la main dans `omni_messages`. `envoyerSmsTrace` fait
 * les deux, mieux : il compacte, il plafonne, et il rattache le message a la
 * conversation du contact plutot que d'inserer une ligne isolee.
 *
 * ⚠️ CORRECTION D'UNE ERREUR D'ANALYSE. J'avais d'abord conclu que tout ce chemin
 * etait MORT, au motif que son seul appelant serait `retell/routes.js`. C'etait faux :
 * mon grep excluait « notifications.js », et il existe DEUX fichiers de ce nom. Le
 * vrai appelant, `src/modules/appointments/notifications.js` → `appointments/routes.js`
 * (creation d'un rendez-vous depuis le dashboard), etait donc masque par l'exclusion.
 * Ce chemin est VIVANT et client-facing. Une exclusion de grep par NOM DE FICHIER, dans
 * une base qui a deux fichiers homonymes, cache exactement ce qu'on cherche.
 */

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

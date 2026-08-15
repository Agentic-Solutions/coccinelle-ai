// Module Public Booking - Prise de RDV publique par slug tenant
import { logger } from '../../utils/logger.js';
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { envoyerSmsTrace } from '../shared/sms-envoi.js';
import { composerMessage } from '../shared/sms-modeles.js';

/**
 * GET /api/v1/public/booking/:tenantSlug
 * Retourne les infos du tenant + types de RDV disponibles
 */
export async function handleGetBookingInfo(request, env, slug) {
  try {
    const tenant = await env.DB.prepare(`
      SELECT id, company_name, name, sector, industry, phone
      FROM tenants
      WHERE slug = ? AND is_active = 1
    `).bind(slug).first();

    if (!tenant) {
      return errorResponse('Entreprise introuvable', 404, request);
    }

    // Récupérer les types de RDV actifs
    let types = [];
    try {
      const result = await env.DB.prepare(`
        SELECT id, name, duration_minutes, description, price, color
        FROM appointment_types
        WHERE tenant_id = ? AND is_active = 1
        ORDER BY display_order ASC, name ASC
      `).bind(tenant.id).all();
      types = result.results || [];
    } catch (e) {
      logger.warn('appointment_types table error', { error: e.message });
    }

    return successResponse({
      tenant: {
        name: tenant.name || tenant.company_name,
        industry: tenant.sector || tenant.industry,
        phone: tenant.phone,
        color: '#1a1a1a'
      },
      appointment_types: types
    }, 200, request);

  } catch (error) {
    logger.error('Error fetching booking info', { error: error.message, slug });
    return errorResponse('Erreur serveur', 500, request);
  }
}

/**
 * GET /api/v1/public/booking/:tenantSlug/slots?date=YYYY-MM-DD&type_id=...
 * Retourne les créneaux disponibles pour une date et un type de RDV
 */
export async function handleGetBookingSlots(request, env, slug) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const typeId = url.searchParams.get('type_id');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse('Paramètre date requis (YYYY-MM-DD)', 400, request);
    }

    // Vérifier que la date n'est pas dans le passé
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return errorResponse('La date ne peut pas être dans le passé', 400, request);
    }

    const tenant = await env.DB.prepare(
      'SELECT id, name FROM tenants WHERE slug = ? AND is_active = 1'
    ).bind(slug).first();

    if (!tenant) {
      return errorResponse('Entreprise introuvable', 404, request);
    }

    // Durée du RDV (par défaut 30 min)
    let slotDuration = 30;
    if (typeId) {
      const appointmentType = await env.DB.prepare(
        'SELECT duration_minutes FROM appointment_types WHERE id = ? AND tenant_id = ? AND is_active = 1'
      ).bind(typeId, tenant.id).first();
      if (appointmentType) {
        slotDuration = appointmentType.duration_minutes || 30;
      }
    }

    // Récupérer les agents actifs du tenant
    let agents = [];
    try {
      const result = await env.DB.prepare(`
        SELECT id, first_name, last_name
        FROM commercial_agents
        WHERE tenant_id = ? AND is_active = 1
      `).bind(tenant.id).all();
      agents = result.results || [];
    } catch (e) {
      // Fallback: check users table for agents
      logger.warn('commercial_agents table error, checking users', { error: e.message });
    }

    // Si aucun agent, essayer avec les users du tenant
    if (agents.length === 0) {
      try {
        const result = await env.DB.prepare(`
          SELECT id, name as first_name, '' as last_name
          FROM users
          WHERE tenant_id = ? AND is_active = 1
          LIMIT 5
        `).bind(tenant.id).all();
        agents = result.results || [];
      } catch (e) {
        logger.warn('users fallback error', { error: e.message });
      }
    }

    if (agents.length === 0) {
      return successResponse({ date, slots: [] }, 200, request);
    }

    // day_of_week canonique 1-7 (Lundi=1 … Dimanche=7) — cohérent avec availability_slots.
    // getUTCDay() renvoie 0=Dimanche … 6=Samedi → 0 devient 7.
    const jsDay = new Date(date + 'T12:00:00Z').getUTCDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const allSlots = [];

    for (const agent of agents) {
      // Chercher les disponibilités de l'agent
      let workingHours = null;
      try {
        workingHours = await env.DB.prepare(`
          SELECT start_time, end_time
          FROM availability_slots
          WHERE agent_id = ? AND day_of_week = ? AND is_available = 1
        `).bind(agent.id, dayOfWeek).first();
      } catch (e) {
        // Table might not exist
      }

      // Fallback: business_hours table
      if (!workingHours) {
        try {
          workingHours = await env.DB.prepare(`
            SELECT start_time, end_time
            FROM business_hours
            WHERE tenant_id = ? AND day_of_week = ? AND is_open = 1
          `).bind(tenant.id, dayOfWeek).first();
        } catch (e) {
          // Table might not exist
        }
      }

      // Fallback: horaires par défaut (9h-18h sauf weekend)
      if (!workingHours) {
        if (dayOfWeek === 6 || dayOfWeek === 7) continue; // Pas de week-end (Sam=6, Dim=7)
        workingHours = { start_time: '09:00', end_time: '18:00' };
      }

      // Récupérer les RDV existants pour ce jour et cet agent
      let existingAppointments = [];
      try {
        const result = await env.DB.prepare(`
          SELECT scheduled_at, duration_minutes
          FROM appointments
          WHERE (agent_id = ? OR (tenant_id = ? AND agent_id IS NULL))
          AND DATE(scheduled_at) = ?
          AND status NOT IN ('cancelled', 'no_show')
        `).bind(agent.id, tenant.id, date).all();
        existingAppointments = result.results || [];
      } catch (e) {
        logger.warn('appointments lookup error', { error: e.message });
      }

      // Générer les créneaux
      const slots = generateTimeSlots(
        workingHours.start_time,
        workingHours.end_time,
        existingAppointments,
        slotDuration
      );

      const agentName = [agent.first_name, agent.last_name].filter(Boolean).join(' ');

      slots.forEach(slot => {
        allSlots.push({
          time: slot,
          datetime: `${date}T${slot}:00`,
          agent_id: agent.id,
          agent_name: agentName
        });
      });
    }

    // Dédupliquer par time (garder le premier agent disponible)
    const uniqueSlots = [];
    const seenTimes = new Set();
    for (const slot of allSlots.sort((a, b) => a.time.localeCompare(b.time))) {
      if (!seenTimes.has(slot.time)) {
        seenTimes.add(slot.time);
        uniqueSlots.push(slot);
      }
    }

    return successResponse({ date, slots: uniqueSlots }, 200, request);

  } catch (error) {
    logger.error('Error fetching booking slots', { error: error.message, slug });
    return errorResponse('Erreur serveur', 500, request);
  }
}

/**
 * POST /api/v1/public/booking/:tenantSlug/book
 * Crée un RDV public (+ dedup prospect)
 */
export async function handleCreatePublicBooking(request, env, slug) {
  try {
    const body = await request.json();
    const { first_name, last_name, email, phone, datetime, type_id, agent_id, notes } = body;

    // Validation
    if (!first_name || !last_name || !phone || !datetime) {
      return errorResponse('Champs requis : first_name, last_name, phone, datetime', 400, request);
    }

    // Valider format email si fourni
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('Format email invalide', 400, request);
    }

    const tenant = await env.DB.prepare(
      'SELECT id, name FROM tenants WHERE slug = ? AND is_active = 1'
    ).bind(slug).first();

    if (!tenant) {
      return errorResponse('Entreprise introuvable', 404, request);
    }

    // Durée du RDV (résoudre AVANT le check de chevauchement)
    const targetAgentId = agent_id || null;
    let durationMinutes = 30;
    let typeName = null;
    if (type_id) {
      try {
        const appointmentType = await env.DB.prepare(
          'SELECT duration_minutes, name FROM appointment_types WHERE id = ? AND tenant_id = ?'
        ).bind(type_id, tenant.id).first();
        if (appointmentType) {
          durationMinutes = appointmentType.duration_minutes || 30;
          typeName = appointmentType.name;
        }
      } catch { /* table peut ne pas exister */ }
    }

    // Vérifier que le créneau ne chevauche pas un RDV existant (BUG #014)
    try {
      const conflict = await env.DB.prepare(`
        SELECT COUNT(*) as n FROM appointments
        WHERE tenant_id = ?
          AND status IN ('scheduled', 'confirmed', 'pending')
          AND datetime(scheduled_at) < datetime(?, '+' || ? || ' minutes')
          AND datetime(scheduled_at, '+' || COALESCE(duration_minutes, 60) || ' minutes') > datetime(?)
      `).bind(tenant.id, datetime, durationMinutes, datetime).first();
      if (conflict && conflict.n > 0) {
        return errorResponse('Ce créneau n\'est plus disponible', 409, request);
      }
    } catch (checkErr) {
      logger.warn('Public booking conflict check failed', { error: checkErr.message });
    }

    // ── Dedup prospect : par TÉLÉPHONE, et par e-mail seulement s'il y en a un ──
    //
    // La requête était `(phone = ? OR (email = ? AND email IS NOT NULL))` avec
    // `email || ''` en liaison. Le formulaire ne demandant plus d'adresse
    // (15/08/2026), elle cherchait donc `email = ''` à chaque réservation. Aucun
    // prospect n'a d'e-mail vide aujourd'hui — vérifié, 0 ligne — mais le premier
    // créé avec une chaîne vide aurait capté TOUTES les réservations suivantes du
    // tenant, et le rendez-vous serait allé sur la fiche d'un inconnu. Une bombe à
    // retardement, désamorcée pendant qu'elle coûte une ligne.
    //
    // La branche e-mail est conservée : l'API publique accepte encore le champ (un
    // intégrateur peut l'envoyer), et un rapprochement par adresse reste juste
    // quand l'adresse existe vraiment.
    const emailDedup = (email || '').trim() || null;
    let prospect = null;
    try {
      prospect = emailDedup
        ? await env.DB.prepare(
          'SELECT id FROM prospects WHERE tenant_id = ? AND (phone = ? OR email = ?)'
        ).bind(tenant.id, phone, emailDedup).first()
        : await env.DB.prepare(
          'SELECT id FROM prospects WHERE tenant_id = ? AND phone = ?'
        ).bind(tenant.id, phone).first();
    } catch (e) {
      // Fallback: just phone
      prospect = await env.DB.prepare(
        'SELECT id FROM prospects WHERE tenant_id = ? AND phone = ?'
      ).bind(tenant.id, phone).first();
    }

    let prospectId;
    const now = new Date().toISOString();

    if (!prospect) {
      prospectId = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO prospects (id, tenant_id, first_name, last_name, email, phone, source, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'booking_page', 'new', ?)
      `).bind(prospectId, tenant.id, first_name, last_name, email || null, phone, now).run();
    } else {
      prospectId = prospect.id;
      // Mettre à jour les infos si le prospect existe déjà
      await env.DB.prepare(`
        UPDATE prospects
        SET first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email)
        WHERE id = ?
      `).bind(first_name, last_name, email || null, prospectId).run();
    }

    // Créer le RDV
    const appointmentId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const managementToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    try {
      await env.DB.prepare(`
        INSERT INTO appointments (
          id, tenant_id, prospect_id, agent_id, service_id, type,
          scheduled_at, duration_minutes, management_token, status, notes, created_at,
          customer_name, customer_email, customer_phone, booking_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, 'booking_page')
      `).bind(
        appointmentId,
        tenant.id,
        prospectId,
        targetAgentId,
        null,
        typeName || 'booking',
        datetime,
        durationMinutes,
        managementToken,
        notes || null,
        now,
        `${first_name} ${last_name}`.trim(),
        email || null,
        phone || null
      ).run();
    } catch (insertError) {
      // Fallback: try with minimal columns (original schema compatibility)
      logger.warn('Appointment insert with full schema failed, trying fallback', { error: insertError.message });
      try {
        await env.DB.prepare(`
          INSERT INTO appointments (
            id, tenant_id, prospect_id, agent_id, type,
            scheduled_at, duration_minutes, management_token, status, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
        `).bind(
          appointmentId,
          tenant.id,
          prospectId,
          targetAgentId,
          typeName || 'booking',
          datetime,
          durationMinutes,
          managementToken,
          notes || null,
          now
        ).run();
      } catch (fallbackError) {
        logger.error('Appointment creation failed completely', { error: fallbackError.message });
        return errorResponse('Erreur lors de la création du rendez-vous', 500, request);
      }
    }

    // ── Confirmation au client ──
    // La page promet « vous recevrez une confirmation par SMS ou par e-mail »
    // depuis toujours, et rien n'etait envoye : l'appel n'existait pas. Non
    // bloquant — un SMS qui echoue ne doit pas annuler un rendez-vous pris.
    let confirmationEnvoyee = false;
    let canalConfirmation = null;
    try {
      // ── Le texte vient du GABARIT du tenant (CX-3 lot 2, 15/08/2026) ──
      //
      // Il etait en dur ici : un garagiste ne pouvait pas le formuler autrement.
      // `composerMessage` lit son gabarit s'il en a un, sinon le defaut — qui est
      // mot pour mot la phrase precedente. Aucun tenant ne voit son message
      // changer aujourd'hui.
      //
      // ⚠️ La date et l'heure sont passees SEPAREMENT, chacune deja formatee
      // ici : `scheduled_at` est une date-heure NAIVE et deja LOCALE (regle
      // 10quinquies), et le seul endroit qui le sait correctement est
      // `_formaterDateHeureFr`. Laisser le module de gabarits formater une date
      // ferait renaitre le decalage de deux heures, dans un troisieme fichier.
      const { jour, heure } = _separerDateHeureFr(datetime);
      const texte = await composerMessage(env, tenant.id, 'confirmation_rdv', {
        '{entreprise}': tenant.name,
        '{date}': jour,
        '{heure}': heure,
        // Espace inclus : le gabarit ecrit « RDV {prestation}chez … », donc le
        // jeton porte son propre separateur. Vide, la phrase se referme d'elle-meme.
        '{prestation}': typeName ? `${typeName} ` : '',
      });

      if (phone) {
        const envoi = await envoyerSmsTrace(env, {
          tenantId: tenant.id,
          to: phone,
          message: texte,
          type: 'confirmation_rdv',   // pas de lien de reservation : le RDV est pris
          prospectId,
          nomContact: `${first_name} ${last_name}`.trim(),
        });
        if (envoi.envoye) { confirmationEnvoyee = true; canalConfirmation = 'sms'; }
      }

      if (confirmationEnvoyee) {
        await env.DB.prepare(
          `UPDATE appointments SET confirmation_sent = 1, confirmation_channel = ?
           WHERE id = ?`,
        ).bind(canalConfirmation, appointmentId).run();
      } else {
        logger.warn('[Booking] Confirmation non envoyée', { appointmentId, phone: !!phone });
      }
    } catch (erreurConfirmation) {
      logger.warn('[Booking] Confirmation en échec, rendez-vous conservé', {
        appointmentId, erreur: erreurConfirmation.message,
      });
    }

    return successResponse({
      appointment_id: appointmentId,
      prospect_id: prospectId,
      datetime,
      duration_minutes: durationMinutes,
      type_name: typeName,
      confirmation_sent: confirmationEnvoyee,
      confirmation_channel: canalConfirmation,
      message: 'Votre rendez-vous a été confirmé'
    }, 201, request);

  } catch (error) {
    logger.error('Error creating public booking', { error: error.message, slug });
    return errorResponse('Erreur lors de la création du rendez-vous', 500, request);
  }
}

// ========================================
// HELPERS
// ========================================

/**
 * « mercredi 12 août à 14:30 ».
 *
 * ⚠️ `appointments.scheduled_at` est une date-heure NAIVE et deja LOCALE
 * (« 2026-08-12T14:30:00 », sans fuseau) : c'est l'heure affichee au client sur
 * la page de reservation. La relire avec `new Date()` la fait interpreter comme
 * de l'UTC, et la reafficher en Europe/Paris ajoute deux heures — un rendez-vous
 * pris a 14h30 etait confirme pour 16h30 (constate en recette le 11/08/2026).
 * On lit donc les composantes telles quelles, sans jamais convertir.
 */
/**
 * Les deux composantes, separement — le gabarit les place ou il veut.
 *
 * Meme lecture NAIVE que ci-dessus : on prend les composantes du texte telles
 * quelles et on ne convertit jamais. `_formaterDateHeureFr` s'appuie desormais
 * sur cette fonction plutot que de refaire le decoupage, pour qu'il n'existe
 * qu'UN endroit ou cette date est lue.
 */
function _separerDateHeureFr(valeur) {
  try {
    const m = String(valeur).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return { jour: String(valeur), heure: '' };
    const [, annee, mois, jour, heures, minutes] = m;
    // Le jour de la semaine se calcule en UTC pour n'introduire aucun decalage.
    const reference = new Date(Date.UTC(+annee, +mois - 1, +jour));
    return {
      jour: reference.toLocaleDateString('fr-FR', {
        timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
      }),
      heure: `${heures}:${minutes}`,
    };
  } catch {
    return { jour: String(valeur), heure: '' };
  }
}

function generateTimeSlots(startTime, endTime, existingAppointments, slotDuration = 30) {
  const slots = [];

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Pré-calculer les plages occupées en minutes depuis minuit (BUG #014)
  const bookedRanges = existingAppointments.filter(a => a.scheduled_at).map(appt => {
    const timePart = appt.scheduled_at.includes('T')
      ? appt.scheduled_at.split('T')[1].substring(0, 5)
      : '';
    const [h, m] = timePart.split(':').map(Number);
    const apptStart = (h || 0) * 60 + (m || 0);
    const apptEnd = apptStart + (appt.duration_minutes || 60);
    return { apptStart, apptEnd };
  });

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + slotDuration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const minutes = (currentMinutes % 60).toString().padStart(2, '0');
    const timeSlot = `${hours}:${minutes}`;

    // BUG #014 : chevauchement de plage [slotStart, slotEnd[ vs [apptStart, apptEnd[
    const slotEnd = currentMinutes + slotDuration;
    const isOccupied = bookedRanges.some(r =>
      currentMinutes < r.apptEnd && r.apptStart < slotEnd
    );

    if (!isOccupied) {
      slots.push(timeSlot);
    }

    currentMinutes += slotDuration;
  }

  return slots;
}

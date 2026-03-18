// Module Public Widget - Routes publiques sans authentification
// Pour permettre l'embed du widget sur sites clients
import { createWebCall } from '../retell/routes.js';
import { logger } from '../../utils/logger.js';
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { rateLimitResponse } from '../../utils/rate-limiter.js';
import { handleGetBookingInfo, handleGetBookingSlots, handleCreatePublicBooking } from './booking.js';

export async function handlePublicRoutes(request, env, path, method) {
  const url = new URL(request.url);

  // Rate limit public endpoints: 30 requests/minute per IP
  const rateLimited = rateLimitResponse(request, path, { maxRequests: 30, windowMs: 60000 });
  if (rateLimited) return rateLimited;

  try {
    // ========================================
    // BOOKING PUBLIC ROUTES (par slug)
    // ========================================

    // GET /api/v1/public/booking/:slug - Infos tenant + types de RDV
    const bookingInfoMatch = path.match(/^\/api\/v1\/public\/booking\/([^\/]+)$/);
    if (bookingInfoMatch && method === 'GET') {
      return await handleGetBookingInfo(request, env, bookingInfoMatch[1]);
    }

    // GET /api/v1/public/booking/:slug/slots?date=...&type_id=... - Créneaux disponibles
    const bookingSlotsMatch = path.match(/^\/api\/v1\/public\/booking\/([^\/]+)\/slots$/);
    if (bookingSlotsMatch && method === 'GET') {
      return await handleGetBookingSlots(request, env, bookingSlotsMatch[1]);
    }

    // POST /api/v1/public/booking/:slug/book - Créer un RDV
    const bookingCreateMatch = path.match(/^\/api\/v1\/public\/booking\/([^\/]+)\/book$/);
    if (bookingCreateMatch && method === 'POST') {
      return await handleCreatePublicBooking(request, env, bookingCreateMatch[1]);
    }

    // ========================================
    // LEGACY PUBLIC ROUTES (par tenantId)
    // ========================================

    // GET /api/v1/public/:tenantId/info - Infos tenant publiques
    if (path.match(/^\/api\/v1\/public\/([^\/]+)\/info$/) && method === 'GET') {
      return await handleGetTenantInfo(request, env, path);
    }

    // GET /api/v1/public/:tenantId/availability - Créneaux disponibles
    if (path.match(/^\/api\/v1\/public\/([^\/]+)\/availability$/) && method === 'GET') {
      return await handleGetAvailability(request, env, path, url);
    }

    // GET /api/v1/public/:tenantId/services - Services/Prestations
    if (path.match(/^\/api\/v1\/public\/([^\/]+)\/services$/) && method === 'GET') {
      return await handleGetServices(request, env, path);
    }

    // POST /api/v1/public/:tenantId/book - Créer un RDV public
    if (path.match(/^\/api\/v1\/public\/([^\/]+)\/book$/) && method === 'POST') {
      return await handleCreateBooking(request, env, path);
    }

    // POST /api/v1/public/retell/web-call - Créer un appel WebRTC démo
    if (path === '/api/v1/public/retell/web-call' && method === 'POST') {
      return await createWebCall(request, env);
    }

    // Test endpoints - only available when ENABLE_TEST_ENDPOINTS=true in env
    if (path.startsWith('/api/v1/public/test/') && method === 'POST') {
      if (!env.ENABLE_TEST_ENDPOINTS || env.ENABLE_TEST_ENDPOINTS !== 'true') {
        return errorResponse('Test endpoints are disabled in production', 403);
      }

      if (path === '/api/v1/public/test/email') {
        return await handleTestEmail(request, env);
      }
      if (path === '/api/v1/public/test/sms') {
        return await handleTestSMS(request, env);
      }
      if (path === '/api/v1/public/test/whatsapp') {
        return await handleTestWhatsApp(request, env);
      }
    }

    return null; // Route non trouvée

  } catch (error) {
    logger.error('Public route error', { error: error.message });
    return errorResponse(error.message);
  }
}

// ========================================
// HANDLERS
// ========================================

// Récupérer infos tenant publiques (nom, logo, couleur, téléphone Sara)
async function handleGetTenantInfo(request, env, path) {
  try {
    const tenantId = path.split('/')[4];

    const tenant = await env.DB.prepare(`
      SELECT
        id,
        company_name,
        industry,
        phone,
        address,
        city,
        country,
        website,
        logo_url,
        primary_color,
        vapi_phone_number
      FROM tenants
      WHERE id = ? AND is_active = 1
    `).bind(tenantId).first();

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    return successResponse({
      tenant: {
        id: tenant.id,
        name: tenant.company_name,
        industry: tenant.industry,
        phone: tenant.phone,
        address: tenant.address,
        city: tenant.city,
        country: tenant.country,
        website: tenant.website,
        logo: tenant.logo_url,
        color: tenant.primary_color || '#000000',
        saraPhone: tenant.vapi_phone_number
      }
    });
  } catch (error) {
    logger.error('Error fetching tenant info', { error: error.message });
    return errorResponse('Failed to fetch tenant info');
  }
}

// Récupérer créneaux disponibles pour une date
async function handleGetAvailability(request, env, path, url) {
  try {
    const tenantId = path.split('/')[4];
    const date = url.searchParams.get('date'); // Format: YYYY-MM-DD

    if (!date) {
      return errorResponse('Date parameter required', 400);
    }

    // Récupérer tous les agents actifs du tenant
    const agents = await env.DB.prepare(`
      SELECT id, first_name, last_name, email
      FROM commercial_agents
      WHERE tenant_id = ? AND is_active = 1
    `).bind(tenantId).all();

    if (!agents.results || agents.results.length === 0) {
      return successResponse({ slots: [] });
    }

    // Pour chaque agent, récupérer ses disponibilités
    const allSlots = [];

    for (const agent of agents.results) {
      // Récupérer les horaires de travail de l'agent pour ce jour
      const dayOfWeek = new Date(date).getDay();

      const workingHours = await env.DB.prepare(`
        SELECT start_time, end_time
        FROM availability_slots
        WHERE agent_id = ? AND day_of_week = ? AND is_active = 1
      `).bind(agent.id, dayOfWeek).first();

      if (!workingHours) continue;

      // Récupérer les RDV existants pour ce jour
      const existingAppointments = await env.DB.prepare(`
        SELECT scheduled_at, duration_minutes
        FROM appointments
        WHERE agent_id = ?
        AND DATE(scheduled_at) = ?
        AND status NOT IN ('cancelled', 'no_show')
      `).bind(agent.id, date).all();

      // Générer les créneaux disponibles (slots de 30 min par défaut)
      const slots = generateTimeSlots(
        workingHours.start_time,
        workingHours.end_time,
        existingAppointments.results || [],
        30
      );

      slots.forEach(slot => {
        allSlots.push({
          agentId: agent.id,
          agentName: `${agent.first_name} ${agent.last_name}`,
          datetime: `${date}T${slot}:00`,
          available: true
        });
      });
    }

    return successResponse({
      date: date,
      slots: allSlots.sort((a, b) => a.datetime.localeCompare(b.datetime))
    });

  } catch (error) {
    logger.error('Error fetching availability', { error: error.message });
    return errorResponse('Failed to fetch availability');
  }
}

// Récupérer services/prestations du tenant
async function handleGetServices(request, env, path) {
  try {
    const tenantId = path.split('/')[4];

    const services = await env.DB.prepare(`
      SELECT
        id,
        name,
        description,
        duration_minutes,
        price,
        currency
      FROM services
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY display_order ASC, name ASC
    `).bind(tenantId).all();

    return successResponse({
      services: services.results || []
    });

  } catch (error) {
    logger.error('Error fetching services', { error: error.message });
    return errorResponse('Failed to fetch services');
  }
}

// Créer une réservation publique (prospect + RDV)
async function handleCreateBooking(request, env, path) {
  try {
    const tenantId = path.split('/')[4];
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      datetime,
      agentId,
      serviceId,
      notes
    } = body;

    // Validation
    if (!firstName || !lastName || !phone || !datetime || !agentId) {
      return errorResponse('Missing required fields', 400);
    }

    // Vérifier que le créneau est toujours disponible
    const existingAppointment = await env.DB.prepare(`
      SELECT id FROM appointments
      WHERE agent_id = ?
      AND scheduled_at = ?
      AND status NOT IN ('cancelled', 'no_show')
    `).bind(agentId, datetime).first();

    if (existingAppointment) {
      return errorResponse('Slot no longer available', 409);
    }

    // Créer ou récupérer le prospect
    let prospect = await env.DB.prepare(`
      SELECT id FROM prospects
      WHERE tenant_id = ? AND phone = ?
    `).bind(tenantId, phone).first();

    let prospectId;

    if (!prospect) {
      // Créer nouveau prospect
      prospectId = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await env.DB.prepare(`
        INSERT INTO prospects (
          id, tenant_id, first_name, last_name, email, phone,
          source, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'widget', 'new', datetime('now'))
      `).bind(
        prospectId,
        tenantId,
        firstName,
        lastName,
        email,
        phone
      ).run();
    } else {
      prospectId = prospect.id;
    }

    // Créer le RDV
    const appointmentId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const managementToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    try {
      await env.DB.prepare(`
        INSERT INTO appointments (
          id, tenant_id, prospect_id, agent_id, service_id,
          scheduled_at, duration_minutes, status, notes,
          booking_source, management_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 'widget', ?, datetime('now'))
      `).bind(
        appointmentId,
        tenantId,
        prospectId,
        agentId,
        serviceId || null,
        datetime,
        30,
        notes || null,
        managementToken
      ).run();
    } catch (insertError) {
      // Fallback: try with minimal columns (original schema compatibility)
      logger.warn('Appointment insert with full schema failed, trying fallback', { error: insertError.message });
      await env.DB.prepare(`
        INSERT INTO appointments (
          id, tenant_id, prospect_id, agent_id,
          scheduled_at, duration_minutes, status, notes,
          management_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, datetime('now'))
      `).bind(
        appointmentId,
        tenantId,
        prospectId,
        agentId,
        datetime,
        30,
        notes || null,
        managementToken
      ).run();
    }

    // TODO: Envoyer SMS/Email de confirmation

    return successResponse({
      appointmentId: appointmentId,
      prospectId: prospectId,
      message: 'Booking confirmed successfully',
      datetime: datetime
    }, 201);

  } catch (error) {
    logger.error('Error creating booking', { error: error.message });
    return errorResponse('Failed to create booking');
  }
}

// ========================================
// TEST HANDLERS (DEV ONLY)
// ========================================

// Test email via Resend
async function handleTestEmail(request, env) {
  try {
    const body = await request.json();
    const { toEmail } = body;

    if (!toEmail) {
      return errorResponse('toEmail required', 400);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'Coccinelle.AI <onboarding@resend.dev>',
        to: toEmail,
        subject: 'Test Coccinelle.AI - Canal Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #000;">Test réussi !</h1>
            <p>Votre canal Email est correctement configuré sur <strong>Coccinelle.AI</strong>.</p>
            <p>Vous pouvez maintenant envoyer des emails automatisés à vos prospects et clients.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par Coccinelle.AI</p>
          </div>
        `
      })
    });

    const result = await response.json();

    if (result.error) {
      return errorResponse(`Erreur Resend: ${result.error.message}`, 400);
    }

    return successResponse({
      success: true,
      message: 'Email de test envoyé avec succès !',
      messageId: result.id,
      to: toEmail
    });
  } catch (error) {
    logger.error('Email test failed', { error: error.message });
    return errorResponse('Erreur lors de l\'envoi: ' + error.message, 500);
  }
}

// Test SMS via Twilio
async function handleTestSMS(request, env) {
  try {
    const body = await request.json();
    const { toNumber } = body;

    if (!toNumber) {
      return errorResponse('toNumber required', 400);
    }

    // Formater le numéro (ajouter +33 si nécessaire)
    let formattedNumber = toNumber.replace(/\s/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+33' + formattedNumber.substring(1);
    }
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    const twilioAccountSid = env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = env.TWILIO_PHONE_NUMBER || '+33939035761';

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: twilioFromNumber,
          To: formattedNumber,
          Body: 'Test Coccinelle.AI - Votre canal SMS est opérationnel !'
        })
      }
    );

    const result = await response.json();

    if (result.error_code) {
      return errorResponse(`Erreur Twilio: ${result.error_message}`, 400);
    }

    return successResponse({
      success: true,
      message: 'SMS de test envoyé avec succès !',
      messageId: result.sid,
      to: formattedNumber
    });
  } catch (error) {
    logger.error('SMS test failed', { error: error.message });
    return errorResponse('Erreur lors de l\'envoi: ' + error.message, 500);
  }
}

// Test WhatsApp via Meta API
async function handleTestWhatsApp(request, env) {
  try {
    const body = await request.json();
    const { toNumber } = body;

    if (!toNumber) {
      return errorResponse('toNumber required', 400);
    }

    // Formater le numéro (ajouter 33 si nécessaire, sans le +)
    let formattedNumber = toNumber.replace(/\s/g, '').replace('+', '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '33' + formattedNumber.substring(1);
    }

    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;

    // Envoyer un message template (hello_world est pré-approuvé par Meta)
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'template',
          template: {
            name: 'hello_world',
            language: { code: 'en_US' }
          }
        })
      }
    );

    const result = await response.json();

    if (result.error) {
      logger.error('WhatsApp error', { error: result.error });
      return errorResponse(`Erreur WhatsApp: ${result.error.message}`, 400);
    }

    return successResponse({
      success: true,
      message: 'Message WhatsApp envoyé avec succès !',
      messageId: result.messages?.[0]?.id,
      to: formattedNumber
    });
  } catch (error) {
    logger.error('WhatsApp test failed', { error: error.message });
    return errorResponse('Erreur lors de l\'envoi: ' + error.message, 500);
  }
}

// ========================================
// HELPERS
// ========================================

// Générer créneaux horaires disponibles
function generateTimeSlots(startTime, endTime, existingAppointments, slotDuration = 30) {
  const slots = [];

  // Convertir HH:MM en minutes
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + slotDuration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const minutes = (currentMinutes % 60).toString().padStart(2, '0');
    const timeSlot = `${hours}:${minutes}`;

    // Vérifier si ce créneau n'est pas déjà pris
    const isOccupied = existingAppointments.some(appt => {
      const apptTime = appt.scheduled_at.split('T')[1].substring(0, 5);
      return apptTime === timeSlot;
    });

    if (!isOccupied) {
      slots.push(timeSlot);
    }

    currentMinutes += slotDuration;
  }

  return slots;
}

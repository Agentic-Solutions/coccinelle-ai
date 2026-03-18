// Module Appointments - Routes avec permissions et filtrage par équipe
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { sendAppointmentNotifications } from './notifications.js';
import * as auth from '../auth/helpers.js';
import { getVisibleAgents, canViewAgent } from '../../utils/teams.js';
import { hasPermission } from '../../utils/permissions.js';
import { createNotification } from '../../utils/notifications.js';

export async function handleAppointmentsRoutes(request, env, path, method) {
  try {
    // GET /api/v1/appointments
    if (path === '/api/v1/appointments' && method === 'GET') {
      return await handleListAppointments(request, env);
    }

    // POST /api/v1/appointments
    if (path === '/api/v1/appointments' && method === 'POST') {
      return await handleCreateAppointment(request, env);
    }

    // GET /api/v1/appointments/:id
    if (path.match(/^\/api\/v1\/appointments\/[^/]+$/) && method === 'GET' && !path.includes('settings')) {
      const appointmentId = path.split('/')[4];
      return await handleGetAppointment(request, env, appointmentId);
    }

    // PUT /api/v1/appointments/:id
    if (path.match(/^\/api\/v1\/appointments\/[^/]+$/) && method === 'PUT' && !path.includes('settings')) {
      const appointmentId = path.split('/')[4];
      return await handleUpdateAppointment(request, env, appointmentId);
    }

    // DELETE /api/v1/appointments/:id
    if (path.match(/^\/api\/v1\/appointments\/[^/]+$/) && method === 'DELETE') {
      const appointmentId = path.split('/')[4];
      return await handleCancelAppointment(request, env, appointmentId);
    }

    // GET /api/v1/appointments/settings
    if (path === '/api/v1/appointments/settings' && method === 'GET') {
      return await handleGetSettings(request, env);
    }

    // PUT /api/v1/appointments/settings
    if (path === '/api/v1/appointments/settings' && method === 'PUT') {
      return await handleUpdateSettings(request, env);
    }

    return null;

  } catch (error) {
    logger.error('Appointments route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// Liste les RDV visibles par l'utilisateur
async function handleListAppointments(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const agentId = url.searchParams.get('agent_id');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');

  // Récupérer les agents visibles par l'utilisateur
  const visibleAgents = await getVisibleAgents(env, tenant.id, user.id, user.role);
  const visibleAgentIds = visibleAgents.map(a => a.id);

  if (visibleAgentIds.length === 0) {
    return successResponse({ appointments: [], count: 0 });
  }

  // Construire la requête avec filtres
  let query = `
    SELECT 
      a.id, a.prospect_id, a.agent_id, a.scheduled_at, a.status, 
      a.service_id, a.notes, a.created_at,
      ag.first_name as agent_first_name, ag.last_name as agent_last_name,
      (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as prospect_name, p.phone as prospect_phone, p.email as prospect_email,
      s.name as service_name, s.duration_minutes, s.price
    FROM appointments a
    LEFT JOIN agents ag ON a.agent_id = ag.id
    LEFT JOIN prospects p ON a.prospect_id = p.id
    LEFT JOIN services s ON a.service_id = s.id
    WHERE a.tenant_id = ?
  `;

  const params = [tenant.id];

  // Filtrer par agents visibles
  const placeholders = visibleAgentIds.map(() => '?').join(',');
  query += ` AND a.agent_id IN (${placeholders})`;
  params.push(...visibleAgentIds);

  // Filtres optionnels
  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  if (agentId && visibleAgentIds.includes(agentId)) {
    query += ` AND a.agent_id = ?`;
    params.push(agentId);
  }

  if (dateFrom) {
    query += ` AND a.scheduled_at >= ?`;
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND a.scheduled_at <= ?`;
    params.push(dateTo);
  }

  query += ` ORDER BY a.scheduled_at DESC LIMIT 100`;

  const result = await env.DB.prepare(query).bind(...params).all();

  return successResponse({
    appointments: result.results || [],
    count: result.results?.length || 0
  });
}

// Récupère un RDV spécifique
async function handleGetAppointment(request, env, appointmentId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  const appointment = await env.DB.prepare(`
    SELECT 
      a.*, 
      ag.first_name as agent_first_name, ag.last_name as agent_last_name,
      (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as prospect_name, p.phone as prospect_phone, p.email as prospect_email,
      s.name as service_name, s.duration_minutes, s.price
    FROM appointments a
    LEFT JOIN agents ag ON a.agent_id = ag.id
    LEFT JOIN prospects p ON a.prospect_id = p.id
    LEFT JOIN services s ON a.service_id = s.id
    WHERE a.id = ? AND a.tenant_id = ?
  `).bind(appointmentId, tenant.id).first();

  if (!appointment) {
    return jsonResponse({ success: false, error: 'RDV non trouvé' }, 404);
  }

  // Vérifier que l'utilisateur peut voir cet agent
  const canView = await canViewAgent(env, tenant.id, user.id, user.role, appointment.agent_id);
  if (!canView) {
    return jsonResponse({ success: false, error: 'Accès non autorisé' }, 403);
  }

  return successResponse({ appointment });
}

// Crée un nouveau RDV
async function handleCreateAppointment(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  const body = await request.json();
  const { prospect_id, agent_id, scheduled_at, service_id, notes, customer, type } = body;

  if (!scheduled_at) {
    return errorResponse('scheduled_at est requis', 400);
  }

  // Vérifier que l'utilisateur peut créer un RDV pour cet agent
  if (agent_id) {
    const canModify = await hasPermission(env, tenant.id, user.role, 'modify_all_appointments');
    const canView = await canViewAgent(env, tenant.id, user.id, user.role, agent_id);
    
    if (!canModify && !canView) {
      return jsonResponse({ success: false, error: 'Vous ne pouvez pas créer de RDV pour cet agent' }, 403);
    }
  }

  // Valider que le prospect existe si fourni
  const resolvedProspectId = prospect_id || null;
  if (resolvedProspectId) {
    try {
      const prospectExists = await env.DB.prepare(
        'SELECT id FROM prospects WHERE id = ? AND tenant_id = ?'
      ).bind(resolvedProspectId, tenant.id).first();
      if (!prospectExists) {
        return errorResponse('Prospect introuvable. Vérifiez le prospect_id.', 400);
      }
    } catch (e) {
      logger.warn('Prospect validation skipped', { error: e.message });
    }
  }

  // Valider que l'agent existe si fourni
  const resolvedAgentId = agent_id || null;
  if (resolvedAgentId) {
    try {
      // Check both agents and commercial_agents tables
      let agentExists = await env.DB.prepare(
        'SELECT id FROM agents WHERE id = ?'
      ).bind(resolvedAgentId).first();
      if (!agentExists) {
        agentExists = await env.DB.prepare(
          'SELECT id FROM commercial_agents WHERE id = ?'
        ).bind(resolvedAgentId).first();
      }
      if (!agentExists) {
        // Also check users table as agents might be users
        agentExists = await env.DB.prepare(
          'SELECT id FROM users WHERE id = ? AND tenant_id = ?'
        ).bind(resolvedAgentId, tenant.id).first();
      }
      if (!agentExists) {
        return errorResponse('Agent introuvable. Vérifiez le agent_id.', 400);
      }
    } catch (e) {
      logger.warn('Agent validation skipped', { error: e.message });
    }
  }

  const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  try {
    const managementToken = Math.random().toString(36).substr(2, 16);
    await env.DB.prepare(`
      INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, service_id, type, scheduled_at, management_token, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).bind(appointmentId, tenant.id, resolvedProspectId, resolvedAgentId, service_id || null, type || 'visit', scheduled_at, managementToken, notes || null, now).run();
  } catch (dbError) {
    // Handle FK constraint or missing column errors gracefully
    logger.warn('Appointment insert with full schema failed, trying fallback', { error: dbError.message });
    try {
      await env.DB.prepare(`
        INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, scheduled_at, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `).bind(appointmentId, tenant.id, resolvedProspectId, resolvedAgentId, scheduled_at, notes || null, now).run();
    } catch (fallbackError) {
      logger.error('Appointment creation failed', { error: fallbackError.message });
      return errorResponse('Impossible de créer le rendez-vous: ' + fallbackError.message, 500);
    }
  }

  const appointment = {
    id: appointmentId,
    tenant_id: tenant.id,
    prospect_id: resolvedProspectId,
    agent_id: resolvedAgentId,
    service_id,
    scheduled_at,
    status: 'scheduled',
    notes,
    created_at: now
  };

  // Notifications si customer fourni
  if (customer) {
    try {
      const settings = await loadAppointmentSettings(env, tenant.id);
      if (settings?.notifications?.emailConfirmation || settings?.notifications?.smsReminder) {
        await sendAppointmentNotifications(env, appointment, customer, settings);
      }
    } catch (notifError) {
      logger.warn('Notification send failed (non-blocking)', { error: notifError.message });
    }
  }

  // Log audit
  await auth.logAudit(env, {
    tenant_id: tenant.id,
    user_id: user.id,
    action: 'appointment.create',
    resource_type: 'appointment',
    resource_id: appointmentId,
    changes: { agent_id: resolvedAgentId, scheduled_at, service_id }
  });

  return successResponse({ appointment }, 201);
}

// Met à jour un RDV
async function handleUpdateAppointment(request, env, appointmentId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  // Récupérer le RDV existant
  const existing = await env.DB.prepare(`
    SELECT * FROM appointments WHERE id = ? AND tenant_id = ?
  `).bind(appointmentId, tenant.id).first();

  if (!existing) {
    return jsonResponse({ success: false, error: 'RDV non trouvé' }, 404);
  }

  // Vérifier les permissions
  const canModifyAll = await hasPermission(env, tenant.id, user.role, 'modify_all_appointments');
  const canViewAgent = await canViewAgent(env, tenant.id, user.id, user.role, existing.agent_id);

  if (!canModifyAll && !canViewAgent) {
    return jsonResponse({ success: false, error: 'Permission refusée' }, 403);
  }

  const body = await request.json();
  const { scheduled_at, status, notes, agent_id, service_id } = body;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE appointments
    SET scheduled_at = COALESCE(?, scheduled_at),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        agent_id = COALESCE(?, agent_id),
        service_id = COALESCE(?, service_id),
        updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(scheduled_at, status, notes, agent_id, service_id, now, appointmentId, tenant.id).run();

  // Feature 13: Workflow Prospect → Client quand le RDV est marqué 'completed'
  let convertedCustomerId = null;
  if (status === 'completed' && existing.status !== 'completed' && existing.prospect_id && existing.prospect_id !== 'unknown') {
    try {
      const prospect = await env.DB.prepare(
        'SELECT * FROM prospects WHERE id = ? AND tenant_id = ?'
      ).bind(existing.prospect_id, tenant.id).first();

      if (prospect && prospect.status !== 'converted') {
        const customerId = auth.generateId('cust');
        convertedCustomerId = customerId;

        await env.DB.prepare(`
          INSERT INTO customers (id, tenant_id, first_name, last_name, email, phone, status, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'active', 'prospect_conversion', datetime('now'), datetime('now'))
        `).bind(
          customerId, tenant.id,
          prospect.first_name || null, prospect.last_name || null,
          prospect.email || null, prospect.phone || null
        ).run();

        await env.DB.prepare(
          'UPDATE prospects SET status = ? WHERE id = ? AND tenant_id = ?'
        ).bind('converted', existing.prospect_id, tenant.id).run();

        try {
          await env.DB.prepare(`
            INSERT INTO analytics_events (id, tenant_id, type, data, created_at)
            VALUES (?, ?, 'prospect_converted', ?, datetime('now'))
          `).bind(
            auth.generateId('evt'), tenant.id,
            JSON.stringify({ prospect_id: existing.prospect_id, customer_id: customerId })
          ).run();
        } catch (e) {
          logger.warn('Analytics event insert skipped', { error: e.message });
        }

        await createNotification(env, {
          tenant_id: tenant.id,
          user_id: user.id,
          type: 'prospect_converted',
          title: 'Prospect converti en client',
          message: `${prospect.first_name || ''} ${prospect.last_name || ''} a ete converti en client suite au RDV termine.`,
          data: { prospect_id: existing.prospect_id, customer_id: customerId }
        });
      }
    } catch (convErr) {
      logger.error('Prospect conversion error', { error: convErr.message });
    }
  }

  // Log audit
  await auth.logAudit(env, {
    tenant_id: tenant.id,
    user_id: user.id,
    action: 'appointment.update',
    resource_type: 'appointment',
    resource_id: appointmentId,
    changes: { scheduled_at, status, notes, agent_id, service_id, convertedCustomerId }
  });

  return successResponse({ message: 'RDV mis à jour avec succes', customer_id: convertedCustomerId });
}

// Annule un RDV
async function handleCancelAppointment(request, env, appointmentId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  const existing = await env.DB.prepare(`
    SELECT * FROM appointments WHERE id = ? AND tenant_id = ?
  `).bind(appointmentId, tenant.id).first();

  if (!existing) {
    return jsonResponse({ success: false, error: 'RDV non trouvé' }, 404);
  }

  // Vérifier les permissions
  const canModifyAll = await hasPermission(env, tenant.id, user.role, 'modify_all_appointments');
  const canView = await canViewAgent(env, tenant.id, user.id, user.role, existing.agent_id);

  if (!canModifyAll && !canView) {
    return jsonResponse({ success: false, error: 'Permission refusée' }, 403);
  }

  await env.DB.prepare(`
    UPDATE appointments SET status = 'cancelled', updated_at = ? WHERE id = ? AND tenant_id = ?
  `).bind(new Date().toISOString(), appointmentId, tenant.id).run();

  // Log audit
  await auth.logAudit(env, {
    tenant_id: tenant.id,
    user_id: user.id,
    action: 'appointment.cancel',
    resource_type: 'appointment',
    resource_id: appointmentId
  });

  return successResponse({ message: 'RDV annulé avec succès' });
}

// Charger les settings
async function loadAppointmentSettings(env, tenantId) {
  const result = await env.DB.prepare(`
    SELECT settings FROM appointment_settings WHERE tenant_id = ?
  `).bind(tenantId).first();

  if (result?.settings) {
    try {
      return JSON.parse(result.settings);
    } catch {
      return null;
    }
  }
  return null;
}

// GET settings
async function handleGetSettings(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { tenant } = authResult;
  const settings = await loadAppointmentSettings(env, tenant.id);

  return successResponse({ settings });
}

// PUT settings
async function handleUpdateSettings(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  // Seul admin peut modifier les settings
  const canManage = await hasPermission(env, tenant.id, user.role, 'manage_tenant_settings');
  if (!canManage) {
    return jsonResponse({ success: false, error: 'Permission refusée' }, 403);
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO appointment_settings (id, tenant_id, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET settings = ?, updated_at = ?
  `).bind(
    `aps_${tenant.id}`, tenant.id, JSON.stringify(body), now, now,
    JSON.stringify(body), now
  ).run();

  return successResponse({ message: 'Paramètres mis à jour' });
}

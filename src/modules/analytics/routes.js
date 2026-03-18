import { requireAuth } from '../auth/helpers.js';
import { getCorsHeaders } from '../../config/cors.js';

/**
 * Escape a CSV field value (handle commas, quotes, newlines)
 */
function escapeCsvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Parse period string (e.g. "30d") to a date cutoff ISO string
 */
function getPeriodCutoff(period) {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString();
}

export async function handleAnalyticsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --- GET /api/v1/analytics/dashboard ---
  if (path === '/api/v1/analytics/dashboard' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;
    const period = url.searchParams.get('period') || '30d';
    const cutoff = getPeriodCutoff(period);

    let totalProspects = 0;
    let totalCustomers = 0;
    let totalAppointments = 0;
    let appointmentsByStatus = { scheduled: 0, completed: 0, canceled: 0, confirmed: 0, no_show: 0 };
    let conversionRate = 0;
    let newProspectsPeriod = 0;
    let newAppointmentsPeriod = 0;

    // Total prospects
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM prospects WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalProspects = r?.cnt || 0;
    } catch (_) {}

    // Total customers
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalCustomers = r?.cnt || 0;
    } catch (_) {}

    // Total appointments
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalAppointments = r?.cnt || 0;
    } catch (_) {}

    // Appointments by status (within period)
    try {
      const r = await env.DB.prepare(
        `SELECT status, COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ? GROUP BY status`
      ).bind(tenantId, cutoff).all();
      for (const row of (r?.results || [])) {
        const s = row.status;
        if (s === 'scheduled') appointmentsByStatus.scheduled = row.cnt;
        else if (s === 'completed') appointmentsByStatus.completed = row.cnt;
        else if (s === 'canceled' || s === 'cancelled') appointmentsByStatus.canceled = row.cnt;
        else if (s === 'confirmed') appointmentsByStatus.confirmed = row.cnt;
        else if (s === 'no_show') appointmentsByStatus.no_show = row.cnt;
      }
    } catch (_) {}

    // New prospects in period
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM prospects WHERE tenant_id = ? AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      newProspectsPeriod = r?.cnt || 0;
    } catch (_) {}

    // New appointments in period
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      newAppointmentsPeriod = r?.cnt || 0;
    } catch (_) {}

    // Conversion rate: prospects -> appointments (in period)
    conversionRate = newProspectsPeriod > 0
      ? parseFloat(((newAppointmentsPeriod / newProspectsPeriod) * 100).toFixed(1))
      : 0;

    return Response.json({
      total_prospects: totalProspects,
      total_customers: totalCustomers,
      total_appointments: totalAppointments,
      conversion_rate: conversionRate,
      new_prospects_period: newProspectsPeriod,
      new_appointments_period: newAppointmentsPeriod,
      appointments_by_status: appointmentsByStatus,
      period,
    }, { headers: corsHeaders });
  }

  // --- GET /api/v1/analytics/sara ---
  if (path === '/api/v1/analytics/sara' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;
    const period = url.searchParams.get('period') || '30d';
    const cutoff = getPeriodCutoff(period);

    let totalCalls = 0;
    let avgDurationSeconds = 0;
    let callsByDay = [];
    let appointmentsFromCalls = 0;
    let avgRating = 0;
    let totalProspects = 0;
    let totalCustomers = 0;
    let totalAppointments = 0;

    // Total calls
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM omni_conversations WHERE tenant_id = ? AND channel = 'phone' AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      totalCalls = r?.cnt || 0;
    } catch (_) { /* table may not exist */ }

    // Avg duration
    try {
      const r = await env.DB.prepare(
        `SELECT AVG(duration) as avg_dur FROM omni_conversations WHERE tenant_id = ? AND channel = 'phone' AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      avgDurationSeconds = Math.round(r?.avg_dur || 0);
    } catch (_) { /* table may not exist */ }

    // Calls by day
    try {
      const r = await env.DB.prepare(
        `SELECT DATE(created_at) as day, COUNT(*) as count FROM omni_conversations WHERE tenant_id = ? AND channel = 'phone' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY day`
      ).bind(tenantId, cutoff).all();
      callsByDay = (r?.results || []).map(row => ({ day: row.day, count: row.count }));
    } catch (_) { /* table may not exist */ }

    // Appointments from calls
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND source = 'phone' AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      appointmentsFromCalls = r?.cnt || 0;
    } catch (_) {
      // Try analytics_events fallback
      try {
        const r2 = await env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM analytics_events WHERE tenant_id = ? AND event_type = 'appointment_from_call' AND created_at >= ?`
        ).bind(tenantId, cutoff).first();
        appointmentsFromCalls = r2?.cnt || 0;
      } catch (_) { /* table may not exist */ }
    }

    // Avg rating from feedback
    try {
      const r = await env.DB.prepare(
        `SELECT AVG(rating) as avg_r FROM feedback WHERE tenant_id = ?`
      ).bind(tenantId).first();
      avgRating = r?.avg_r ? parseFloat((r.avg_r).toFixed(1)) : 0;
    } catch (_) { /* table may not exist */ }

    // Total prospects
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM prospects WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalProspects = r?.cnt || 0;
    } catch (_) { /* table may not exist */ }

    // Total customers
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalCustomers = r?.cnt || 0;
    } catch (_) { /* table may not exist */ }

    // Total appointments (all time)
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalAppointments = r?.cnt || 0;
    } catch (_) { /* table may not exist */ }

    const conversionRate = totalCalls > 0
      ? parseFloat(((appointmentsFromCalls / totalCalls) * 100).toFixed(1))
      : 0;

    return Response.json({
      total_calls: totalCalls,
      avg_duration_seconds: avgDurationSeconds,
      calls_by_day: callsByDay,
      appointments_from_calls: appointmentsFromCalls,
      conversion_rate: conversionRate,
      avg_rating: avgRating,
      total_prospects: totalProspects,
      total_customers: totalCustomers,
      total_appointments: totalAppointments,
    }, { headers: corsHeaders });
  }

  // --- GET /api/v1/analytics/overview ---
  if (path === '/api/v1/analytics/overview' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let totalProspects = 0;
    let totalCustomers = 0;
    let totalAppointmentsMonth = 0;
    let totalProducts = 0;
    let appointmentsByStatus = { scheduled: 0, completed: 0, canceled: 0 };

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM prospects WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalProspects = r?.cnt || 0;
    } catch (_) {}

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalCustomers = r?.cnt || 0;
    } catch (_) {}

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ?`
      ).bind(tenantId, monthStart).first();
      totalAppointmentsMonth = r?.cnt || 0;
    } catch (_) {}

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM products WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalProducts = r?.cnt || 0;
    } catch (_) {}

    try {
      const r = await env.DB.prepare(
        `SELECT status, COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ? GROUP BY status`
      ).bind(tenantId, monthStart).all();
      for (const row of (r?.results || [])) {
        if (row.status === 'scheduled') appointmentsByStatus.scheduled = row.cnt;
        else if (row.status === 'completed') appointmentsByStatus.completed = row.cnt;
        else if (row.status === 'canceled' || row.status === 'cancelled') appointmentsByStatus.canceled = row.cnt;
      }
    } catch (_) {}

    return Response.json({
      total_prospects: totalProspects,
      total_customers: totalCustomers,
      total_appointments_month: totalAppointmentsMonth,
      total_products: totalProducts,
      appointments_by_status: appointmentsByStatus,
    }, { headers: corsHeaders });
  }

  // --- GET /api/v1/prospects/export?format=csv ---
  if (path === '/api/v1/prospects/export' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;

    try {
      const r = await env.DB.prepare(
        `SELECT * FROM prospects WHERE tenant_id = ?`
      ).bind(tenantId).all();

      const prospects = r?.results || [];
      const csvHeaders = ['Prenom', 'Nom', 'Email', 'Telephone', 'Statut', 'Source', 'Date de creation'];
      const rows = prospects.map(p => [
        escapeCsvField(p.first_name),
        escapeCsvField(p.last_name),
        escapeCsvField(p.email),
        escapeCsvField(p.phone),
        escapeCsvField(p.status),
        escapeCsvField(p.source),
        escapeCsvField(p.created_at),
      ].join(','));

      const csv = csvHeaders.join(',') + '\n' + rows.join('\n');

      return new Response('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="prospects.csv"',
          ...corsHeaders,
        },
      });
    } catch (err) {
      return Response.json({ error: 'Erreur export prospects' }, { status: 500, headers: corsHeaders });
    }
  }

  // --- GET /api/v1/customers/export?format=csv ---
  if (path === '/api/v1/customers/export' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;

    try {
      const r = await env.DB.prepare(
        `SELECT * FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).all();

      const customers = r?.results || [];
      const csvHeaders = ['Prenom', 'Nom', 'Email', 'Telephone', 'Statut', 'Source', 'Date de creation'];
      const rows = customers.map(c => [
        escapeCsvField(c.first_name),
        escapeCsvField(c.last_name),
        escapeCsvField(c.email),
        escapeCsvField(c.phone),
        escapeCsvField(c.status),
        escapeCsvField(c.source),
        escapeCsvField(c.created_at),
      ].join(','));

      const csv = csvHeaders.join(',') + '\n' + rows.join('\n');

      return new Response('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clients.csv"',
          ...corsHeaders,
        },
      });
    } catch (err) {
      return Response.json({ error: 'Erreur export clients' }, { status: 500, headers: corsHeaders });
    }
  }

  // --- GET /api/v1/appointments/export?format=csv ---
  if (path === '/api/v1/appointments/export' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;

    try {
      const r = await env.DB.prepare(
        `SELECT * FROM appointments WHERE tenant_id = ?`
      ).bind(tenantId).all();

      const appointments = r?.results || [];
      const csvHeaders = ['Prospect', 'Agent', 'Type', 'Date prevue', 'Statut', 'Date de creation'];
      const rows = appointments.map(a => [
        escapeCsvField(a.prospect_name || a.prospect_id),
        escapeCsvField(a.agent_name || a.agent_id),
        escapeCsvField(a.type || a.appointment_type),
        escapeCsvField(a.scheduled_at),
        escapeCsvField(a.status),
        escapeCsvField(a.created_at),
      ].join(','));

      const csv = csvHeaders.join(',') + '\n' + rows.join('\n');

      return new Response('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="rendez-vous.csv"',
          ...corsHeaders,
        },
      });
    } catch (err) {
      return Response.json({ error: 'Erreur export rendez-vous' }, { status: 500, headers: corsHeaders });
    }
  }

  return null;
}

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
    } catch (e) { console.error('[Analytics] dashboard totalProspects error:', e.message); }

    // Total customers
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalCustomers = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] dashboard totalCustomers error:', e.message); }

    // Total appointments
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalAppointments = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] dashboard totalAppointments error:', e.message); }

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
    } catch (e) { console.error('[Analytics] dashboard appointmentsByStatus error:', e.message); }

    // New prospects in period
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM prospects WHERE tenant_id = ? AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      newProspectsPeriod = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] dashboard newProspectsPeriod error:', e.message); }

    // New appointments in period
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      newAppointmentsPeriod = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] dashboard newAppointmentsPeriod error:', e.message); }

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
    } catch (e) { console.error('[Analytics] sara totalCalls error:', e.message); }

    // Avg duration
    try {
      const r = await env.DB.prepare(
        `SELECT AVG(duration) as avg_dur FROM omni_conversations WHERE tenant_id = ? AND channel = 'phone' AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      avgDurationSeconds = Math.round(r?.avg_dur || 0);
    } catch (e) { console.error('[Analytics] sara avgDuration error:', e.message); }

    // Calls by day
    try {
      const r = await env.DB.prepare(
        `SELECT DATE(created_at) as day, COUNT(*) as count FROM omni_conversations WHERE tenant_id = ? AND channel = 'phone' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY day`
      ).bind(tenantId, cutoff).all();
      callsByDay = (r?.results || []).map(row => ({ day: row.day, count: row.count }));
    } catch (e) { console.error('[Analytics] sara callsByDay error:', e.message); }

    // Appointments from calls
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND source = 'phone' AND created_at >= ?`
      ).bind(tenantId, cutoff).first();
      appointmentsFromCalls = r?.cnt || 0;
    } catch (e) {
      console.error('[Analytics] sara appointmentsFromCalls error:', e.message);
      // Try analytics_events fallback
      try {
        const r2 = await env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM analytics_events WHERE tenant_id = ? AND event_type = 'appointment_from_call' AND created_at >= ?`
        ).bind(tenantId, cutoff).first();
        appointmentsFromCalls = r2?.cnt || 0;
      } catch (e2) { console.error('[Analytics] sara appointmentsFromCalls fallback error:', e2.message); }
    }

    // Avg rating from feedback
    try {
      const r = await env.DB.prepare(
        `SELECT AVG(rating) as avg_r FROM feedback WHERE tenant_id = ?`
      ).bind(tenantId).first();
      avgRating = r?.avg_r ? parseFloat((r.avg_r).toFixed(1)) : 0;
    } catch (e) { console.error('[Analytics] sara avgRating error:', e.message); }

    // Total prospects
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM prospects WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalProspects = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] sara totalProspects error:', e.message); }

    // Total customers
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalCustomers = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] sara totalCustomers error:', e.message); }

    // Total appointments (all time)
    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalAppointments = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] sara totalAppointments error:', e.message); }

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
    } catch (e) { console.error('[Analytics] overview totalProspects error:', e.message); }

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalCustomers = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] overview totalCustomers error:', e.message); }

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ?`
      ).bind(tenantId, monthStart).first();
      totalAppointmentsMonth = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] overview totalAppointmentsMonth error:', e.message); }

    try {
      const r = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM products WHERE tenant_id = ?`
      ).bind(tenantId).first();
      totalProducts = r?.cnt || 0;
    } catch (e) { console.error('[Analytics] overview totalProducts error:', e.message); }

    try {
      const r = await env.DB.prepare(
        `SELECT status, COUNT(*) as cnt FROM appointments WHERE tenant_id = ? AND created_at >= ? GROUP BY status`
      ).bind(tenantId, monthStart).all();
      for (const row of (r?.results || [])) {
        if (row.status === 'scheduled') appointmentsByStatus.scheduled = row.cnt;
        else if (row.status === 'completed') appointmentsByStatus.completed = row.cnt;
        else if (row.status === 'canceled' || row.status === 'cancelled') appointmentsByStatus.canceled = row.cnt;
      }
    } catch (e) { console.error('[Analytics] overview appointmentsByStatus error:', e.message); }

    return Response.json({
      total_prospects: totalProspects,
      total_customers: totalCustomers,
      total_appointments_month: totalAppointmentsMonth,
      total_products: totalProducts,
      appointments_by_status: appointmentsByStatus,
    }, { headers: corsHeaders });
  }

  // --- GET /api/v1/analytics/insights ---
  if (path === '/api/v1/analytics/insights' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;
    const period = url.searchParams.get('period') || '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    // Compute cutoff dates in JS to avoid D1 DATE() bind parameter issues
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString();

    const prevCutoff = new Date(now);
    prevCutoff.setDate(prevCutoff.getDate() - days * 2);
    const prevCutoffISO = prevCutoff.toISOString();

    try {
      // Run all queries in parallel — use pre-computed ISO cutoff strings
      const [kpisRes, callsByDayRes, callsByHourRes, callsByWeekdayRes, rdvRes, prospectsByDayRes, topicsRes, prevKpisRes] = await Promise.all([
        // 1. KPIs globaux (status 'completed' or 'ended' to match calls/stats)
        env.DB.prepare(`
          SELECT COUNT(*) as total_calls,
            SUM(CASE WHEN status IN ('completed','ended') THEN 1 ELSE 0 END) as completed_calls,
            CAST(AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END) AS INTEGER) as avg_duration,
            SUM(COALESCE(duration, 0)) as total_duration,
            COUNT(DISTINCT DATE(created_at)) as active_days
          FROM calls WHERE tenant_id = ? AND created_at >= ?
        `).bind(tenantId, cutoffISO).first(),

        // 2. Appels par jour
        env.DB.prepare(`
          SELECT DATE(created_at) as date, COUNT(*) as calls,
            SUM(CASE WHEN status IN ('completed','ended') THEN 1 ELSE 0 END) as completed,
            CAST(AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END) AS INTEGER) as avg_duration
          FROM calls WHERE tenant_id = ? AND created_at >= ?
          GROUP BY DATE(created_at) ORDER BY date ASC
        `).bind(tenantId, cutoffISO).all(),

        // 3. Heures de pointe
        env.DB.prepare(`
          SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
          FROM calls WHERE tenant_id = ? AND created_at >= ?
          GROUP BY hour ORDER BY hour ASC
        `).bind(tenantId, cutoffISO).all(),

        // 4. Jours de la semaine
        env.DB.prepare(`
          SELECT CAST(strftime('%w', created_at) AS INTEGER) as day_of_week, COUNT(*) as count
          FROM calls WHERE tenant_id = ? AND created_at >= ?
          GROUP BY day_of_week ORDER BY day_of_week ASC
        `).bind(tenantId, cutoffISO).all(),

        // 5. RDV conversion
        env.DB.prepare(`
          SELECT
            (SELECT COUNT(*) FROM appointments WHERE tenant_id = ? AND created_at >= ?) as rdv_booked,
            (SELECT COUNT(*) FROM calls WHERE tenant_id = ? AND created_at >= ?) as total_calls
        `).bind(tenantId, cutoffISO, tenantId, cutoffISO).first(),

        // 6. Prospects par jour
        env.DB.prepare(`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM prospects WHERE tenant_id = ? AND created_at >= ?
          GROUP BY DATE(created_at) ORDER BY date ASC
        `).bind(tenantId, cutoffISO).all(),

        // 7. Sujets frequents (from call_summaries for richer data)
        env.DB.prepare(`
          SELECT cs.summary, COUNT(*) as count
          FROM calls c
          LEFT JOIN call_summaries cs ON cs.call_id = c.id
          WHERE c.tenant_id = ? AND cs.summary IS NOT NULL AND cs.summary != ''
          AND c.created_at >= ?
          GROUP BY cs.summary ORDER BY count DESC LIMIT 10
        `).bind(tenantId, cutoffISO).all(),

        // 8. KPIs periode precedente (pour variation)
        env.DB.prepare(`
          SELECT COUNT(*) as total_calls,
            SUM(CASE WHEN status IN ('completed','ended') THEN 1 ELSE 0 END) as completed_calls,
            CAST(AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END) AS INTEGER) as avg_duration
          FROM calls WHERE tenant_id = ?
          AND created_at >= ? AND created_at < ?
        `).bind(tenantId, prevCutoffISO, cutoffISO).first(),
      ]);

      const kpis = kpisRes || {};
      const prevKpis = prevKpisRes || {};
      const rdv = rdvRes || {};
      const totalCalls = kpis.total_calls || 0;
      const rdvBooked = rdv.rdv_booked || 0;
      const rdvRate = totalCalls > 0 ? parseFloat(((rdvBooked / totalCalls) * 100).toFixed(1)) : 0;

      // Prospects count
      const prospectsTotal = (prospectsByDayRes?.results || []).reduce((s, r) => s + r.count, 0);

      // If topics from call_summaries are empty, fallback to calls.summary (post_call_analysis extracted)
      let topTopics = topicsRes?.results || [];
      if (topTopics.length === 0) {
        try {
          const fallbackTopics = await env.DB.prepare(`
            SELECT summary, COUNT(*) as count
            FROM calls WHERE tenant_id = ? AND summary IS NOT NULL AND summary != ''
            AND created_at >= ?
            GROUP BY summary ORDER BY count DESC LIMIT 10
          `).bind(tenantId, cutoffISO).all();
          topTopics = fallbackTopics?.results || [];
        } catch (e) {
          console.error('[Analytics] insights fallback topics error:', e.message);
        }
      }

      return Response.json({
        period,
        kpis: {
          total_calls: totalCalls,
          completed_calls: kpis.completed_calls || 0,
          avg_duration: kpis.avg_duration || 0,
          total_duration: kpis.total_duration || 0,
          active_days: kpis.active_days || 0,
          rdv_rate: rdvRate,
          prospects_created: prospectsTotal,
          // Variations vs previous period
          prev_total_calls: prevKpis.total_calls || 0,
          prev_completed_calls: prevKpis.completed_calls || 0,
          prev_avg_duration: prevKpis.avg_duration || 0,
        },
        calls_by_day: (callsByDayRes?.results || []),
        calls_by_hour: (callsByHourRes?.results || []),
        calls_by_weekday: (callsByWeekdayRes?.results || []),
        prospects_by_day: (prospectsByDayRes?.results || []),
        top_topics: topTopics,
        rdv_conversion: {
          booked: rdvBooked,
          total: totalCalls,
          rate: rdvRate,
        },
      }, { headers: corsHeaders });
    } catch (error) {
      console.error('[Analytics] insights error:', error.message, error.stack);
      return Response.json({ error: 'Erreur lors du calcul des insights' }, { status: 500, headers: corsHeaders });
    }
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

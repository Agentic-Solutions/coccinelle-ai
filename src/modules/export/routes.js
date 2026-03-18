/**
 * Module Export - CSV export routes
 *
 * GET /api/v1/export/prospects    — Export all prospects as CSV
 * GET /api/v1/export/customers    — Export all customers as CSV
 * GET /api/v1/export/appointments — Export all appointments as CSV
 */

import { requireAuth } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';

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
 * Build a CSV string from headers and rows
 */
function buildCsv(headers, rows) {
  return headers.join(',') + '\n' + rows.join('\n');
}

/**
 * Return a CSV file response with BOM for Excel compatibility
 */
function csvResponse(csv, filename, corsHeaders) {
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...corsHeaders,
    },
  });
}

export async function handleExportRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --- GET /api/v1/export/prospects ---
  if (path === '/api/v1/export/prospects' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;

    try {
      const r = await env.DB.prepare(
        'SELECT * FROM prospects WHERE tenant_id = ?'
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

      return csvResponse(buildCsv(csvHeaders, rows), 'export-prospects.csv', corsHeaders);
    } catch (err) {
      logger.error('Export prospects error', { error: err.message });
      return Response.json({ error: 'Erreur export prospects' }, { status: 500, headers: corsHeaders });
    }
  }

  // --- GET /api/v1/export/customers ---
  if (path === '/api/v1/export/customers' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;

    try {
      const r = await env.DB.prepare(
        'SELECT * FROM customers WHERE tenant_id = ?'
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

      return csvResponse(buildCsv(csvHeaders, rows), 'export-customers.csv', corsHeaders);
    } catch (err) {
      logger.error('Export customers error', { error: err.message });
      return Response.json({ error: 'Erreur export clients' }, { status: 500, headers: corsHeaders });
    }
  }

  // --- GET /api/v1/export/appointments ---
  if (path === '/api/v1/export/appointments' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const tenantId = auth.tenant.id;

    try {
      const r = await env.DB.prepare(
        'SELECT * FROM appointments WHERE tenant_id = ?'
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

      return csvResponse(buildCsv(csvHeaders, rows), 'export-appointments.csv', corsHeaders);
    } catch (err) {
      logger.error('Export appointments error', { error: err.message });
      return Response.json({ error: 'Erreur export rendez-vous' }, { status: 500, headers: corsHeaders });
    }
  }

  return null;
}

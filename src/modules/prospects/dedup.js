// Module Prospects - Deduplication (M9)
// Recherche un prospect existant par phone OU email avant d'en creer un nouveau.
// Si trouve : met a jour, incremente interaction_count, retourne { merged: true }
// Si non trouve : cree normalement, retourne { merged: false }

import { logger } from '../../utils/logger.js';

/**
 * findOrCreateProspect — Logique de deduplication prospect
 * @param {object} env - Cloudflare env (DB, etc.)
 * @param {string} tenantId
 * @param {object} data - { phone?, email?, first_name?, last_name?, source?, status? }
 * @returns {{ merged: boolean, prospect: object }}
 */
export async function findOrCreateProspect(env, tenantId, data) {
  const { phone, email, first_name, last_name, source, status = 'new' } = data;

  // 1. Chercher un prospect existant par phone OU email
  let existing = null;

  if (phone) {
    existing = await env.DB.prepare(`
      SELECT * FROM prospects WHERE tenant_id = ? AND phone = ? LIMIT 1
    `).bind(tenantId, phone).first();
  }

  if (!existing && email) {
    existing = await env.DB.prepare(`
      SELECT * FROM prospects WHERE tenant_id = ? AND email = ? LIMIT 1
    `).bind(tenantId, email).first();
  }

  // 2. Si trouve : merge (mise a jour + increment interaction_count)
  if (existing) {
    const newCount = (existing.interaction_count || 1) + 1;

    // Mettre a jour les champs vides avec les nouvelles donnees
    const updatedFirstName = existing.first_name || first_name || null;
    const updatedLastName = existing.last_name || last_name || null;
    const updatedEmail = existing.email || email || null;
    const updatedPhone = existing.phone || phone || null;

    await env.DB.prepare(`
      UPDATE prospects
      SET first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(email, ?),
          phone = COALESCE(phone, ?),
          interaction_count = ?,
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      updatedFirstName,
      updatedLastName,
      updatedEmail,
      updatedPhone,
      newCount,
      existing.id,
      tenantId
    ).run();

    logger.info('Prospect merged (dedup)', {
      prospectId: existing.id,
      tenantId,
      interaction_count: newCount,
      matchedOn: existing.phone === phone ? 'phone' : 'email'
    });

    return {
      merged: true,
      prospect: {
        ...existing,
        first_name: updatedFirstName,
        last_name: updatedLastName,
        email: updatedEmail,
        phone: updatedPhone,
        interaction_count: newCount
      }
    };
  }

  // 3. Si non trouve : creer normalement
  const prospectId = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO prospects (id, tenant_id, first_name, last_name, email, phone, status, source, interaction_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    prospectId,
    tenantId,
    first_name || null,
    last_name || null,
    email || null,
    phone || null,
    status,
    source || null,
    now
  ).run();

  logger.info('Prospect created (dedup - new)', { prospectId, tenantId });

  return {
    merged: false,
    prospect: {
      id: prospectId,
      tenant_id: tenantId,
      first_name: first_name || null,
      last_name: last_name || null,
      email: email || null,
      phone: phone || null,
      status,
      source: source || null,
      interaction_count: 1,
      created_at: now
    }
  };
}

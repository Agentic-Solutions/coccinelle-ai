// src/modules/shared/prestations.js
// ─────────────────────────────────────────────────────────────────────────
// SOURCE UNIQUE des prestations (fusion services → products).
// Une prestation = products avec type='service' + duration_minutes.
//
// Résolution de durée / lecture unifiée avec FALLBACK sur l'ancienne table
// `services` pendant la transition (shim compat, réversible). Le booking
// (VoixIA check_availability + book_appointment, appointments, public) passe
// par ces helpers → une seule autorité de durée.
//
// Chantier Prestations (6 juillet 2026). Voir audit_sources_verite.md section D.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Résout une prestation par NOM (recherche partielle insensible à la casse).
 * products(type='service') d'abord, fallback table `services`.
 * @returns {Promise<{id: string, duration_minutes: number|null}|null>}
 */
export async function findPrestationByName(env, tenantId, name) {
  if (!name) return null;
  const like = '%' + String(name).toLowerCase() + '%';

  try {
    const p = await env.DB.prepare(
      `SELECT id, duration_minutes FROM products
       WHERE tenant_id = ? AND type = 'service' AND status = 'active'
         AND LOWER(title) LIKE ? LIMIT 1`
    ).bind(tenantId, like).first();
    if (p) return { id: p.id, duration_minutes: p.duration_minutes ?? null };
  } catch { /* colonne/table absente → fallback */ }

  try {
    const s = await env.DB.prepare(
      `SELECT id, duration_minutes FROM services
       WHERE tenant_id = ? AND is_active = 1 AND LOWER(name) LIKE ? LIMIT 1`
    ).bind(tenantId, like).first();
    if (s) return { id: s.id, duration_minutes: s.duration_minutes ?? null };
  } catch { /* table services absente → null */ }

  return null;
}

/**
 * Résout la durée (minutes) d'une prestation par ID.
 * products d'abord (l'id est préservé lors de la migration services→products),
 * fallback table `services`.
 * @returns {Promise<number|null>}
 */
export async function findPrestationDurationById(env, tenantId, id) {
  if (!id) return null;

  try {
    const p = await env.DB.prepare(
      'SELECT duration_minutes FROM products WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first();
    if (p && p.duration_minutes != null) return p.duration_minutes;
  } catch { /* fallback */ }

  try {
    const s = await env.DB.prepare(
      'SELECT duration_minutes FROM services WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first();
    if (s && s.duration_minutes != null) return s.duration_minutes;
  } catch { /* null */ }

  return null;
}

/**
 * Liste les prestations bookables d'un tenant (pour le booking public).
 * products(type='service') d'abord ; fallback `services` si aucune prestation-produit
 * (transition). Forme homogène : {id, name, description, duration_minutes, price, currency}.
 * @returns {Promise<Array>}
 */
export async function listPrestations(env, tenantId) {
  try {
    const r = await env.DB.prepare(
      `SELECT id, title AS name, description, duration_minutes,
              price, price_currency AS currency
       FROM products
       WHERE tenant_id = ? AND type = 'service' AND status = 'active'
       ORDER BY title ASC`
    ).bind(tenantId).all();
    const rows = r.results || [];
    if (rows.length > 0) return rows;
  } catch { /* fallback */ }

  try {
    // NB : la table services n'a PAS de colonne `currency` en prod → littéral 'EUR'.
    const r = await env.DB.prepare(
      `SELECT id, name, description, duration_minutes, price, 'EUR' AS currency
       FROM services
       WHERE tenant_id = ? AND is_active = 1
       ORDER BY name ASC`
    ).bind(tenantId).all();
    return r.results || [];
  } catch {
    return [];
  }
}

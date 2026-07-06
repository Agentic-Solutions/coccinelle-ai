// src/modules/shared/horaires-slots.js
// ─────────────────────────────────────────────────────────────────────────
// SOURCE UNIQUE des horaires — pont bidirectionnel entre :
//   - tenants.horaires  (JSON lun..dim {ouvert,debut,fin})  = CACHE d'affichage/prompt
//   - availability_slots (par agent, day_of_week 1-7 Lun=1)  = MAÎTRE opérationnel
//     (lu par VoixIA check_availability + booking public)
//
// Chantier Horaires SSOT (6 juillet 2026). Convention canonique day_of_week :
//   1=Lundi … 7=Dimanche (ISO). Voir audit_sources_verite.md section B.
//
// L'agent « société » par défaut d'un tenant = son admin (users.id) projeté dans
// la table `agents` (FK de availability_slots.agent_id → agents(id) en prod),
// marqué agents.is_default=1 (migration 0071). C'est cohérent avec la page
// Disponibilités qui écrit déjà les créneaux sous agent_id = user.id.
// ─────────────────────────────────────────────────────────────────────────

import { generateId } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';

// Ordre canonique + mapping clé jour ↔ day_of_week (1-7, Lundi=1)
export const DAY_KEYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
export const DAY_KEY_TO_DOW = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 7 };
export const DOW_TO_DAY_KEY = { 1: 'lun', 2: 'mar', 3: 'mer', 4: 'jeu', 5: 'ven', 6: 'sam', 7: 'dim' };

// Défauts miroir EXACT de lib/horaires.ts DEFAULT_HORAIRES (source unique frontend).
const DEFAULT_HORAIRES = {
  lun: { ouvert: true, debut: '09:00', fin: '18:00' },
  mar: { ouvert: true, debut: '09:00', fin: '18:00' },
  mer: { ouvert: true, debut: '09:00', fin: '18:00' },
  jeu: { ouvert: true, debut: '09:00', fin: '18:00' },
  ven: { ouvert: true, debut: '09:00', fin: '18:00' },
  sam: { ouvert: false, debut: '10:00', fin: '12:00' },
  dim: { ouvert: false, debut: '09:00', fin: '18:00' },
};
const defaultDay = (k) => ({ ...DEFAULT_HORAIRES[k] });

/**
 * Parse tolérant de tenants.horaires (JSON par-jour, string ou objet, legacy, null).
 * Ne jette jamais. Retourne un objet { lun..dim: {ouvert,debut,fin} } complet.
 * Miroir backend de lib/horaires.ts parseHoraires().
 */
export function parseHoraires(raw) {
  const base = () => ({
    lun: defaultDay('lun'), mar: defaultDay('mar'), mer: defaultDay('mer'),
    jeu: defaultDay('jeu'), ven: defaultDay('ven'),
    sam: defaultDay('sam'), dim: defaultDay('dim'),
  });

  if (raw == null || raw === '') return base();

  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); }
    catch { return base(); } // ancienne valeur texte brut ("Lun-Ven 9h-18h")
  }
  if (typeof value !== 'object' || value === null) return base();

  // Format par-jour ?
  const result = base();
  if (DAY_KEYS.some((k) => typeof value[k] === 'object' && value[k] !== null)) {
    for (const k of DAY_KEYS) {
      const d = value[k];
      if (d && typeof d === 'object') {
        result[k] = {
          ouvert: typeof d.ouvert === 'boolean' ? d.ouvert : result[k].ouvert,
          debut: typeof d.debut === 'string' ? d.debut : result[k].debut,
          fin: typeof d.fin === 'string' ? d.fin : result[k].fin,
        };
      }
    }
    return result;
  }

  // Format legacy { days:{lun:true,...}, start, end }
  if (value.days || value.start || value.end) {
    for (const k of DAY_KEYS) {
      result[k] = {
        ouvert: value.days ? Boolean(value.days[k]) : result[k].ouvert,
        debut: value.start || result[k].debut,
        fin: value.end || result[k].fin,
      };
    }
    return result;
  }

  return result;
}

/**
 * Convertit un objet horaires (lun..dim) en 7 lignes de créneaux (jours 1-7).
 * Les jours fermés sont émis avec is_available=0 (pour que Disponibilités affiche
 * la semaine complète ; VoixIA/booking filtrent is_available=1).
 */
export function horairesToSlots(horaires) {
  const h = parseHoraires(horaires);
  return DAY_KEYS.map((k) => ({
    day_of_week: DAY_KEY_TO_DOW[k],
    start_time: h[k].debut || '09:00',
    end_time: h[k].fin || '18:00',
    is_available: h[k].ouvert ? 1 : 0,
  }));
}

/**
 * Convertit des lignes availability_slots (un agent) en objet horaires (cache).
 * Lossy : ne conserve que ouvert/debut/fin par jour (pas les pauses). Si plusieurs
 * créneaux pour un même jour, prend le premier rencontré (agent société = mono-créneau).
 */
export function slotsToHoraires(slotRows) {
  // Init : tous fermés (les rows de l'agent société écrasent jour par jour).
  const closed = (k) => ({ ouvert: false, debut: DEFAULT_HORAIRES[k].debut, fin: DEFAULT_HORAIRES[k].fin });
  const result = {
    lun: closed('lun'), mar: closed('mar'), mer: closed('mer'), jeu: closed('jeu'),
    ven: closed('ven'), sam: closed('sam'), dim: closed('dim'),
  };
  const seen = new Set();
  for (const row of slotRows || []) {
    const key = DOW_TO_DAY_KEY[row.day_of_week];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result[key] = {
      ouvert: row.is_available ? true : false,
      debut: row.start_time || '09:00',
      fin: row.end_time || '18:00',
    };
  }
  return result;
}

/**
 * Résout (et crée si besoin) l'agent société par défaut du tenant.
 * = l'admin du tenant (users.role='admin', sinon le plus ancien user), projeté
 * dans `agents` (id = users.id) et marqué is_default=1.
 * Retourne l'agent_id, ou null si aucun user (ne devrait pas arriver).
 */
export async function ensureDefaultAgent(env, tenantId) {
  // 1) Un agent par défaut existe déjà ?
  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM agents WHERE tenant_id = ? AND is_default = 1 LIMIT 1'
    ).bind(tenantId).first();
    if (existing?.id) return existing.id;
  } catch (e) {
    // Colonne is_default absente (migration 0071 non appliquée) → on continue sans.
    logger.warn('ensureDefaultAgent — is_default lookup failed', { error: e.message, tenantId });
  }

  // 2) Résoudre l'admin du tenant
  const adminUser = await env.DB.prepare(
    `SELECT id, name, email FROM users
     WHERE tenant_id = ?
     ORDER BY (role = 'admin') DESC, created_at ASC
     LIMIT 1`
  ).bind(tenantId).first();
  if (!adminUser?.id) return null;

  const parts = (adminUser.name || 'Accueil').split(' ');
  const firstName = parts[0] || 'Accueil';
  const lastName = parts.slice(1).join(' ') || '';
  const email = adminUser.email || `${adminUser.id}@coccinelle.ai`;

  // 3) Projeter dans agents (FK) + marquer is_default
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO agents (id, tenant_id, first_name, last_name, email)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(adminUser.id, tenantId, firstName, lastName, email).run();
  } catch (e) {
    logger.warn('ensureDefaultAgent — agents insert failed', { error: e.message, tenantId });
  }
  try {
    await env.DB.prepare('UPDATE agents SET is_default = 1 WHERE id = ? AND tenant_id = ?')
      .bind(adminUser.id, tenantId).run();
  } catch (e) {
    // is_default absent → non bloquant
    logger.warn('ensureDefaultAgent — is_default flag failed', { error: e.message, tenantId });
  }
  return adminUser.id;
}

/**
 * MAÎTRE : projette tenants.horaires → availability_slots de l'agent société.
 * delete-then-insert des 7 jours (idempotent). Non bloquant (log en cas d'échec).
 */
export async function syncHorairesToSlots(env, tenantId, horaires) {
  try {
    const agentId = await ensureDefaultAgent(env, tenantId);
    if (!agentId) {
      logger.warn('syncHorairesToSlots — aucun agent par défaut résolu', { tenantId });
      return false;
    }
    const slots = horairesToSlots(horaires);
    const statements = [];
    // Purge des 7 jours de l'agent société, puis réinsertion
    statements.push(
      env.DB.prepare('DELETE FROM availability_slots WHERE tenant_id = ? AND agent_id = ?')
        .bind(tenantId, agentId)
    );
    for (const s of slots) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO availability_slots
             (id, tenant_id, agent_id, day_of_week, start_time, end_time, slot_duration, is_available)
           VALUES (?, ?, ?, ?, ?, ?, 30, ?)`
        ).bind(generateId('avail'), tenantId, agentId, s.day_of_week, s.start_time, s.end_time, s.is_available)
      );
    }
    await env.DB.batch(statements);
    return true;
  } catch (e) {
    logger.error('syncHorairesToSlots failed', { error: e.message, tenantId });
    return false;
  }
}

/**
 * REVERSE (cache) : régénère tenants.horaires depuis les créneaux d'un agent,
 * UNIQUEMENT si cet agent est l'agent société par défaut. No-op sinon.
 * Appelé après une édition dans Disponibilités. Non bloquant.
 */
export async function syncSlotsToHoraires(env, tenantId, agentId) {
  try {
    if (!agentId) return false;
    // L'agent est-il l'agent société par défaut ?
    let isDefault = false;
    try {
      const row = await env.DB.prepare(
        'SELECT is_default FROM agents WHERE id = ? AND tenant_id = ?'
      ).bind(agentId, tenantId).first();
      isDefault = !!(row && row.is_default);
    } catch {
      // is_default absent → on ne touche pas au cache (comportement conservateur)
      return false;
    }
    if (!isDefault) return false;

    const res = await env.DB.prepare(
      `SELECT day_of_week, start_time, end_time, is_available
       FROM availability_slots WHERE tenant_id = ? AND agent_id = ? ORDER BY day_of_week`
    ).bind(tenantId, agentId).all();

    const horaires = slotsToHoraires(res.results || []);
    await env.DB.prepare(
      "UPDATE tenants SET horaires = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(JSON.stringify(horaires), tenantId).run();
    return true;
  } catch (e) {
    logger.error('syncSlotsToHoraires failed', { error: e.message, tenantId, agentId });
    return false;
  }
}

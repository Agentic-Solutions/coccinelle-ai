// Slug public d'un tenant — SOURCE UNIQUE.
//
// Le slug est l'adresse publique de la page de reservation
// (coccinelle.ai/booking/{slug}) : elle part desormais dans les SMS clients.
// Elle doit donc etre lisible, et surtout STABLE une fois qu'un client l'a
// utilisee.
//
// Ces fonctions vivaient dans auth/routes.js, hors de portee de l'onboarding —
// or c'est l'onboarding qui apprend le vrai nom de l'entreprise. Un inscrit
// qui saisit son nom personnel au signup se retrouvait avec
// « youssef-amrouche-4 » comme adresse publique de « Coccinelle.ai ».

/**
 * « Salon Marie & Fils » → « salon-marie-fils »
 * « Café de la Gare »    → « cafe-de-la-gare »
 */
export function genererSlugDepuisNom(nom) {
  if (!nom) return null;
  return String(nom)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export async function slugDisponible(db, slug, tenantIdExclu = null) {
  if (!slug) return false;
  const existant = await db.prepare('SELECT id FROM tenants WHERE slug = ?').bind(slug).first();
  if (!existant) return true;
  // Un tenant peut « reprendre » son propre slug (regeneration a l'identique).
  return tenantIdExclu != null && existant.id === tenantIdExclu;
}

/**
 * Slug unique : suffixe numerique en cas de collision.
 * « salon-marie » → « salon-marie », puis « salon-marie-2 », etc.
 */
export async function genererSlugUnique(db, nomDeBase, tenantIdExclu = null) {
  const base = genererSlugDepuisNom(nomDeBase);
  if (!base) return 'tenant-' + Math.random().toString(36).substring(2, 10);

  if (await slugDisponible(db, base, tenantIdExclu)) return base;

  for (let i = 2; i <= 100; i++) {
    const candidat = `${base}-${i}`;
    if (await slugDisponible(db, candidat, tenantIdExclu)) return candidat;
  }
  return `${base}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Realigne le slug d'un tenant sur son nom d'entreprise — mais SEULEMENT tant
 * que personne ne s'en est servi.
 *
 * Le garde-fou est la : des qu'un rendez-vous est venu de la page publique,
 * l'adresse est dans la nature (SMS, e-mails, favoris) et ne bouge plus. Un
 * lien casse coute plus cher qu'un slug moche.
 *
 * @returns {Promise<string|null>} le nouveau slug, ou null si rien n'a change
 */
export async function realignerSlugSurNom(db, tenantId, nomEntreprise) {
  try {
    if (!db || !tenantId || !nomEntreprise) return null;

    const tenant = await db.prepare('SELECT slug FROM tenants WHERE id = ?')
      .bind(tenantId).first();
    if (!tenant) return null;

    const souhaite = genererSlugDepuisNom(nomEntreprise);
    if (!souhaite) return null;

    // Deja bon, ou deja bon avec un suffixe de collision (« garage-2 ») :
    // on ne touche a rien.
    const actuel = tenant.slug || '';
    if (actuel === souhaite || new RegExp(`^${souhaite}-\\d+$`).test(actuel)) return null;

    const dejaUtilise = await db.prepare(
      `SELECT COUNT(*) AS n FROM appointments WHERE tenant_id = ? AND source = 'booking_page'`,
    ).bind(tenantId).first();
    if ((dejaUtilise?.n || 0) > 0) return null;

    const nouveau = await genererSlugUnique(db, nomEntreprise, tenantId);
    if (nouveau === actuel) return null;

    await db.prepare('UPDATE tenants SET slug = ? WHERE id = ?').bind(nouveau, tenantId).run();
    return nouveau;
  } catch {
    // Un slug non realigne n'est pas un incident : l'ancien reste valide.
    return null;
  }
}

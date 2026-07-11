// src/modules/compliance/insee.js
// ============================================================================
// Vérification SIRET via l'API publique recherche-entreprises.api.gouv.fr
// (DINUM, données Sirene/INSEE). Aucune authentification, gratuit.
// ----------------------------------------------------------------------------
// On l'utilise en pré-validation AVANT de solliciter Twilio : rejeter tôt les
// SIRET invalides / établissements fermés (meilleure UX, moins de bundles
// rejetés). On récupère aussi la raison sociale + l'adresse du siège pour
// pré-remplir le formulaire et alimenter le End-User Twilio.
// ============================================================================

const BASE = 'https://recherche-entreprises.api.gouv.fr/search';

// Normalise un SIRET : garde uniquement les chiffres. Un SIRET valide = 14 chiffres.
export function normalizeSiret(raw) {
  return String(raw || '').replace(/\D/g, '');
}

export function isValidSiretFormat(siret) {
  return /^\d{14}$/.test(normalizeSiret(siret));
}

// Retourne { status, siret, company_name, siren, address_line, postal_code, city, raw }
// status ∈ 'verified' | 'closed' | 'not_found' | 'error'
export async function verifySiret(rawSiret) {
  const siret = normalizeSiret(rawSiret);
  if (!isValidSiretFormat(siret)) {
    return { status: 'not_found', siret, error: 'Format SIRET invalide (14 chiffres attendus)' };
  }

  let data;
  try {
    // Timeout 5s : l'annuaire ne doit jamais faire pendre la requête (le save
    // d'identité ne dépend pas de l'INSEE — il dégrade en insee_status='error').
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
      res = await fetch(`${BASE}?q=${siret}&page=1&per_page=1`, {
        headers: { 'User-Agent': 'VoixIA-Compliance/1.0' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      return { status: 'error', siret, error: `Annuaire indisponible (${res.status})` };
    }
    data = await res.json();
  } catch (e) {
    return { status: 'error', siret, error: 'Annuaire indisponible' };
  }

  const result = (data.results || [])[0];
  if (!result) {
    return { status: 'not_found', siret };
  }

  const siege = result.siege || {};
  // On ne fait confiance qu'à l'établissement dont le SIRET correspond exactement.
  const matchedSiret = normalizeSiret(siege.siret) === siret;
  const etat = (matchedSiret ? siege.etat_administratif : result.etat_administratif) || '';
  const active = etat.toUpperCase() === 'A'; // A = actif, C = cessé

  return {
    status: active ? 'verified' : 'closed',
    siret,
    siren: result.siren || null,
    company_name: result.nom_raison_sociale || result.nom_complet || null,
    address_line: siege.adresse || null,
    postal_code: siege.code_postal || null,
    city: siege.libelle_commune || null,
    country: 'FR',
  };
}

// Compare la raison sociale saisie avec celle de l'INSEE (tolérant : casse,
// espaces, accents). Retourne true si "assez proche" pour pré-remplir sans
// bloquer — on ne rejette pas sur ce seul critère (le nom d'usage diffère
// souvent du nom légal), on le remonte comme information.
export function nameLooselyMatches(input, official) {
  const norm = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = norm(input);
  const b = norm(official);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// src/modules/compliance/routes.js
// ============================================================================
// Chantier Conformité — revente de numéros FR par client final.
// ----------------------------------------------------------------------------
// Chaque agent (tenant enfant) = un client final = une entité juridique qui
// recevra un numéro géographique FR. La loi (ARCEP + exigence Twilio) impose de
// rattacher ce numéro à l'identité RÉELLE du bénéficiaire : Regulatory Bundle
// Twilio dédié (SIRET + adresse + End-User + pièce d'identité du dirigeant).
//
// Flux :
//   1. Vérif SIRET (INSEE public, gratuit) — pré-validation avant Twilio.
//   2. Upload pièces (Kbis + CIN) → R2 souverain → SupportingDocument Twilio.
//   3. Bundle Twilio (numbers.twilio.com/v2/RegulatoryCompliance, creds us1) :
//      Bundle → EndUser → Address → ItemAssignments → Evaluation → submit.
//   4. Réconciliation statut (draft → pending-review → approved/rejected).
//   5. GARDE-FOU : l'attribution d'un numéro est bloquée tant que le bundle du
//      client n'est pas 'approved' (voir reseller/routes.js). Le tenant maître
//      (admin) est exempté → numéros démo intacts.
//
// Régions Twilio : les bundles/regulatory vivent sur le host GLOBAL
// numbers.twilio.com (creds us1 = TWILIO_AUTH_TOKEN), comme l'achat de numéro
// aujourd'hui (BundleSid passé à l'étape us1). La résidence des données IE1 est
// gérée séparément à l'achat (VoiceRegion + trunk), orthogonale au bundle.
// ============================================================================

import * as auth from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';
import { verifySiret, normalizeSiret, nameLooselyMatches } from './insee.js';
import { notifyBundleStatus } from './notify.js';

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Fonctions acceptées par Twilio pour l'Authorized Representative (enum figé
// côté Twilio ; le portail affiche des libellés FR mappés sur ces valeurs).
const REP_JOB_POSITIONS = ['Director', 'GM', 'VP', 'CEO', 'CFO', 'General Counsel', 'Other'];

// requirements.supporting_document est un tableau de GROUPES ; chaque groupe est
// une exigence distincte à satisfaire, et liste les documents alternatifs qui la
// satisfont. Ne PAS aplatir : en FR, deux groupes acceptent le même type
// `commercial_registrar_excerpt` avec des champs différents (nom du représentant
// d'un côté, address_sids de l'autre) → un Kbis doit produire DEUX documents.
// Retourne : [ { index, docs: [{ type, fields[], name }] }, … ]
function extractDocGroups(requirements) {
  return (requirements?.supporting_document || []).map((group, index) => {
    const docs = [];
    for (const req of (Array.isArray(group) ? group : [group])) {
      for (const acc of (req?.accepted_documents || [])) {
        if (acc?.type) docs.push({ type: acc.type, fields: acc.fields || [], name: acc.name || req.name || '' });
      }
    }
    return { index, docs };
  }).filter((g) => g.docs.length > 0);
}

// Parmi les documents acceptés d'un groupe, trouve celui que l'une de nos pièces
// peut satisfaire. Retourne { doc, docType } ou null (groupe non couvert par nos
// pièces → on ne pousse rien, l'Evaluation le signalera).
function pickDocForGroup(group, ourDocTypes) {
  const rx = {
    kbis: /business|registration|commercial|kbis|excerpt|register/i,
    address_proof: /address|utility|tax|rental|deed|receipt/i,
  };
  // Le Kbis d'abord : en FR il couvre les deux groupes (registre + adresse).
  for (const docType of ['kbis', 'address_proof']) {
    if (!ourDocTypes.includes(docType)) continue;
    const hit = group.docs.find((d) => rx[docType].test(d.type) || rx[docType].test(d.name));
    if (hit) return { doc: hit, docType };
  }
  return null;
}

// Compte revendeur maître (démo) : bypass conformité (même logique que le
// garde-fou d'attribution dans reseller/routes.js). Défaut = personne.
function isPurchaseAdmin(authResult, env) {
  const allow = (env.RESELLER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (authResult.user?.email || '').toLowerCase();
  return allow.length > 0 && allow.includes(email);
}

// --- Auth Twilio us1 (global) : Bundles + EndUsers + SupportingDocuments ----
function twNumbers(env) {
  const sid = env.TWILIO_ACCOUNT_SID;
  if (!sid || !env.TWILIO_AUTH_TOKEN) return null;
  return {
    sid,
    base: 'https://numbers.twilio.com',
    apiBase: 'https://api.twilio.com',
    header: 'Basic ' + btoa(`${sid}:${env.TWILIO_AUTH_TOKEN}`),
  };
}

async function twPost(tw, url, form, isMultipart) {
  const headers = { Authorization: tw.header };
  let body;
  if (isMultipart) {
    body = form; // FormData — le runtime pose le Content-Type + boundary
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = form.toString();
  }
  const res = await fetch(url, { method: 'POST', headers, body });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function twGet(tw, url) {
  const res = await fetch(url, { headers: { Authorization: tw.header } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function twDelete(tw, url) {
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: tw.header } });
  return { ok: res.ok, status: res.status };
}

// Récupère la ligne compliance d'un agent, en vérifiant que l'agent appartient
// bien au revendeur authentifié (tenant enfant). Retourne { agent, comp } ou null.
async function ownedCompliance(env, parentId, agentId) {
  const agent = await env.DB.prepare(
    'SELECT id, name, company_name FROM tenants WHERE id = ? AND parent_tenant_id = ?'
  ).bind(agentId, parentId).first();
  if (!agent) return null;
  const comp = await env.DB.prepare(
    'SELECT * FROM client_compliance WHERE tenant_id = ?'
  ).bind(agentId).first();
  return { agent, comp };
}

export async function handleComplianceRoutes(request, env, path, method, corsHeaders) {
  // ------------------------------------------------------------------
  // POST /api/v1/compliance/verify-siret  { siret, company_name? }
  // Pré-validation INSEE (gratuit, read-only). Sert au pré-remplissage.
  // ------------------------------------------------------------------
  if (path === '/api/v1/compliance/verify-siret' && method === 'POST') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    let body;
    try { body = await request.json(); } catch { body = {}; }
    const result = await verifySiret(body.siret);
    if (result.status === 'error') {
      return json({ success: false, error: result.error || 'Annuaire indisponible' }, 502, corsHeaders);
    }
    const nameMatch = result.status === 'verified' && body.company_name
      ? nameLooselyMatches(body.company_name, result.company_name)
      : null;
    return json({ success: true, ...result, name_match: nameMatch }, 200, corsHeaders);
  }

  // ------------------------------------------------------------------
  // GET /api/v1/compliance/agents — état conformité de tous mes agents
  // (pour l'écran portail : badge par agent).
  // ------------------------------------------------------------------
  if (path === '/api/v1/compliance/agents' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    const parentId = authResult.tenant.id;
    const rows = await env.DB.prepare(`
      SELECT t.id AS tenant_id, t.name, t.company_name,
             c.siret, c.insee_status, c.company_name AS legal_name,
             c.bundle_status, c.kyc_status, c.rejection_reason,
             m.phone_number
      FROM tenants t
      LEFT JOIN client_compliance c ON c.tenant_id = t.id
      LEFT JOIN omni_phone_mappings m ON m.tenant_id = t.id AND m.channel_type = 'voice' AND m.is_active = 1
      WHERE t.parent_tenant_id = ?
      ORDER BY t.created_at DESC
    `).bind(parentId).all();
    return json({ success: true, agents: rows.results || [] }, 200, corsHeaders);
  }

  // Routes ciblant un agent : /api/v1/compliance/:tenantId[...]
  const detailMatch = path.match(/^\/api\/v1\/compliance\/([^/]+)$/);
  const docMatch = path.match(/^\/api\/v1\/compliance\/([^/]+)\/documents$/);
  const bundleMatch = path.match(/^\/api\/v1\/compliance\/([^/]+)\/bundle$/);
  const statusMatch = path.match(/^\/api\/v1\/compliance\/([^/]+)\/bundle-status$/);
  const testNotifyMatch = path.match(/^\/api\/v1\/compliance\/([^/]+)\/test-notify$/);

  // Exclure les chemins réservés (verify-siret, agents) déjà traités ci-dessus.
  const reserved = new Set(['verify-siret', 'agents']);

  // ------------------------------------------------------------------
  // GET  /api/v1/compliance/:tenantId — détail conformité d'un agent
  // POST /api/v1/compliance/:tenantId — set/maj SIRET + adresse + vérif INSEE
  // ------------------------------------------------------------------
  if (detailMatch && !reserved.has(detailMatch[1]) && (method === 'GET' || method === 'POST')) {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    const parentId = authResult.tenant.id;
    const agentId = decodeURIComponent(detailMatch[1]);
    const owned = await ownedCompliance(env, parentId, agentId);
    if (!owned) return json({ success: false, error: 'Agent introuvable' }, 404, corsHeaders);

    if (method === 'GET') {
      const docs = await env.DB.prepare(
        'SELECT id, doc_type, filename, status, twilio_document_sid, created_at FROM compliance_documents WHERE tenant_id = ? ORDER BY created_at DESC'
      ).bind(agentId).all();
      // can_assign : anticipe l'UX (le garde-fou serveur reste la source de
      // vérité). Vrai si bundle approuvé OU compte admin (bypass démo).
      const canAssign = isPurchaseAdmin(authResult, env) || owned.comp?.bundle_status === 'approved';
      return json({
        success: true,
        agent: owned.agent,
        compliance: owned.comp || null,
        documents: docs.results || [],
        can_assign: canAssign,
      }, 200, corsHeaders);
    }

    // POST — set/maj identité
    let b;
    try { b = await request.json(); } catch { b = {}; }
    const siret = normalizeSiret(b.siret);
    const now = new Date().toISOString();

    // Vérif INSEE (best-effort mais on bloque un SIRET fermé/introuvable côté UI).
    const ins = await verifySiret(siret);
    const companyName = (b.company_name || ins.company_name || owned.agent.company_name || '').trim();
    const addressLine = (b.address_line || ins.address_line || '').trim();
    const postalCode = (b.postal_code || ins.postal_code || '').trim();
    const city = (b.city || ins.city || '').trim();

    // Représentant légal (Authorized Representative) — normalisé + validé.
    const repFirstName = String(b.rep_first_name || '').trim().slice(0, 100);
    const repLastName = String(b.rep_last_name || '').trim().slice(0, 100);
    const repEmail = String(b.rep_email || '').trim().slice(0, 200);
    const repPhone = String(b.rep_phone || '').trim().replace(/[\s.\-()]/g, '').slice(0, 20);
    const repJob = REP_JOB_POSITIONS.includes(b.rep_job_position) ? b.rep_job_position : '';
    // Site web : optionnel (beaucoup de TPE n'en ont pas). Normalisé en URL
    // absolue — Twilio refuse un « exemple.fr » nu.
    let website = String(b.business_website || '').trim().slice(0, 200);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(website)) {
      return json({ success: false, error: 'Site web invalide (ex. https://exemple.fr)' }, 400, corsHeaders);
    }
    // Validations souples : on n'exige pas le représentant au POST identité (saisie
    // progressive), mais si un champ est fourni on refuse un format manifestement faux.
    if (repEmail && !/^\S+@\S+\.\S+$/.test(repEmail)) {
      return json({ success: false, error: "Email du représentant invalide" }, 400, corsHeaders);
    }
    if (repPhone && !/^\+[1-9]\d{1,14}$/.test(repPhone)) {
      return json({ success: false, error: "Téléphone du représentant invalide (format international, ex. +33612345678)" }, 400, corsHeaders);
    }

    const existing = owned.comp;
    if (existing) {
      await env.DB.prepare(`
        UPDATE client_compliance SET
          siret = ?, company_name = ?, insee_status = ?, insee_checked_at = ?,
          address_line = ?, postal_code = ?, city = ?, business_website = ?,
          rep_first_name = ?, rep_last_name = ?, rep_email = ?, rep_phone = ?, rep_job_position = ?,
          updated_at = ?
        WHERE tenant_id = ?
      `).bind(siret, companyName, ins.status, now, addressLine, postalCode, city, website,
              repFirstName, repLastName, repEmail, repPhone, repJob, now, agentId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO client_compliance
          (id, tenant_id, siret, company_name, insee_status, insee_checked_at,
           address_line, postal_code, city, country, bundle_status, kyc_status,
           business_website, rep_first_name, rep_last_name, rep_email, rep_phone, rep_job_position,
           created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FR', 'draft', 'none', ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(auth.generateId('comp'), agentId, siret, companyName, ins.status, now,
              addressLine, postalCode, city, website,
              repFirstName, repLastName, repEmail, repPhone, repJob, now, now).run();
    }

    return json({
      success: true,
      insee_status: ins.status,
      company_name: companyName,
      address_line: addressLine,
      postal_code: postalCode,
      city,
      rep_first_name: repFirstName,
      rep_last_name: repLastName,
      rep_email: repEmail,
      rep_phone: repPhone,
      rep_job_position: repJob,
      business_website: website,
    }, 200, corsHeaders);
  }

  // ------------------------------------------------------------------
  // POST /api/v1/compliance/:tenantId/documents — upload Kbis/CIN
  // Corps JSON base64 (PAS multipart) : { doc_type, filename, content_type,
  // data_base64 }. On évite ainsi le multipart (bloqué à l'edge sur certains
  // contenus binaires) — même forme de requête que /verify-siret qui, elle,
  // fonctionne. Stockage R2 souverain (AUDIO_BUCKET, préfixe compliance/).
  // ------------------------------------------------------------------
  if (docMatch && (method === 'POST')) {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    const parentId = authResult.tenant.id;
    const agentId = decodeURIComponent(docMatch[1]);
    const owned = await ownedCompliance(env, parentId, agentId);
    if (!owned) return json({ success: false, error: 'Agent introuvable' }, 404, corsHeaders);
    if (!env.AUDIO_BUCKET) return json({ success: false, error: 'Stockage indisponible' }, 500, corsHeaders);

    let b;
    try { b = await request.json(); } catch { return json({ success: false, error: 'Requête invalide' }, 400, corsHeaders); }
    const docType = String(b.doc_type || '').trim();
    const contentType = String(b.content_type || '').trim();
    const dataB64 = String(b.data_base64 || '');
    if (!dataB64) return json({ success: false, error: 'Fichier manquant' }, 400, corsHeaders);
    if (!['kbis', 'cin', 'address_proof'].includes(docType)) {
      return json({ success: false, error: 'Type de document invalide' }, 400, corsHeaders);
    }
    if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(contentType)) {
      return json({ success: false, error: 'Formats acceptés : PDF, JPEG, PNG' }, 400, corsHeaders);
    }

    // Décodage base64 → octets (atob dispo dans le runtime Workers).
    let buf;
    try {
      const bin = atob(dataB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      buf = bytes;
    } catch {
      return json({ success: false, error: 'Fichier illisible' }, 400, corsHeaders);
    }
    if (buf.byteLength === 0) return json({ success: false, error: 'Fichier vide' }, 400, corsHeaders);
    if (buf.byteLength > 10 * 1024 * 1024) {
      return json({ success: false, error: 'Fichier trop volumineux (max 10 Mo)' }, 400, corsHeaders);
    }

    const docId = auth.generateId('cdoc');
    const ext = contentType === 'application/pdf' ? 'pdf' : (contentType === 'image/png' ? 'png' : 'jpg');
    const r2Key = `compliance/${agentId}/${docType}-${docId}.${ext}`;
    const now = new Date().toISOString();
    try {
      await env.AUDIO_BUCKET.put(r2Key, buf, { httpMetadata: { contentType } });
    } catch (e) {
      logger.error('Compliance doc R2 put failed', { error: e.message, agentId });
      return json({ success: false, error: "Échec de l'enregistrement du document" }, 500, corsHeaders);
    }

    const filename = (String(b.filename || '') || `${docType}.${ext}`).slice(0, 200);
    await env.DB.prepare(`
      INSERT INTO compliance_documents (id, tenant_id, doc_type, r2_key, filename, content_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'uploaded', ?)
    `).bind(docId, agentId, docType, r2Key, filename, contentType, now).run();

    // Marque le KYC comme 'uploaded' dès qu'une CIN est présente.
    if (docType === 'cin') {
      await env.DB.prepare(
        "UPDATE client_compliance SET kyc_status = 'uploaded', updated_at = ? WHERE tenant_id = ? AND kyc_status = 'none'"
      ).bind(now, agentId).run();
    }

    return json({ success: true, document: { id: docId, doc_type: docType, filename, status: 'uploaded' } }, 201, corsHeaders);
  }

  // ------------------------------------------------------------------
  // POST /api/v1/compliance/:tenantId/bundle — construit + soumet le bundle
  // Twilio (Lot B). Idempotent best-effort : réutilise le bundle existant.
  // ------------------------------------------------------------------
  if (bundleMatch && method === 'POST') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    const parentId = authResult.tenant.id;
    const agentId = decodeURIComponent(bundleMatch[1]);
    const owned = await ownedCompliance(env, parentId, agentId);
    if (!owned) return json({ success: false, error: 'Agent introuvable' }, 404, corsHeaders);
    const comp = owned.comp;
    if (!comp || !comp.siret) {
      return json({ success: false, error: 'Renseignez le SIRET avant de lancer la vérification' }, 400, corsHeaders);
    }
    if (comp.insee_status !== 'verified') {
      return json({ success: false, error: 'SIRET non vérifié (établissement introuvable ou fermé)' }, 400, corsHeaders);
    }
    // Documents requis : Kbis + CIN.
    const docs = (await env.DB.prepare(
      'SELECT id, doc_type, r2_key, filename, content_type, twilio_document_sid FROM compliance_documents WHERE tenant_id = ?'
    ).bind(agentId).all()).results || [];
    const hasKbis = docs.some((d) => d.doc_type === 'kbis');
    const hasCin = docs.some((d) => d.doc_type === 'cin');
    if (!hasKbis || !hasCin) {
      return json({ success: false, error: 'Documents requis : extrait Kbis et pièce d\'identité du dirigeant' }, 400, corsHeaders);
    }
    // Représentant légal complet requis (Authorized Representative Twilio).
    if (!comp.rep_first_name || !comp.rep_last_name || !comp.rep_email || !comp.rep_phone
        || !REP_JOB_POSITIONS.includes(comp.rep_job_position)) {
      return json({ success: false, error: 'Renseignez le représentant légal (prénom, nom, email, téléphone, fonction) avant de lancer la vérification' }, 400, corsHeaders);
    }
    // L'adresse FR est indispensable (le document Kbis y sera rattaché côté Twilio).
    if (!comp.address_line || !comp.postal_code || !comp.city) {
      return json({ success: false, error: "Adresse française complète requise (voie, code postal, ville)" }, 400, corsHeaders);
    }

    const tw = twNumbers(env);
    if (!tw) return json({ success: false, error: 'Service de conformité indisponible' }, 500, corsHeaders);

    try {
      const result = await buildAndSubmitBundle(env, tw, agentId, comp, owned.agent, docs);
      return json({ success: true, ...result }, 200, corsHeaders);
    } catch (e) {
      logger.error('Compliance bundle build failed', { error: e.message, agentId });
      return json({ success: false, error: e.message || 'Échec de la vérification' }, 502, corsHeaders);
    }
  }

  // ------------------------------------------------------------------
  // GET /api/v1/compliance/:tenantId/bundle-status — rafraîchit depuis Twilio
  // ------------------------------------------------------------------
  if (statusMatch && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    const parentId = authResult.tenant.id;
    const agentId = decodeURIComponent(statusMatch[1]);
    const owned = await ownedCompliance(env, parentId, agentId);
    if (!owned) return json({ success: false, error: 'Agent introuvable' }, 404, corsHeaders);
    if (!owned.comp || !owned.comp.twilio_bundle_sid) {
      return json({ success: true, bundle_status: owned.comp?.bundle_status || 'draft' }, 200, corsHeaders);
    }
    const tw = twNumbers(env);
    if (!tw) return json({ success: false, error: 'Service indisponible' }, 500, corsHeaders);
    const res = await refreshBundleStatus(env, tw, agentId, owned.comp.twilio_bundle_sid);
    return json({
      success: true,
      bundle_status: res?.status || owned.comp.bundle_status || 'draft',
      rejection_reason: res?.rejection_reason ?? null,
    }, 200, corsHeaders);
  }

  // ------------------------------------------------------------------
  // POST /api/v1/compliance/:tenantId/test-notify  { status }
  // Envoi de test de l'email de notification (fidèle au code de prod).
  // Restreint par la propriété : un revendeur ne peut notifier que SES agents
  // → l'email part vers sa propre adresse (aucun risque de spam tiers).
  // Ne modifie PAS notified_bundle_status (répétable).
  // ------------------------------------------------------------------
  if (testNotifyMatch && method === 'POST') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    const parentId = authResult.tenant.id;
    const agentId = decodeURIComponent(testNotifyMatch[1]);
    const owned = await ownedCompliance(env, parentId, agentId);
    if (!owned) return json({ success: false, error: 'Agent introuvable' }, 404, corsHeaders);
    let b;
    try { b = await request.json(); } catch { b = {}; }
    const status = b.status === 'rejected' ? 'rejected' : 'approved';
    const sent = await notifyBundleStatus(env, agentId, status);
    return json({ success: true, sent, status, from: env.VOIXIA_FROM_EMAIL || 'VoixIA <notifications@voixia.io>' }, 200, corsHeaders);
  }

  return null; // pas une route conformité
}

// ============================================================================
// Lot B — Construction du bundle Twilio
// ============================================================================
// Flux (numbers.twilio.com/v2/RegulatoryCompliance, creds us1) :
//   1. GET Regulations (FR/local/business) → RegulationSid + requirements
//   2. POST Bundle (RegulationSid, FriendlyName, Email)
//   3. POST Address (api.twilio.com/2010-04-01/.../Addresses.json) — AVANT les
//      documents : son SID est requis pour rattacher le Kbis à l'adresse FR.
//   4. POST EndUser Type=business — société ET représentant légal : la
//      Regulation FR n'expose qu'un seul End-User, qui porte business_name,
//      business_registration_number, business_website (optionnel) et
//      first_name/last_name/email du dirigeant.
//   5. Nettoyage de l'End-User 'individual' des dossiers antérieurs (obsolète)
//   6. POST SupportingDocument (multipart) depuis R2 — UN par groupe d'exigence
//      de la Regulation, pas un par pièce : en FR le même Kbis satisfait deux
//      groupes (registre montrant le nom du représentant + registre montrant
//      l'adresse française), avec des attributs différents. La CIN n'a aucun
//      type FR : conservée en R2 (KYC interne), non poussée à Twilio.
//   7. POST ItemAssignments (Address + EndUser + Documents) sur le bundle
//   8. POST Evaluation → si compliant, POST Bundle Status=pending-review
//
// La construction est pilotée par `regulation.requirements` (End-User et groupes
// de documents EXACTS attendus par la Regulation FR), donc résiliente aux
// évolutions Twilio. Les attributs sont repoussés à chaque build (y compris sur
// des objets existants) : un dossier rejeté puis corrigé ne doit jamais rejouer
// les valeurs d'une tentative précédente. L'Evaluation (étape 8) reste le filet :
// tout écart remonte dans rejection_reason (lot du 15/07).
async function buildAndSubmitBundle(env, tw, agentId, comp, agent, docs) {
  const now = new Date().toISOString();
  let bundleSid = comp.twilio_bundle_sid;
  const friendly = `VoixIA ${comp.company_name || agent.name} ${comp.siret}`.slice(0, 60);
  const email = env.RESELLER_ADMIN_EMAILS?.split(',')[0]?.trim() || 'contact@voixia.io';

  // 1. Regulation FR / local / business (+ requirements pour le typage exact)
  const regRes = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/Regulations?IsoCountry=FR&NumberType=local&EndUserType=business&PageSize=1`);
  const regulation = regRes.data?.results?.[0];
  const regulationSid = regulation?.sid;
  if (!regulationSid) throw new Error('Réglementation FR introuvable côté opérateur');
  const requirements = regulation.requirements || {};

  // 2. Bundle (créé une seule fois)
  if (!bundleSid) {
    const bf = new URLSearchParams({ FriendlyName: friendly, Email: email, RegulationSid: regulationSid });
    const br = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles`, bf, false);
    if (!br.ok || !br.data?.sid) throw new Error(br.data?.message || 'Création du dossier impossible');
    bundleSid = br.data.sid;
    await env.DB.prepare('UPDATE client_compliance SET twilio_bundle_sid = ?, updated_at = ? WHERE tenant_id = ?')
      .bind(bundleSid, now, agentId).run();
  }

  const assignments = [];

  // 3. Address (créée AVANT les documents : le Kbis y sera rattaché via address_sids)
  let addressSid = comp.twilio_address_sid;
  if (!addressSid && comp.address_line) {
    const af = new URLSearchParams({
      FriendlyName: friendly,
      CustomerName: comp.company_name || agent.name,
      Street: comp.address_line,
      City: comp.city || '',
      Region: comp.city || '',
      PostalCode: comp.postal_code || '',
      IsoCountry: 'FR',
    });
    const ar = await twPost(tw, `${tw.apiBase}/2010-04-01/Accounts/${tw.sid}/Addresses.json`, af, false);
    if (ar.ok && ar.data?.sid) {
      addressSid = ar.data.sid;
      await env.DB.prepare('UPDATE client_compliance SET twilio_address_sid = ?, updated_at = ? WHERE tenant_id = ?')
        .bind(addressSid, now, agentId).run();
    }
  }
  if (addressSid) assignments.push(addressSid);

  // La Regulation FR n'expose qu'UN SEUL End-User, de type 'business' : il porte
  // à la fois l'identité de la société ET celle du représentant légal
  // (first_name / last_name / email). Il n'y a pas d'End-User représentant
  // séparé — un End-User 'individual' ne serait rattaché à aucun requirement.
  // Valeurs société centralisées : le Kbis DOIT les répéter à l'identique
  // (l'Evaluation compare et rejette au moindre écart — code 22217).
  const businessName = comp.company_name || agent.name;
  const businessNumber = comp.siret;

  // 4. EndUser business (société + représentant légal)
  const euAttrs = {
    business_name: businessName,
    business_registration_number: businessNumber,
    first_name: comp.rep_first_name,
    last_name: comp.rep_last_name,
    email: comp.rep_email,
  };
  // Optionnel : beaucoup de TPE n'ont pas de site. Champ omis plutôt que vide.
  if (comp.business_website) euAttrs.business_website = comp.business_website;

  // Les attributs sont (re)poussés à CHAQUE build, y compris sur un End-User
  // existant : un dossier rejeté puis corrigé doit repartir avec les bonnes
  // valeurs, jamais celles figées lors d'une tentative précédente.
  let endUserSid = comp.twilio_enduser_sid;
  const euf = new URLSearchParams({ FriendlyName: friendly, Attributes: JSON.stringify(euAttrs) });
  if (!endUserSid) euf.set('Type', 'business'); // Type immuable : à la création seulement
  const euUrl = endUserSid
    ? `${tw.base}/v2/RegulatoryCompliance/EndUsers/${endUserSid}`
    : `${tw.base}/v2/RegulatoryCompliance/EndUsers`;
  const eur = await twPost(tw, euUrl, euf, false);
  if (!eur.ok || !eur.data?.sid) throw new Error(eur.data?.message || "Création de l'identité société impossible");
  if (!endUserSid) {
    endUserSid = eur.data.sid;
    await env.DB.prepare('UPDATE client_compliance SET twilio_enduser_sid = ?, updated_at = ? WHERE tenant_id = ?')
      .bind(endUserSid, now, agentId).run();
  }
  assignments.push(endUserSid);

  // 5. Nettoyage : les dossiers construits avant le 17/07/2026 portent un
  // End-User 'individual' (représentant) qui n'est rattaché à aucun requirement
  // FR. On le désassigne du bundle pour ne pas polluer l'Evaluation.
  if (comp.twilio_rep_enduser_sid) {
    try {
      const ia = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments?PageSize=50`);
      const orphan = (ia.data?.results || []).find((i) => i.object_sid === comp.twilio_rep_enduser_sid);
      if (orphan?.sid) {
        await twDelete(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments/${orphan.sid}`);
      }
      await env.DB.prepare('UPDATE client_compliance SET twilio_rep_enduser_sid = NULL WHERE tenant_id = ?')
        .bind(agentId).run();
    } catch (e) {
      logger.warn('Orphan rep end-user cleanup failed', { agentId, error: e.message });
    }
  }

  // 6. SupportingDocuments — UN par groupe d'exigence de la Regulation (et non
  // un par pièce uploadée) : en FR le même Kbis satisfait deux groupes avec des
  // attributs différents. La CIN, elle, n'a aucun type dans la Regulation FR :
  // elle reste en R2 pour notre KYC interne et n'est pas poussée à Twilio.
  const docGroups = extractDocGroups(requirements);
  const byType = {};
  for (const d of docs) if (!byType[d.doc_type]) byType[d.doc_type] = d;
  const ourDocTypes = Object.keys(byType);

  for (const group of docGroups) {
    const pick = pickDocForGroup(group, ourDocTypes);
    if (!pick) {
      logger.warn('Regulation document group not covered', { agentId, group: group.index, accepted: group.docs.map((d) => d.type) });
      continue;
    }
    const d = byType[pick.docType];
    const fields = pick.doc.fields;

    // Attributs : strictement les champs attendus par ce groupe.
    const attrs = {};
    if (fields.includes('address_sids') && addressSid) attrs.address_sids = [addressSid];
    if (fields.includes('business_name')) attrs.business_name = businessName;
    if (fields.includes('business_registration_number')) attrs.business_registration_number = businessNumber;
    if (fields.includes('first_name')) attrs.first_name = comp.rep_first_name;
    if (fields.includes('last_name')) attrs.last_name = comp.rep_last_name;

    // Un SID par groupe (le même fichier vit en deux SupportingDocuments).
    let sids = {};
    try { sids = JSON.parse(d.twilio_document_sids || '{}'); } catch { sids = {}; }
    // Reprise des dossiers antérieurs : le SID historique est celui du 1er groupe.
    if (!sids[group.index] && group.index === 0 && d.twilio_document_sid) sids[0] = d.twilio_document_sid;
    const existingSid = sids[group.index];

    let sr;
    if (existingSid) {
      // Document déjà uploadé : on ne renvoie que les attributs (mêmes raisons
      // qu'au point 4 — un dossier corrigé ne doit pas rejouer d'anciennes valeurs).
      const uf = new URLSearchParams({ Attributes: JSON.stringify(attrs) });
      sr = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/SupportingDocuments/${existingSid}`, uf, false);
    } else {
      const obj = await env.AUDIO_BUCKET.get(d.r2_key);
      if (!obj) { logger.warn('Compliance document missing in R2', { agentId, doc: d.doc_type }); continue; }
      const bytes = await obj.arrayBuffer();
      const fd = new FormData();
      fd.append('FriendlyName', `${d.doc_type}-${group.index}-${agentId}`.slice(0, 60));
      fd.append('Type', pick.doc.type);
      fd.append('Attributes', JSON.stringify(attrs));
      fd.append('File', new Blob([bytes], { type: d.content_type || 'application/octet-stream' }), d.filename || 'document');
      sr = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/SupportingDocuments`, fd, true);
    }

    const sid = sr.ok ? (sr.data?.sid || existingSid) : null;
    if (sid) {
      sids[group.index] = sid;
      await env.DB.prepare("UPDATE compliance_documents SET twilio_document_sids = ?, twilio_document_sid = COALESCE(twilio_document_sid, ?), status = 'attached' WHERE id = ?")
        .bind(JSON.stringify(sids), sid, d.id).run();
      assignments.push(sid);
    } else {
      logger.warn('SupportingDocument upload failed', { agentId, doc: d.doc_type, type: pick.doc.type, group: group.index, message: sr.data?.message });
    }
  }

  // 6. ItemAssignments (idempotent : Twilio ignore/erreur si déjà assigné → best-effort)
  for (const objectSid of assignments) {
    const itf = new URLSearchParams({ ObjectSid: objectSid });
    await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments`, itf, false);
  }

  // 7. Evaluation
  const evf = new URLSearchParams();
  const ev = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}/Evaluations`, evf, false);
  const compliant = ev.data?.status === 'compliant';

  let bundleStatus = 'draft';
  let rejectionReason = null;
  if (compliant) {
    // 8. Soumission
    const sf = new URLSearchParams({ Status: 'pending-review' });
    const sr = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}`, sf, false);
    if (sr.ok) {
      // submit accepté : Twilio renvoie 'pending-review'/'in-review' (→ mappé),
      // fallback 'pending-review' si le statut n'est pas renvoyé.
      const mapped = mapBundleStatus(sr.data?.status);
      bundleStatus = mapped === 'draft' ? 'pending-review' : mapped;
    } else {
      bundleStatus = 'draft';
      rejectionReason = sr.data?.message || 'Soumission refusée par l\'opérateur';
    }
  } else {
    // Remonte ce qui manque (résultats d'évaluation) pour l'UI.
    const fails = (ev.data?.results || [])
      .filter((r) => r.passed === false)
      .map((r) => r.friendly_name || r.requirement_friendly_name)
      .filter(Boolean);
    rejectionReason = fails.length ? `Éléments manquants : ${fails.join(', ')}` : 'Dossier incomplet';
  }

  await env.DB.prepare('UPDATE client_compliance SET bundle_status = ?, rejection_reason = ?, updated_at = ? WHERE tenant_id = ?')
    .bind(bundleStatus, rejectionReason, now, agentId).run();

  return { bundle_status: bundleStatus, bundle_sid: bundleSid, rejection_reason: rejectionReason, compliant };
}

// Map les statuts Twilio bundle → nos statuts internes.
function mapBundleStatus(twilioStatus) {
  switch (twilioStatus) {
    case 'twilio-approved': return 'approved';
    case 'twilio-rejected': return 'rejected';
    case 'pending-review':
    case 'in-review': return 'pending-review';
    default: return 'draft';
  }
}

// Libellé FR de la pièce concernée à partir de sa description Twilio (le
// friendly_name est préfixé par le doc_type au dépôt ; sinon on lit le
// document_type dans les Attributes). Sert à préfixer le motif de rejet.
function docLabel(docData) {
  const fn = String(docData?.friendly_name || '').toLowerCase();
  if (fn.startsWith('cin')) return "Pièce d'identité";
  if (fn.startsWith('kbis')) return 'Extrait Kbis';
  let attrs = {};
  try {
    attrs = typeof docData?.attributes === 'string'
      ? JSON.parse(docData.attributes)
      : (docData?.attributes || {});
  } catch { /* attributs illisibles → libellé générique */ }
  switch (attrs.document_type) {
    case 'Identity Document': return "Pièce d'identité";
    case 'Business Registration': return 'Extrait Kbis';
    case 'Address Proof': return "Justificatif d'adresse";
    default: return 'Pièce justificative';
  }
}

// Récupère le motif de rejet EXACT renvoyé par Twilio pour un bundle refusé.
// Source en cascade (comme demandé : « failure_reason du bundle ou des
// documents ») :
//   1. failure_reason au niveau du bundle (rarement peuplé, mais prioritaire) ;
//   2. failure_reason des pièces jointes rejetées (SupportingDocuments / EndUser)
//      via les ItemAssignments — source réelle des motifs de revue Twilio ;
//   3. fallback : éléments non conformes de la dernière évaluation.
// Retourne une chaîne FR lisible, préfixée par la pièce, tronquée à 300 car.,
// ou null si aucun motif n'est récupérable. Best-effort : ne jette jamais.
async function fetchBundleRejectionReason(tw, bundleSid, bundleData) {
  const parts = [];

  // 1. Motif au niveau du bundle.
  if (bundleData?.failure_reason) parts.push(String(bundleData.failure_reason).trim());

  // 2. Pièces jointes rejetées.
  try {
    const ia = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments?PageSize=50`);
    for (const it of (ia.data?.results || [])) {
      const objectSid = it.object_sid || '';
      if (objectSid.startsWith('RD')) {
        const doc = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/SupportingDocuments/${objectSid}`);
        if (doc.data?.failure_reason && doc.data?.status === 'twilio-rejected') {
          parts.push(`${docLabel(doc.data)} : ${String(doc.data.failure_reason).trim()}`);
        }
      } else if (objectSid.startsWith('IT')) {
        const eu = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/EndUsers/${objectSid}`);
        if (eu.data?.failure_reason) {
          parts.push(`Identité entreprise : ${String(eu.data.failure_reason).trim()}`);
        }
      }
    }
  } catch (e) {
    logger.warn('Bundle rejection reason: item read failed', { bundleSid, error: e.message });
  }

  // 3. Fallback : dernière évaluation.
  if (parts.length === 0) {
    try {
      const ev = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}/Evaluations?PageSize=1`);
      const fails = (ev.data?.results?.[0]?.results || [])
        .filter((r) => r.passed === false)
        .map((r) => r.failure_reason || r.friendly_name || r.requirement_friendly_name)
        .filter(Boolean);
      if (fails.length) parts.push(`Éléments non conformes : ${fails.join(', ')}`);
    } catch (e) {
      logger.warn('Bundle rejection reason: evaluation read failed', { bundleSid, error: e.message });
    }
  }

  if (parts.length === 0) return null;
  const reason = parts.join(' · ');
  return reason.length > 300 ? reason.slice(0, 299).trimEnd() + '…' : reason;
}

// Rafraîchit le statut d'un bundle depuis Twilio et, sur rejet, lit + stocke le
// motif exact. Retourne { status, rejection_reason } (ou null si l'appel échoue).
async function refreshBundleStatus(env, tw, agentId, bundleSid) {
  const r = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/Bundles/${bundleSid}`);
  if (!r.ok) return null;
  const status = mapBundleStatus(r.data?.status);
  const now = new Date().toISOString();

  // Motif de rejet : lu depuis Twilio uniquement quand le bundle est refusé.
  let rejectionReason = null;
  if (status === 'rejected') {
    try {
      rejectionReason = await fetchBundleRejectionReason(tw, bundleSid, r.data);
    } catch (e) {
      logger.warn('Bundle rejection reason fetch failed', { agentId, error: e.message });
    }
  }

  // Statut déjà notifié ? (anti-doublon avant mise à jour) + motif déjà en base.
  const prev = await env.DB.prepare('SELECT notified_bundle_status, rejection_reason FROM client_compliance WHERE tenant_id = ?')
    .bind(agentId).first();

  // Écrit statut + motif en une passe. Cas particulier : rejet sans motif
  // récupérable → on préserve un éventuel motif déjà en base (posé à la
  // soumission) plutôt que de l'écraser par NULL. Dans tous les autres cas
  // (approved/pending-review/draft) rejection_reason est remis à NULL (nettoyage).
  if (status === 'rejected' && rejectionReason == null) {
    rejectionReason = prev?.rejection_reason ?? null; // reflète la vérité en base
    await env.DB.prepare('UPDATE client_compliance SET bundle_status = ?, updated_at = ? WHERE tenant_id = ?')
      .bind(status, now, agentId).run();
  } else {
    await env.DB.prepare('UPDATE client_compliance SET bundle_status = ?, rejection_reason = ?, updated_at = ? WHERE tenant_id = ?')
      .bind(status, rejectionReason, now, agentId).run();
  }

  // Notification email au revendeur sur transition vers approved/rejected,
  // une seule fois (best-effort — ne bloque jamais la réconciliation). L'email
  // relit rejection_reason en base : le motif ci-dessus y est déjà écrit.
  if ((status === 'approved' || status === 'rejected') && prev?.notified_bundle_status !== status) {
    try {
      const sent = await notifyBundleStatus(env, agentId, status);
      if (sent) {
        await env.DB.prepare('UPDATE client_compliance SET notified_bundle_status = ? WHERE tenant_id = ?')
          .bind(status, agentId).run();
      }
    } catch (e) {
      logger.warn('Bundle notify dispatch failed', { agentId, status, error: e.message });
    }
  }
  return { status, rejection_reason: rejectionReason };
}

// ============================================================================
// Lot E — Réconciliation planifiée (cron quotidien)
// ============================================================================
// Rafraîchit le statut de tous les bundles encore en revue. Quand un bundle
// passe 'approved', l'attribution de numéro se débloque automatiquement (le
// garde-fou lit client_compliance.bundle_status en direct).
export async function reconcilePendingBundles(env) {
  const tw = twNumbers(env);
  if (!tw) return { checked: 0, updated: 0 };
  const rows = (await env.DB.prepare(
    "SELECT tenant_id, twilio_bundle_sid, bundle_status FROM client_compliance WHERE twilio_bundle_sid IS NOT NULL AND bundle_status IN ('pending-review','draft')"
  ).all()).results || [];
  let updated = 0;
  for (const r of rows) {
    try {
      const before = r.bundle_status;
      const after = await refreshBundleStatus(env, tw, r.tenant_id, r.twilio_bundle_sid);
      if (after?.status && after.status !== before) updated++;
    } catch (e) {
      logger.warn('Bundle reconcile failed', { tenant: r.tenant_id, error: e.message });
    }
  }
  logger.info('Compliance bundles reconciled', { checked: rows.length, updated });
  return { checked: rows.length, updated };
}

// Exporté pour la réconciliation planifiée (Lot E).
export { refreshBundleStatus, twNumbers };

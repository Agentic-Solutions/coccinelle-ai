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

    const existing = owned.comp;
    if (existing) {
      await env.DB.prepare(`
        UPDATE client_compliance SET
          siret = ?, company_name = ?, insee_status = ?, insee_checked_at = ?,
          address_line = ?, postal_code = ?, city = ?, updated_at = ?
        WHERE tenant_id = ?
      `).bind(siret, companyName, ins.status, now, addressLine, postalCode, city, now, agentId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO client_compliance
          (id, tenant_id, siret, company_name, insee_status, insee_checked_at,
           address_line, postal_code, city, country, bundle_status, kyc_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FR', 'draft', 'none', ?, ?)
      `).bind(auth.generateId('comp'), agentId, siret, companyName, ins.status, now,
              addressLine, postalCode, city, now, now).run();
    }

    return json({
      success: true,
      insee_status: ins.status,
      company_name: companyName,
      address_line: addressLine,
      postal_code: postalCode,
      city,
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
//   1. GET Regulations (FR/local/business) → RegulationSid
//   2. POST Bundle (RegulationSid, FriendlyName, Email)
//   3. POST EndUser business (business_name + siret dans Attributes)
//   4. POST Address (api.twilio.com/2010-04-01/.../Addresses.json)
//   5. POST SupportingDocument (multipart, 1 par pièce) depuis R2
//   6. POST ItemAssignments (EndUser + Address + chaque Document) sur le bundle
//   7. POST Evaluation → si compliant, POST Bundle Status=pending-review
async function buildAndSubmitBundle(env, tw, agentId, comp, agent, docs) {
  const now = new Date().toISOString();
  let bundleSid = comp.twilio_bundle_sid;
  const friendly = `VoixIA ${comp.company_name || agent.name} ${comp.siret}`.slice(0, 60);
  const email = env.RESELLER_ADMIN_EMAILS?.split(',')[0]?.trim() || 'contact@voixia.io';

  // 1. Regulation FR / local / business
  const regRes = await twGet(tw, `${tw.base}/v2/RegulatoryCompliance/Regulations?IsoCountry=FR&NumberType=local&EndUserType=business&PageSize=1`);
  const regulationSid = regRes.data?.results?.[0]?.sid;
  if (!regulationSid) throw new Error('Réglementation FR introuvable côté opérateur');

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

  // 3. EndUser business
  let endUserSid = comp.twilio_enduser_sid;
  if (!endUserSid) {
    const euAttrs = {
      business_name: comp.company_name || agent.name,
      business_registration_number: comp.siret,
      business_registration_identifier: 'SIRET',
    };
    const euf = new URLSearchParams({
      FriendlyName: friendly,
      Type: 'business',
      Attributes: JSON.stringify(euAttrs),
    });
    const eur = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/EndUsers`, euf, false);
    if (!eur.ok || !eur.data?.sid) throw new Error(eur.data?.message || "Création de l'identité impossible");
    endUserSid = eur.data.sid;
    await env.DB.prepare('UPDATE client_compliance SET twilio_enduser_sid = ?, updated_at = ? WHERE tenant_id = ?')
      .bind(endUserSid, now, agentId).run();
  }
  assignments.push(endUserSid);

  // 4. Address (objet Twilio classique sur api.twilio.com)
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

  // 5. SupportingDocuments (1 par pièce, upload depuis R2)
  for (const d of docs) {
    if (d.twilio_document_sid) { assignments.push(d.twilio_document_sid); continue; }
    const obj = await env.AUDIO_BUCKET.get(d.r2_key);
    if (!obj) continue;
    const bytes = await obj.arrayBuffer();
    const fd = new FormData();
    const typeName = d.doc_type === 'cin' ? 'Identity Document' : (d.doc_type === 'kbis' ? 'Business Registration' : 'Address Proof');
    fd.append('FriendlyName', `${d.doc_type}-${agentId}`.slice(0, 60));
    fd.append('Type', 'supporting_document');
    fd.append('Attributes', JSON.stringify({ document_type: typeName }));
    fd.append('File', new Blob([bytes], { type: d.content_type || 'application/octet-stream' }), d.filename || 'document');
    const sr = await twPost(tw, `${tw.base}/v2/RegulatoryCompliance/SupportingDocuments`, fd, true);
    if (sr.ok && sr.data?.sid) {
      await env.DB.prepare("UPDATE compliance_documents SET twilio_document_sid = ?, status = 'attached' WHERE id = ?")
        .bind(sr.data.sid, d.id).run();
      assignments.push(sr.data.sid);
    } else {
      logger.warn('SupportingDocument upload failed', { agentId, doc: d.doc_type, message: sr.data?.message });
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

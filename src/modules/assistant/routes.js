// Page « Mon Assistant » (chantier CX-2) — configuration en un aller-retour.
//
// GET  /api/v1/assistant/config
// PUT  /api/v1/assistant/config
//
// POURQUOI UNE SEULE ROUTE
// Enregistrer sur cette page touche `tenants` (nom, horaires), `voixia_configs`
// (voix, transfert, hors horaires) ET le prompt actif. Enchainer ces ecritures
// depuis le frontend, c'est accepter qu'une reussisse et pas les autres : un
// prenom change avec un prompt inchange, et l'agent continue de se presenter
// sous l'ancien nom sans que rien ne signale l'incoherence. C'est exactement la
// divergence qui a coute trois mois sur les templates sectoriels (§ j).
//
// REGLE 6bis — le system_prompt n'est JAMAIS bricole a la chaine. Il est
// REGENERE par buildSectorPrompt(), qui seul garantit les regles i.4/i.5/i.6.

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import * as auth from '../auth/helpers.js';
import {
  buildSectorPrompt, isPromptCompliant, getScenarios, normalizeSector,
  DEFAULT_AGENT_NAME,
} from '../shared/sector-prompts.js';
import { parseHoraires, syncHorairesToSlots, DAY_KEYS } from '../shared/horaires-slots.js';

/** Comportements hors horaires acceptes (segmente de la maquette). */
const HORS_HORAIRES = ['message', 'horaires'];

export async function handleAssistantRoutes(request, env, path, method) {
  if (path !== '/api/v1/assistant/config') return null;

  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) return errorResponse(authResult.error, authResult.status);
  const { user, tenant } = authResult;

  try {
    if (method === 'GET') return await lireConfig(env, tenant, user);
    if (method === 'PUT') return await ecrireConfig(request, env, tenant, user);
    return null;
  } catch (error) {
    logger.error('[Assistant] Erreur config', { error: error.message, tenantId: tenant.id });
    return errorResponse('Erreur interne', 500);
  }
}

/**
 * Le prenom de l'assistant : SOURCE = le prompt actif (CLAUDE.md § f).
 * `voixia_configs.agent_name` existe mais n'est qu'un miroir d'affichage — il a
 * derive par le passe, le prompt fait foi puisque c'est lui que le LLM lit.
 */
export function extraireAgentName(systemPrompt, secours) {
  const m = String(systemPrompt || '').match(/Tu es\s+([^,]{1,40}),\s*l['’]assistant/i);
  const trouve = m && m[1] ? m[1].trim() : '';
  return trouve || String(secours || '').trim() || DEFAULT_AGENT_NAME;
}

/** « 9h » / « 17h30 » — meme rendu que la maquette. */
function hhmm(v) {
  const [h, m] = String(v || '').split(':');
  const heure = parseInt(h, 10);
  if (!Number.isFinite(heure)) return '';
  return m && m !== '00' ? `${heure}h${m}` : `${heure}h`;
}

/**
 * Horaires en une phrase pour le prompt ({HORAIRES}).
 * Les jours consecutifs partageant les memes heures sont regroupes : sans ça,
 * l'agent lit sept lignes a voix haute.
 */
export function horairesEnTexte(horaires) {
  const NOMS = {
    lun: 'lundi', mar: 'mardi', mer: 'mercredi', jeu: 'jeudi',
    ven: 'vendredi', sam: 'samedi', dim: 'dimanche',
  };
  const groupes = [];
  for (const cle of DAY_KEYS) {
    const j = horaires?.[cle];
    if (!j || !j.ouvert) continue;
    const plage = `de ${hhmm(j.debut)} à ${hhmm(j.fin)}`;
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.plage === plage && DAY_KEYS.indexOf(cle) === DAY_KEYS.indexOf(dernier.fin) + 1) {
      dernier.fin = cle;
    } else {
      groupes.push({ debut: cle, fin: cle, plage });
    }
  }
  if (!groupes.length) return '';
  return groupes.map(g => (g.debut === g.fin
    ? `le ${NOMS[g.debut]} ${g.plage}`
    : `du ${NOMS[g.debut]} au ${NOMS[g.fin]} ${g.plage}`)).join(', ');
}

async function chargerEtat(env, tenantId) {
  const [config, prompt] = await Promise.all([
    env.DB.prepare(`
      SELECT voice_id, llm_provider, llm_model, transfer_number, transfer_enabled,
             agent_name, after_hours_behavior, after_hours_message, secteur
        FROM voixia_configs WHERE tenant_id = ?
    `).bind(tenantId).first(),
    env.DB.prepare(`
      SELECT id, version, secteur, canal, system_prompt
        FROM ai_prompt_versions WHERE tenant_id = ? AND is_active = 1
    `).bind(tenantId).first(),
  ]);
  return { config, prompt };
}

/** L'etat complet de la page, en objet nu (pas en Response). */
async function construireConfig(env, tenant, user) {
  const { config, prompt } = await chargerEtat(env, tenant.id);
  const secteur = tenant.sector || config?.secteur || 'generaliste';

  return {
    company: tenant.name || '',
    sector: secteur,
    sector_normalise: normalizeSector(secteur),
    agent_name: extraireAgentName(prompt?.system_prompt, config?.agent_name),
    voice_id: config?.voice_id || null,
    llm_provider: config?.llm_provider || null,
    llm_model: config?.llm_model || null,
    transfer_number: config?.transfer_number || '',
    transfer_enabled: config?.transfer_enabled === 1,
    after_hours_behavior: HORS_HORAIRES.includes(config?.after_hours_behavior)
      ? config.after_hours_behavior
      : 'message',
    horaires: parseHoraires(tenant.horaires),
    phone: tenant.phone || '',
    address: tenant.address || '',
    // Le magic moment (QW8) : l'appelant est reconnu par son numero verifie.
    // Sans verification, la page doit renvoyer vers la verification plutot que
    // d'afficher un numero qui ne reconnaitra personne.
    phone_verified: user?.phone_verified === 1,
    user_phone: user?.phone || '',
    trial_phone: env.TRIAL_PHONE_NUMBER || '',
    // Repliques des conversations temoins, declinees par metier.
    scenarios: getScenarios(secteur),
    prompt: prompt ? { id: prompt.id, version: prompt.version } : null,
    // Un prompt non conforme sera regenere a la premiere sauvegarde, meme si
    // le client ne change rien d'autre.
    prompt_conforme: prompt ? isPromptCompliant(prompt.system_prompt) : false,
  };
}

async function lireConfig(env, tenant, user) {
  return successResponse(await construireConfig(env, tenant, user));
}

async function ecrireConfig(request, env, tenant, user) {
  const body = await request.json().catch(() => ({}));
  const { config, prompt } = await chargerEtat(env, tenant.id);

  const secteur = tenant.sector || config?.secteur || 'generaliste';
  const avant = {
    company: tenant.name || '',
    agentName: extraireAgentName(prompt?.system_prompt, config?.agent_name),
    horaires: parseHoraires(tenant.horaires),
    horsHoraires: HORS_HORAIRES.includes(config?.after_hours_behavior)
      ? config.after_hours_behavior : 'message',
  };

  // ── Validation ──
  const company = body.company !== undefined ? String(body.company).trim() : avant.company;
  if (body.company !== undefined && !company) {
    return errorResponse('Le nom de l\'entreprise ne peut pas être vide', 400);
  }

  const agentName = body.agent_name !== undefined
    ? String(body.agent_name).trim() : avant.agentName;
  if (body.agent_name !== undefined && !agentName) {
    return errorResponse('Le prénom de l\'assistant ne peut pas être vide', 400);
  }
  // Le prenom part dans le prompt : une virgule y casserait la regex de
  // relecture, et une phrase entiere serait prononcee comme un nom.
  if (agentName.length > 40 || agentName.includes(',')) {
    return errorResponse('Prénom invalide (40 caractères maximum, sans virgule)', 400);
  }

  const horsHoraires = body.after_hours_behavior !== undefined
    ? String(body.after_hours_behavior) : avant.horsHoraires;
  if (!HORS_HORAIRES.includes(horsHoraires)) {
    return errorResponse(`Comportement hors horaires inconnu (${HORS_HORAIRES.join(' | ')})`, 400);
  }

  // Le DIMANCHE n'est pas affiche par la page (6 jours, lun-sam, fidelite a la
  // maquette). Sa valeur en base est donc REPORTEE telle quelle : un tenant
  // ouvert le dimanche ne doit pas se retrouver ferme parce qu'un ecran ne
  // montrait pas ce jour-la.
  //
  // ⚠️ On ne reporte le dimanche QUE s'il est absent du corps. Reporter
  // systematiquement rendait ce jour immodifiable par cette route : meme un
  // appelant qui l'envoyait explicitement se voyait rendre l'ancienne valeur,
  // sans erreur ni trace. Constate en recette le 12/08.
  let horaires = avant.horaires;
  if (body.horaires !== undefined) {
    const recus = parseHoraires(body.horaires);
    const dimFourni = body.horaires
      && typeof body.horaires === 'object'
      && Object.prototype.hasOwnProperty.call(body.horaires, 'dim');
    horaires = {
      ...recus,
      dim: dimFourni ? recus.dim : (avant.horaires?.dim ?? recus.dim),
    };
  }

  // ── Ecritures ──
  const majTenant = [];
  const valTenant = [];
  if (body.company !== undefined) { majTenant.push('name = ?'); valTenant.push(company); }
  if (body.horaires !== undefined) {
    majTenant.push('horaires = ?'); valTenant.push(JSON.stringify(horaires));
  }
  if (majTenant.length) {
    majTenant.push("updated_at = datetime('now')");
    await env.DB.prepare(
      `UPDATE tenants SET ${majTenant.join(', ')} WHERE id = ?`,
    ).bind(...valTenant, tenant.id).run();
  }
  if (body.horaires !== undefined) {
    // SSOT horaires : availability_slots est le maitre, tenants.horaires le
    // cache. Les desynchroniser, c'est proposer des creneaux que l'agent
    // annonce comme fermes.
    await syncHorairesToSlots(env, tenant.id, horaires);
  }

  await env.DB.prepare(`
    INSERT INTO voixia_configs (tenant_id, secteur, agent_name, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(tenant_id) DO UPDATE SET
      agent_name = excluded.agent_name,
      updated_at = datetime('now')
  `).bind(tenant.id, normalizeSector(secteur), agentName).run();

  await env.DB.prepare(`
    UPDATE voixia_configs SET
      voice_id = COALESCE(?, voice_id),
      transfer_number = COALESCE(?, transfer_number),
      transfer_enabled = COALESCE(?, transfer_enabled),
      after_hours_behavior = ?,
      updated_at = datetime('now')
    WHERE tenant_id = ?
  `).bind(
    body.voice_id !== undefined ? String(body.voice_id) : null,
    body.transfer_number !== undefined ? String(body.transfer_number).trim() : null,
    body.transfer_enabled !== undefined ? (body.transfer_enabled ? 1 : 0) : null,
    horsHoraires,
    tenant.id,
  ).run();

  // ── Prompt ──
  // On REGENERE toujours (regle 6bis : jamais de retouche a la chaine), puis on
  // ne versionne QUE si le texte a reellement change.
  //
  // Sans cette comparaison, enregistrer apres avoir seulement touche aux
  // horaires creait une version a chaque clic pour un texte identique : le
  // gabarit sectoriel ne porte pas {HORAIRES} — l'agent obtient les horaires par
  // search_knowledge, pas par son prompt. L'historique se serait rempli de
  // versions vides, et « Restaurer » aurait propose des etats indiscernables.
  const systemPrompt = buildSectorPrompt({
    secteur,
    agentName,
    companyName: company,
    horaires: horairesEnTexte(horaires),
    telephone: tenant.phone || '',
    horsHoraires,
  });

  const doitRegenerer = !prompt
    || !isPromptCompliant(prompt.system_prompt)
    || prompt.system_prompt !== systemPrompt;

  let nouveauPrompt = null;
  if (doitRegenerer) {
    const canal = prompt?.canal || 'voice';
    const secteurPrompt = normalizeSector(secteur);
    const derniere = await env.DB.prepare(`
      SELECT MAX(version) AS v FROM ai_prompt_versions
       WHERE tenant_id = ? AND secteur = ? AND canal = ?
    `).bind(tenant.id, secteurPrompt, canal).first();

    const insertion = await env.DB.prepare(`
      INSERT INTO ai_prompt_versions
        (tenant_id, canal, secteur, version, system_prompt, is_active, notes)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).bind(
      tenant.id, canal, secteurPrompt, (derniere?.v || 0) + 1, systemPrompt,
      'Mon Assistant',
    ).run();

    const promptId = insertion.meta?.last_row_id;

    // UN SEUL is_active = 1 par tenant (CLAUDE.md § f) : on desactive tout,
    // puis on active. Dans cet ordre — l'inverse laisserait deux actifs si la
    // seconde requete echouait.
    await env.DB.prepare('UPDATE ai_prompt_versions SET is_active = 0 WHERE tenant_id = ?')
      .bind(tenant.id).run();
    await env.DB.prepare(
      "UPDATE ai_prompt_versions SET is_active = 1, activated_at = datetime('now') WHERE id = ?",
    ).bind(promptId).run();
    await env.DB.prepare(
      "UPDATE voixia_configs SET active_prompt_id = ?, updated_at = datetime('now') WHERE tenant_id = ?",
    ).bind(promptId, tenant.id).run();

    nouveauPrompt = { id: promptId, version: (derniere?.v || 0) + 1 };
    logger.info('[Assistant] Prompt régénéré', {
      tenantId: tenant.id, promptId, agentName, horsHoraires,
    });
  }

  // On relit l'etat REEL depuis la base plutot que de renvoyer ce qu'on croit
  // avoir ecrit : c'est ce que la page reaffichera, et donc ce qui doit etre
  // vrai. Le tenant en memoire est rafraichi des deux champs qu'on vient de
  // modifier, le reste est relu.
  const apres = await construireConfig(
    env,
    { ...tenant, name: company, horaires: JSON.stringify(horaires) },
    user,
  );
  return successResponse({ ...apres, prompt_regenere: !!nouveauPrompt });
}

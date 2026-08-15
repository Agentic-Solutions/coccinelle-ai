// Page « Mes communications » (chantier CX-3) — ce qui est REELLEMENT parti.
//
// GET /api/v1/communications        les messages envoyes et recus, contenu reel
// GET /api/v1/communications/frise  un message par etape du voyage client
//
// POURQUOI CETTE ROUTE EXISTE
// « Mon activite » ne montrait que les appels. Les SMS partaient — devis,
// confirmations, rappels J-1 — et n'apparaissaient nulle part : le commercant ne
// voyait pas la moitie de ce que son assistant faisait pour lui.
//
// ELLE NE LIT QUE DU REEL. Aucun gabarit, aucun exemple, aucun compteur calcule
// autrement qu'en comptant des lignes. Une etape sans message dit « aucun encore
// envoye » — c'est une information, pas un vide a meubler avec un specimen.
//
// DEUX SOURCES, PARCE QU'IL Y EN A DEUX
//   SMS      → omni_messages (via shared/sms-envoi.js), joint a
//              omni_conversations pour le tenant et le contact ;
//   E-mail   → channel_messages_log (via modules/email/routes.js).
// Les unifier dans une table de plus aurait ete un troisieme endroit ou la
// verite peut diverger. On lit les deux et on les fond a la lecture.

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import * as auth from '../auth/helpers.js';
import { TYPES_SMS } from '../shared/sms-booking-link.js';

/**
 * Etapes du voyage client, dans l'ordre de la maquette.
 *
 * `types` liste les valeurs de `omni_messages.message_type` qui atterrissent a
 * cette etape. Elles viennent de TYPES_SMS — la nomenclature n'est pas
 * redefinie ici, elle est REUTILISEE : un type ajoute la-bas et oublie ici
 * tombe dans « autres », visible, plutot que d'etre avale.
 */
const ETAPES = [
  {
    cle: 'apres_appel',
    titre: 'Après son appel',
    quand: 'SMS · immédiat',
    // Le devis passe en `information` : l'outil Python n'envoie pas de type
    // (voixia/agent/tools/messaging.py). `devis`/`tarif` sont acceptes d'avance,
    // pour le jour ou il en passera un.
    types: ['information', 'devis', 'tarif', 'horaires', 'suivi_appel', 'rappel_conseiller'],
  },
  {
    cle: 'reservation',
    titre: 'Quand il réserve',
    quand: 'SMS · à la réservation',
    types: ['confirmation_rdv'],
  },
  {
    cle: 'veille',
    titre: 'La veille du rendez-vous',
    quand: 'SMS · 24 h avant',
    types: ['rappel_rdv'],
  },
  {
    cle: 'annulation',
    titre: 'Si le rendez-vous est annulé',
    quand: 'SMS · à l\'annulation',
    types: ['annulation_rdv'],
  },
  {
    cle: 'ecrit',
    titre: 'S\'il écrit',
    quand: 'SMS · réponse de l\'assistant',
    types: ['reponse_sms'],
  },
  {
    cle: 'relance',
    titre: 'Quand vous le relancez',
    quand: 'SMS · communication proactive',
    types: ['prospection', 'manuel'],
  },
];

/** Etape d'un type donne, ou null. */
function etapeDuType(type) {
  if (!type) return null;
  const e = ETAPES.find((x) => x.types.includes(type));
  return e ? e.cle : null;
}

export async function handleCommunicationsRoutes(request, env, path, method) {
  if (!path.startsWith('/api/v1/communications')) return null;

  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) return errorResponse(authResult.error, authResult.status);
  const { tenant } = authResult;

  try {
    if (path === '/api/v1/communications' && method === 'GET') {
      return await listerMessages(request, env, tenant);
    }
    if (path === '/api/v1/communications/frise' && method === 'GET') {
      return await construireFrise(env, tenant);
    }
    return null;
  } catch (error) {
    logger.error('Communications error', { error: error.message, path });
    return errorResponse('Erreur lors de la lecture des communications', 500);
  }
}

/**
 * Les messages, tous canaux, du plus recent au plus ancien.
 *
 * `?canal=sms|email` filtre. `?limite=` plafonne a 200 — au-dela, c'est une
 * page d'analytics qu'il faut, pas une liste.
 */
async function listerMessages(request, env, tenant) {
  const url = new URL(request.url);
  const canal = url.searchParams.get('canal');
  const limite = Math.min(parseInt(url.searchParams.get('limite'), 10) || 50, 200);

  const messages = [];

  // ── SMS (et tout ce que omni_messages porte : le canal est une colonne) ──
  if (!canal || canal === 'sms') {
    const sms = await env.DB.prepare(`
      SELECT m.id, m.channel, m.direction, m.content, m.message_type,
             m.message_sid, m.created_at,
             c.client_phone, c.client_name
        FROM omni_messages m
        JOIN omni_conversations c ON c.id = m.conversation_id
       WHERE c.tenant_id = ? AND m.channel = 'sms'
       ORDER BY m.created_at DESC
       LIMIT ?
    `).bind(tenant.id, limite).all();

    for (const m of (sms.results || [])) {
      messages.push({
        id: m.id,
        canal: 'sms',
        sens: m.direction === 'inbound' ? 'recu' : 'envoye',
        contenu: m.content,
        type: m.message_type || null,
        etape: etapeDuType(m.message_type),
        contact: m.client_name || null,
        adresse: m.client_phone || null,
        date: m.created_at,
      });
    }
  }

  // ── E-mails sortants ──
  // `channel_messages_log` n'a PAS de colonne `direction` : elle ne journalise
  // que les envois. On ne fabrique donc pas de « recu » a partir d'elle. Les
  // e-mails ENTRANTS vivent dans omni_messages (channel='email'), ecrits par
  // modules/email/inbound.js — ils sont relus juste apres.
  if (!canal || canal === 'email') {
    const envoyes = await env.DB.prepare(`
      SELECT id, to_address, subject, content, status, sent_at, created_at
        FROM channel_messages_log
       WHERE tenant_id = ? AND channel_type = 'email'
       ORDER BY COALESCE(sent_at, created_at) DESC
       LIMIT ?
    `).bind(tenant.id, limite).all();

    for (const e of (envoyes.results || [])) {
      messages.push({
        id: e.id,
        canal: 'email',
        sens: 'envoye',
        contenu: e.content,
        objet: e.subject || null,
        // Le statut est journalise : on le rapporte tel quel plutot que de
        // presenter un envoi echoue comme un envoi.
        statut: e.status || null,
        type: null,
        etape: null,
        contact: null,
        adresse: e.to_address || null,
        date: e.sent_at || e.created_at,
      });
    }

    const recus = await env.DB.prepare(`
      SELECT m.id, m.content, m.created_at, c.client_email, c.client_name
        FROM omni_messages m
        JOIN omni_conversations c ON c.id = m.conversation_id
       WHERE c.tenant_id = ? AND m.channel = 'email' AND m.direction = 'inbound'
       ORDER BY m.created_at DESC
       LIMIT ?
    `).bind(tenant.id, limite).all();

    for (const e of (recus.results || [])) {
      messages.push({
        id: e.id,
        canal: 'email',
        sens: 'recu',
        contenu: e.content,
        type: null,
        etape: null,
        contact: e.client_name || null,
        adresse: e.client_email || null,
        date: e.created_at,
      });
    }
  }

  messages.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return successResponse({
    messages: messages.slice(0, limite),
    // Comptes REELS, sur ce qui vient d'etre lu — pas une estimation.
    total: messages.length,
    par_canal: {
      sms: messages.filter((m) => m.canal === 'sms').length,
      email: messages.filter((m) => m.canal === 'email').length,
    },
  });
}

/**
 * La frise : pour chaque etape du voyage, le DERNIER message reellement parti.
 *
 * Une etape sans message renvoie `message: null`. Le front affiche alors
 * « aucun encore envoyé » — jamais un specimen : un exemple a cet endroit se
 * lirait comme un message deja envoye au client.
 */
async function construireFrise(env, tenant) {
  // Une seule requete : le dernier message sortant par type, puis on range.
  // Le GROUP BY ne suffit pas en SQLite pour « la ligne du max » sans sous-
  // requete ; le volume par tenant est faible (quelques centaines au plus),
  // donc on lit et on filtre en memoire — plus lisible qu'une fenetre SQL.
  const sms = await env.DB.prepare(`
    SELECT m.content, m.message_type, m.created_at, c.client_phone, c.client_name
      FROM omni_messages m
      JOIN omni_conversations c ON c.id = m.conversation_id
     WHERE c.tenant_id = ? AND m.channel = 'sms' AND m.direction = 'outbound'
       AND m.message_type IS NOT NULL
     ORDER BY m.created_at DESC
     LIMIT 200
  `).bind(tenant.id).all();

  const etapes = ETAPES.map((e) => {
    const trouve = (sms.results || []).find((m) => e.types.includes(m.message_type));
    return {
      cle: e.cle,
      titre: e.titre,
      quand: e.quand,
      message: trouve
        ? {
            contenu: trouve.content,
            type: trouve.message_type,
            date: trouve.created_at,
            contact: trouve.client_name || null,
            adresse: trouve.client_phone || null,
          }
        : null,
    };
  });

  // ── Le dernier e-mail parti ──
  // Etage a part : il ne vient pas de la meme table, et il n'a pas de type.
  const email = await env.DB.prepare(`
    SELECT to_address, subject, content, status, COALESCE(sent_at, created_at) AS date
      FROM channel_messages_log
     WHERE tenant_id = ? AND channel_type = 'email'
     ORDER BY COALESCE(sent_at, created_at) DESC
     LIMIT 1
  `).bind(tenant.id).first();

  return successResponse({
    etapes,
    email: email
      ? {
          contenu: email.content,
          objet: email.subject || null,
          statut: email.status || null,
          adresse: email.to_address || null,
          date: email.date,
        }
      : null,
    // Utile au front pour ne proposer que des types qui existent vraiment.
    types_connus: Object.keys(TYPES_SMS),
  });
}

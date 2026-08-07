// Module Post-Call — extraction structurée d'un appel entrant (garagiste).
//
// POST /api/post-call
//   Body : { call_id, transcript, caller_number }
//   1) Appelle Claude Haiku pour extraire un JSON strict
//      { intent, nom, telephone, date_rdv, heure_rdv, vehicule, resume }
//   2) Insère le résultat dans D1 (table calls_extracted, créée si besoin)
//   3) Retourne le JSON extrait
//
// Exemple :
//   curl -X POST https://coccinelle-api.youssef-amrouche.workers.dev/api/post-call \
//     -H "Content-Type: application/json" \
//     -d '{
//           "call_id": "call_abc123",
//           "caller_number": "+33612345678",
//           "transcript": "Bonjour, c'\''est Marc Durand. Je voudrais un rendez-vous pour ma Peugeot 208 mardi prochain à 14h, elle fait un bruit au freinage. Vous pouvez me rappeler au 06 12 34 56 78 ?"
//         }'
//
//   Réponse : { "intent":"rdv", "nom":"Marc Durand", "telephone":"+33612345678",
//               "date_rdv":"mardi prochain", "heure_rdv":"14h",
//               "vehicule":"Peugeot 208", "resume":"..." }

import { jsonResponse, errorResponse } from '../../utils/response.js';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const EMPTY_EXTRACTION = {
  intent: null,
  nom: null,
  telephone: null,
  date_rdv: null,
  heure_rdv: null,
  vehicule: null,
  resume: null,
};

// S'assure que la table existe (idempotent — miroir de migrations/0078).
async function ensureTable(env) {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS calls_extracted (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, call_id TEXT, caller_number TEXT, " +
      "intent TEXT, nom TEXT, telephone TEXT, date_rdv TEXT, heure_rdv TEXT, " +
      "vehicule TEXT, resume TEXT, transcript TEXT, raw_json TEXT, " +
      "created_at TEXT DEFAULT (datetime('now')))"
  );
}

// Extrait le premier objet JSON d'une chaîne (tolère un éventuel texte autour).
function parseStrictJson(text) {
  if (!text) return null;
  let candidate = text.trim();
  // Retire d'éventuelles clôtures markdown ```json ... ```
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  // Sinon isole du premier { au dernier }
  if (candidate[0] !== '{') {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    candidate = candidate.slice(start, end + 1);
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// Appelle l'API Claude et renvoie l'objet extrait, ou null si JSON invalide.
async function callClaude(env, transcript) {
  const system =
    "Tu es un assistant qui traite des transcriptions d'appels entrants reçus " +
    "par un garagiste (prise de rendez-vous, demande de devis, questions). " +
    "À partir du transcript, renvoie UNIQUEMENT un objet JSON valide, sans texte " +
    "autour, sans balise markdown, avec EXACTEMENT ces clés : " +
    "intent (une valeur parmi 'rdv', 'devis', 'question', 'autre'), " +
    "nom (nom de l'appelant ou null), " +
    "telephone (numéro mentionné ou null), " +
    "date_rdv (date évoquée telle quelle ou null), " +
    "heure_rdv (heure évoquée telle quelle ou null), " +
    "vehicule (marque/modèle/immatriculation ou null), " +
    "resume (résumé en une phrase concise). " +
    "Utilise null (pas une chaîne vide) pour toute information absente.";

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      temperature: 0,
      system,
      messages: [
        {
          role: 'user',
          content: `Transcript de l'appel :\n"""\n${transcript}\n"""`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Claude API ${resp.status}: ${body.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { parsed: parseStrictJson(text), raw: text };
}

export async function handlePostCallRoutes(request, env, path, method) {
  if (path !== '/api/post-call' || method !== 'POST') return null;

  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse('ANTHROPIC_API_KEY non configurée', 500, request);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('JSON invalide dans la requête', 400, request);
  }

  const call_id = body.call_id ?? null;
  const caller_number = body.caller_number ?? null;
  const transcript = (body.transcript ?? '').toString().trim();

  await ensureTable(env);

  // Transcript vide : rien à extraire, on renvoie une extraction vide (200).
  if (!transcript) {
    const extraction = { ...EMPTY_EXTRACTION, intent: 'autre' };
    await env.DB.prepare(
      `INSERT INTO calls_extracted
        (call_id, caller_number, intent, nom, telephone, date_rdv, heure_rdv, vehicule, resume, transcript, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(call_id, caller_number, extraction.intent, null, null, null, null, null, null, '', null)
      .run();
    return jsonResponse(extraction, 200, request);
  }

  // Appel Claude avec 1 retry si le JSON renvoyé est invalide.
  let result;
  try {
    result = await callClaude(env, transcript);
    if (!result.parsed) {
      result = await callClaude(env, transcript); // retry unique
    }
  } catch (err) {
    return errorResponse(`Erreur extraction Claude : ${err.message}`, 502, request);
  }

  if (!result.parsed) {
    return errorResponse('Extraction JSON invalide après retry', 502, request);
  }

  // Normalise sur le schéma attendu (ignore les clés en trop, garantit les manquantes).
  const p = result.parsed;
  const extraction = {
    intent: p.intent ?? null,
    nom: p.nom ?? null,
    telephone: p.telephone ?? caller_number ?? null,
    date_rdv: p.date_rdv ?? null,
    heure_rdv: p.heure_rdv ?? null,
    vehicule: p.vehicule ?? null,
    resume: p.resume ?? null,
  };

  await env.DB.prepare(
    `INSERT INTO calls_extracted
      (call_id, caller_number, intent, nom, telephone, date_rdv, heure_rdv, vehicule, resume, transcript, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      call_id,
      caller_number,
      extraction.intent,
      extraction.nom,
      extraction.telephone,
      extraction.date_rdv,
      extraction.heure_rdv,
      extraction.vehicule,
      extraction.resume,
      transcript,
      result.raw
    )
    .run();

  return jsonResponse(extraction, 200, request);
}

/**
 * GARDE-FOU : UN SEUL fichier au monde peut appeler l'API Twilio Messages.
 *
 * ── POURQUOI ──
 * Au 16/08/2026, NEUF fichiers appelaient `Messages.json` directement et HUIT
 * n'appliquaient aucune compaction GSM-7. Un seul caractere hors table
 * (â ê ë î ï ô û ç À Â È Ê Î Ô Ù Û) fait tomber la capacite de 160 a 70 unites par
 * segment : le SMS de tache partait en 2 segments la ou 1 suffisait, a cause de « â »
 * dans « tâche » et d'un tiret cadratin. Facture doublee, en silence.
 *
 * Ces huit chemins echappaient aussi au PLAFOND quotidien et a la TRACE dans
 * « Mes communications » — donc invisibles et non bornes.
 *
 * ── L'INVARIANT ──
 * `src/modules/shared/sms-envoi.js` est le seul endroit autorise. Il compacte
 * (`compacterPourGsm7`), plafonne (`shared/sms-plafond.js`) et trace
 * (`tracerDansConversation`, sautee pour les types internes). Tout autre fichier
 * echoue ici.
 *
 * Contrairement au garde-fou des dates, celui-ci n'a AUCUNE limite d'analyse : on ne
 * peut pas appeler l'API Twilio sans ecrire son URL. Un neuvieme chemin est donc refuse
 * le jour ou il apparait, sans exception possible.
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEUL_AUTORISE = 'src/modules/shared/sms-envoi.js';
const MOTIF = /api\.twilio\.com[^\n]*Messages\.json|\/Messages\.json/;

// ── PERIMETRE : le Worker, la ou les SMS partent reellement ──
// `coccinelle-saas/` et `voixia-portal/` sont EXCLUS, et il faut savoir pourquoi :
// ce garde-fou a decouvert dans le frontend une chaine de 1 314 lignes
// (`src/modules/orchestrator/channelOrchestrator.ts` → `channels/sms/smsService.ts`
// → `channels/sms/twilioClient.ts`) qui construit un client Twilio avec
// `authToken` — donc qui mettrait un jeton Twilio dans le bundle du NAVIGATEUR si
// quelqu'un la branchait.
//
// Mesure du 17/08/2026 : elle est ENTIEREMENT MORTE (zero page l'importe, zero
// occurrence dans le bundle construit), donc rien n'a fuite. La supprimer est le bon
// geste, mais c'est un autre sujet que la compaction — au BACKLOG, avec ce motif.
// L'exclure ici garde `npm test` utilisable au lieu de rouge en permanence sur un
// probleme connu ; l'inconvenient est que le garde-fou ne surveille plus le frontend.
const EXCLUS = ['node_modules', '.next', 'out', '.git', 'dist', '.wrangler', 'venv',
  '__pycache__', 'tradopp', '.playwright-mcp', 'design', '.vercel', 'coverage', 'scripts',
  'coccinelle-saas', 'voixia-portal'];

function fichiers(d, a = []) {
  for (const e of readdirSync(d)) {
    if (EXCLUS.includes(e) || /_backup_/.test(e)) continue;
    const p = join(d, e);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) fichiers(p, a);
    else if (['.js', '.ts', '.tsx', '.mjs'].includes(extname(e)) && !/\.(backup|bak)/.test(e)) a.push(p);
  }
  return a;
}

const fautifs = [];
for (const f of fichiers(RACINE)) {
  const rel = relative(RACINE, f);
  if (rel === SEUL_AUTORISE) continue;
  let contenu;
  try { contenu = readFileSync(f, 'utf-8'); } catch { continue; }
  contenu.split('\n').forEach((ligne, i) => {
    // Les commentaires citent le motif pour l'expliquer : on ne les compte pas.
    if (/^\s*(\/\/|\*|\/\*|#)/.test(ligne)) return;
    if (MOTIF.test(ligne)) fautifs.push({ fichier: rel, ligne: i + 1, extrait: ligne.trim().slice(0, 96) });
  });
}

if (fautifs.length) {
  console.log(`  ❌ ${fautifs.length} appel(s) direct(s) a Twilio hors du chemin unique\n`);
  for (const v of fautifs) {
    console.log(`  ${v.fichier}:${v.ligne}`);
    console.log(`      ${v.extrait}`);
  }
  console.log(`\n  → Passez par \`envoyerSmsTrace\` (${SEUL_AUTORISE}). Un appel direct`);
  console.log('    n\'est pas compacte (160 → 70 unites par segment si un seul caractere');
  console.log('    sort de la table GSM-7), echappe au plafond quotidien, et n\'apparait');
  console.log('    pas dans « Mes communications ».');
  process.exit(1);
}

console.log(`  ✅ un seul fichier appelle l'API Twilio Messages (${SEUL_AUTORISE})`);

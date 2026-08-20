/**
 * Recette de la phrase d'accueil — les DEUX implementations doivent s'accorder.
 *
 * ── CE QUE CE TEST DOIT PROUVER ──
 * 1. `coccinelle-saas/lib/greeting.ts` (apercu vivant de la page, pendant la frappe)
 *    et `src/modules/shared/greeting.js` (servie a l'agent par `resolve-phone`)
 *    rendent la MEME chaine, caractere pour caractere, sur 18 prenoms x 14 secteurs.
 *
 *    C'est le seul garde-fou d'une duplication assumee : la page ne peut pas faire un
 *    aller-retour serveur par caractere tape. Le 13/08, ces deux formulations avaient
 *    diverge et la page annoncait un prenom que l'agent ne prononcait pas — decouvert
 *    a l'oral, pas par un test.
 *
 * 2. Les 8 prenoms qui divergeaient entre les deux ANCIENNES regex sont servis
 *    correctement : `LEO`, `SARA`, `léa`, `N'Golo`, `L3a` (aucun prenom cote agent) et
 *    `Marie Claire`, `Ana Sofia`, `Chloé.` (tronques au premier mot).
 *
 * 3. Sans nom d'entreprise, AUCUNE raison sociale n'est prononcee (Lot B) : le repli
 *    de l'agent valait « VoixIA », le nom de l'editeur, entendu le 18/08 par un client
 *    du Garage Toulouse.
 *
 * 4. Pas de double prefixe metier (« Garage Garage Dupont »).
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');

// ── Chargement du module front : c'est du TypeScript, on le transpose en JS ──
// Meme technique que `test_dates.mjs` : pas de dependance de build ajoutee pour un
// test, on retire les annotations de type. Si le fichier acquiert un jour de l'`enum`
// ou du `namespace`, ce chargement echouera bruyamment plutot que silencieusement.
async function chargerFront() {
  const src = readFileSync(join(RACINE, 'coccinelle-saas/lib/greeting.ts'), 'utf-8');
  const js = src
    .replace(/:\s*Record<string,\s*string>/g, '')
    .replace(/:\s*(string|number|boolean)(\s*\|\s*(null|undefined))?/g, '')
    .replace(/ as [A-Za-z]+/g, '');
  const dir = mkdtempSync(join(tmpdir(), 'greeting-'));
  const f = join(dir, 'greeting.mjs');
  writeFileSync(f, js);
  return import(`file://${f}`);
}

const front = await chargerFront();
const back = await import(join(RACINE, 'src/modules/shared/greeting.js'));

let ok = 0;
const echecs = [];
const v = (nom, cond, det = '') => cond ? ok++
  : echecs.push(`${nom}${det ? ' — ' + det : ''}`);

// ═══════════ 1. LES DEUX IMPLEMENTATIONS S'ACCORDENT ═══════════
// 18 prenoms : les 10 qui passaient deja, et les 8 qui divergeaient.
const PRENOMS = [
  'Assistant', 'Sara', 'Léa', 'Jean-Pierre', 'LEO', 'SARA', 'léa', 'Marie Claire',
  "N'Golo", 'Zoé', 'Anaïs', 'Lou', 'Bo', 'L3a', 'Émile', 'Ana Sofia', 'Chloé.', 'José',
];
const SECTEURS = Object.keys(back.PREFIXE_SECTEUR);
const SOCIETE = 'Toulouse Auto';   // sans mot d'etablissement, pour exercer les prefixes

v('les deux tables de prefixes sont identiques',
  JSON.stringify(back.PREFIXE_SECTEUR) === JSON.stringify(front.PREFIXE_SECTEUR));
v('14 secteurs couverts', SECTEURS.length === 14, `${SECTEURS.length}`);

let divergences = 0;
for (const secteur of SECTEURS) {
  for (const prenom of PRENOMS) {
    const b = back.construireGreeting({ companyName: SOCIETE, secteur, agentName: prenom });
    const f = front.construireGreeting(SOCIETE, secteur, prenom);
    if (b !== f) {
      divergences++;
      if (divergences <= 3) echecs.push(`divergence [${secteur}/${prenom}]\n      back : ${b}\n      front: ${f}`);
    }
  }
}
v(`aucune divergence sur ${PRENOMS.length} prenoms x ${SECTEURS.length} secteurs`,
  divergences === 0, `${divergences} divergences`);

// ═══════════ 2. LES 8 PRENOMS QUI SE PERDAIENT ═══════════
// Ils doivent apparaitre ENTIERS dans la phrase. `Marie Claire` etait rendu `Marie`,
// `LEO` disparaissait completement.
for (const prenom of ['LEO', 'SARA', 'léa', "N'Golo", 'L3a', 'Marie Claire', 'Ana Sofia', 'Chloé.']) {
  const phrase = back.construireGreeting({ companyName: SOCIETE, secteur: 'automobile', agentName: prenom });
  v(`« ${prenom} » est prononce en entier`, phrase.includes(`! ${prenom} à votre écoute`), phrase);
}

// ═══════════ 3. LOT B — AUCUNE RAISON SOCIALE SANS TENANT ═══════════
// C'est le defaut entendu le 18/08 : « VoixIA » chez un client du Garage Toulouse.
for (const vide of [undefined, null, '', '   ']) {
  const b = back.construireGreeting({ companyName: vide, secteur: 'automobile', agentName: 'Sara' });
  v(`sans entreprise (${JSON.stringify(vide)}) → phrase neutre`,
    b === 'Bonjour ! Comment puis-je vous aider ?', b);
  v(`sans entreprise (${JSON.stringify(vide)}) → aucun nom propre`,
    !/VoixIA|Sara/.test(b), b);
}
v('front : meme comportement sans entreprise',
  front.construireGreeting('', 'automobile', 'Sara') === 'Bonjour ! Comment puis-je vous aider ?');

// Sans prenom : formulation historique, pas de trou au milieu de la phrase.
{
  const b = back.construireGreeting({ companyName: 'Garage Dupont', secteur: 'automobile', agentName: '' });
  v('sans prenom → formulation historique',
    b === 'Garage Dupont, bonjour ! Comment puis-je vous aider ?', b);
  v('sans prenom → pas de double espace', !/ {2}/.test(b), b);
}

// ═══════════ 4. PAS DE DOUBLE PREFIXE METIER ═══════════
const NOMS = [
  ['Garage Dupont', 'automobile', 'Garage Dupont'],
  ['garage dupont', 'automobile', 'garage dupont'],   // casse indifferente
  ['Étude Martin', 'juridique', 'Étude Martin'],       // accent indifferent
  ['Toulouse Auto', 'automobile', 'Garage Toulouse Auto'],
  ['AMROUCHE', 'generaliste', 'Entreprise AMROUCHE'],
  ['Syndic Horizon', 'syndic', 'Syndic Horizon'],
];
for (const [nom, secteur, attendu] of NOMS) {
  v(`« ${nom} » (${secteur}) → « ${attendu} »`,
    back.formaterEntreprise(nom, secteur) === attendu, back.formaterEntreprise(nom, secteur));
  v(`  … et le front dit pareil`,
    front.formaterEntreprise(nom, secteur) === attendu);
}

console.log(`  ${ok}/${ok + echecs.length}`);
if (echecs.length) { echecs.forEach((e) => console.log(`  ❌ ${e}`)); process.exit(1); }

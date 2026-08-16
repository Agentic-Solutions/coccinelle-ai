/**
 * Recette des dates naives — a executer sous PLUSIEURS fuseaux.
 *
 *   for z in Europe/Paris UTC America/New_York Pacific/Auckland; do
 *     TZ=$z node scripts/test_dates.mjs || exit 1
 *   done
 *
 * `npm test` a la racine le fait pour vous.
 *
 * ── CE QUE CE TEST DOIT PROUVER ──
 * 1. Un rendez-vous de 14h30 s'affiche 14h30 depuis N'IMPORTE QUEL fuseau.
 * 2. Le jour de la semaine ne depend pas du fuseau.
 * 3. « A venir ? » rend le meme verdict partout, pour un « maintenant » fixe.
 * 4. Les DEUX implementations (front TS, back JS) s'accordent sur les memes cas.
 * 5. ⚠️ LE CONTROLE NEGATIF : l'ancien chemin (`timeZone` sur une date naive) doit
 *    ECHOUER sous TZ=UTC. Sans lui, je ne saurais pas si ce test est capable de voir
 *    le defaut — lecon du test des rappels J-1, qui etait passe DEUX FOIS sur du
 *    code casse parce qu'il appliquait de lui-meme la condition qu'il pretendait
 *    verifier.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const TZ = process.env.TZ || '(systeme)';

let ok = 0;
const echecs = [];
const v = (nom, cond, detail = '') => {
  if (cond) { ok++; return; }
  echecs.push(`${nom}${detail ? ' — ' + detail : ''}`);
};

// ── Chargement du module front : c'est du TypeScript, on le transpose en JS ──
// Pas de dependance de build ajoutee pour un test : on retire les annotations de
// type, qui sont les seules constructions TS de ce fichier. Si `lib/dates.ts`
// acquiert un jour de l'`enum` ou du `namespace`, ce chargement echouera bruyamment
// plutot que silencieusement — c'est voulu.
async function chargerFront() {
  const src = readFileSync(join(RACINE, 'coccinelle-saas/lib/dates.ts'), 'utf-8');
  const js = src
    .replace(/^export interface [\s\S]*?^}$/gm, '')          // interfaces
    .replace(/:\s*(string|number|boolean|DateNaive|Date)(\s*\|\s*(null|undefined|string|number))*(\s*\[\])?/g, '')
    .replace(/<[A-Za-z, ]+>(?=\()/g, '')                      // generiques d'appel
    .replace(/ as [A-Za-z]+/g, '');
  const dir = mkdtempSync(join(tmpdir(), 'dates-'));
  const f = join(dir, 'dates.mjs');
  writeFileSync(f, js);
  return import(`file://${f}`);
}

const front = await chargerFront();
const back = await import(join(RACINE, 'src/modules/shared/dates.js'));

// ═══════════════ 1. L'HEURE MURALE EST PRESERVEE ═══════════════
{
  const cas = [
    ['2026-08-17T14:30:00', '14:30'],
    ['2026-01-05T08:00:00', '08:00'],   // hiver : pas de decalage saisonnier
    ['2026-07-14T23:59:00', '23:59'],
    ['2026-12-31T00:00:00', '00:00'],
    ['2026-08-17 14:30:00', '14:30'],   // separateur espace
    ['2026-08-17T14:30', '14:30'],      // sans secondes
  ];
  for (const [entree, attendu] of cas) {
    v(`heure de ${entree}`, front.formaterHeureNaive(entree) === attendu,
      `rendu ${front.formaterHeureNaive(entree)}`);
  }
  v('date longue', front.formaterDateLongue('2026-08-17T14:30:00').includes('17'),
    front.formaterDateLongue('2026-08-17T14:30:00'));
  v('date longue = un lundi', front.formaterDateLongue('2026-08-17T14:30:00').startsWith('lundi'),
    front.formaterDateLongue('2026-08-17T14:30:00'));
  v('date courte', front.formaterDateNaive('2026-08-17T14:30:00') === '17/08/2026',
    front.formaterDateNaive('2026-08-17T14:30:00'));
}

// ═══════════════ 2. LE JOUR DE LA SEMAINE NE DEPEND PAS DU FUSEAU ═══════════════
{
  // 17 aout 2026 = lundi. Canonique : lundi = 1, dimanche = 7.
  const attendus = {
    '2026-08-17': 1, '2026-08-18': 2, '2026-08-19': 3, '2026-08-20': 4,
    '2026-08-21': 5, '2026-08-22': 6, '2026-08-23': 7,
  };
  for (const [jour, n] of Object.entries(attendus)) {
    v(`jour canonique ${jour}`, front.jourSemaineNaive(`${jour}T10:00:00`) === n,
      `rendu ${front.jourSemaineNaive(`${jour}T10:00:00`)}, attendu ${n}`);
  }
  // Minuit et 23h59 : les bornes ou un decalage de fuseau ferait basculer le jour.
  v('minuit reste lundi', front.jourSemaineNaive('2026-08-17T00:00:00') === 1);
  v('23h59 reste lundi', front.jourSemaineNaive('2026-08-17T23:59:00') === 1);
}

// ═══════════════ 3. LES COMPARAISONS ═══════════════
{
  v('ordre chronologique',
    front.comparerNaif('2026-08-17T14:30:00', '2026-08-17T15:00:00') < 0);
  v('egalite malgre des formes differentes',
    front.comparerNaif('2026-08-17 14:30', '2026-08-17T14:30:00') === 0);
  v('minuit precede 1h', front.comparerNaif('2026-08-17T00:00:00', '2026-08-17T01:00:00') < 0);
  v('changement d\'annee', front.comparerNaif('2026-12-31T23:00:00', '2027-01-01T00:00:00') < 0);
  v('illisible = incomparable', front.comparerNaif('n\'importe quoi', '2026-08-17T14:30:00') === 0);

  // « maintenant » doit etre une chaine naive exploitable, dans le fuseau metier.
  const m = front.maintenantNaif();
  v('maintenantNaif a la forme canonique', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(m), m);
  v('maintenantNaif est relisible', front.lireDateNaive(m) !== null, m);
  // Le verdict « a venir » sur un point tres eloigne ne peut pas dependre du fuseau.
  v('2030 est a venir', front.estAVenir('2030-01-01T12:00:00') === true);
  v('2020 est passe', front.estPasse('2020-01-01T12:00:00') === true);

  v('ecart de jours', front.ecartJours('2026-08-17T23:00:00', '2026-08-18T01:00:00') === 1);
  v('ecart nul dans la journee', front.ecartJours('2026-08-17T00:10:00', '2026-08-17T23:50:00') === 0);
}

// ═══════════════ 4. LES DEUX IMPLEMENTATIONS S'ACCORDENT ═══════════════
{
  const cas = ['2026-08-17T14:30:00', '2026-01-05T08:00:00', '2026-08-23T00:00:00',
               '2026-08-17 14:30', '2026-12-31T23:59:59', 'abc', '', '2026-13-01T10:00:00'];
  for (const c of cas) {
    v(`parite jour ${JSON.stringify(c)}`,
      front.jourSemaineNaive(c) === back.jourSemaineNaive(c),
      `front=${front.jourSemaineNaive(c)} back=${back.jourSemaineNaive(c)}`);
    v(`parite normalisation ${JSON.stringify(c)}`,
      front.normaliserNaif(c) === back.normaliserNaif(c),
      `front=${front.normaliserNaif(c)} back=${back.normaliserNaif(c)}`);
    const f = front.lireDateNaive(c);
    const b = back.lireDateNaive(c);
    v(`parite lecture ${JSON.stringify(c)}`, JSON.stringify(f) === JSON.stringify(b));
  }
  v('minutes depuis minuit (back)', back.minutesDepuisMinuit('2026-08-17T14:30:00') === 870);
}

// ═══════════════ 5. LES VALEURS ABIMEES RENDENT null, PAS UNE DATE ABSURDE ══════
{
  for (const mauvais of [null, undefined, '', 'abc', '2026', '2026-13-01T10:00:00',
                         '2026-08-32T10:00:00', '2026-08-17T25:00:00', '2026-08-17T10:70:00']) {
    v(`rejet de ${JSON.stringify(mauvais)}`, front.lireDateNaive(mauvais) === null,
      JSON.stringify(front.lireDateNaive(mauvais)));
  }
  v('formatage d\'une valeur nulle = chaine vide', front.formaterHeureNaive(null) === '');
  v('formatage d\'une valeur absurde = chaine vide', front.formaterDateLongue('abc') === '');
}

// ═══════════════ 6. LE CONTROLE NEGATIF ═══════════════
// L'ANCIEN chemin doit se tromper sous TZ=UTC. Si cette assertion echoue, ce n'est
// pas le code produit qui est en cause : c'est que ce fichier de test ne saurait
// PAS detecter le defaut, et toutes les assertions ci-dessus perdent leur valeur.
{
  const S = '2026-08-17T14:30:00';
  const ancien = new Date(S).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
  const nouveau = front.formaterHeureNaive(S);
  v('le nouveau chemin rend 14:30', nouveau === '14:30', nouveau);

  if (TZ === 'UTC') {
    v('CONTROLE NEGATIF : l\'ancien chemin se trompe bien sous UTC',
      ancien !== '14:30',
      `l'ancien chemin a rendu ${ancien} — le test ne detecte plus le defaut !`);
    v('CONTROLE NEGATIF : et il rend precisement 16:30', ancien === '16:30', ancien);
  } else if (TZ === 'Europe/Paris') {
    v('sous Paris, l\'ancien chemin est juste (d\'ou l\'invisibilite du defaut)',
      ancien === '14:30', ancien);
  }
}

const total = ok + echecs.length;
if (echecs.length) {
  console.log(`  ❌ TZ=${TZ} — ${ok}/${total}`);
  echecs.forEach((e) => console.log(`      ${e}`));
  process.exit(1);
}
console.log(`  ✅ TZ=${TZ} — ${ok}/${total}`);

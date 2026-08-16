/**
 * GARDE-FOU : personne ne doit reintroduire un `timeZone` sur une date naive.
 *
 * Le defaut est apparu TROIS fois (`public/booking.js`, `cron/reminders.js`, puis
 * `modules/reminders/routes.js`) parce que la regle 10quinquies se lit de travers :
 * on a compris « `new Date()` est interdit », alors que c'est **le `timeZone` qui est
 * interdit sur une date naive**. Le test de comportement (`test_dates.mjs`) attrape
 * le defaut la ou il passe par le module ; ce fichier-ci attrape le contournement du
 * module, qui est la vraie porte d'entree.
 *
 * DEUX REGLES :
 *   A. un `timeZone` dont la valeur n'est ni `'UTC'` (qui EST le correctif) ni
 *      `FUSEAU_METIER` doit figurer dans la liste blanche ;
 *   B. aucun `new Date(<champ naif>)` hors des deux modules de dates — c'est cette
 *      regle qui rend la migration verifiable, et donc utile.
 *
 * La liste blanche est indexee par FICHIER avec un MOTIF ecrit : une exception sans
 * raison lisible finit par etre recopiee.
 *
 * ── CE QUE CE GARDE-FOU NE VOIT PAS, et il faut le savoir ──
 * La regle B ne reconnait un champ naif que s'il apparait EN CLAIR dans l'appel :
 * `new Date(a.scheduled_at)` est vu, `new Date(dt)` ou `dt` a ete affecte plus haut
 * ne l'est pas. Trois cas de ce genre existaient au 16/08/2026 (`BookingClient`,
 * `live-updates`, `communications`) et ont ete traites A LA MAIN, pas par cet outil.
 * Une analyse de flot les attraperait ; elle coute bien plus qu'elle ne rapporte ici.
 *
 * Ce garde-fou eleve donc le cout d'une rechute, il ne l'interdit pas. C'est le meme
 * aveu que pour le rate limiter en memoire : mieux vaut une limite connue qu'une
 * barriere supposee. Le test de comportement (`test_dates.mjs`, quatre fuseaux) est
 * l'autre moitie du filet — et c'est lui qui attrape les cas que celui-ci manque, DES
 * LORS que le code passe par le module.
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Les champs qui portent une heure murale, sans decalage. */
const CHAMPS_NAIFS = /scheduled_at|\.datetime\b|dateFormatted|heureFormatted/;

const LISTE_BLANCHE = {
  'coccinelle-saas/lib/dates.ts':
    "c'est le module lui-meme : il confine le seul usage legitime (timeZone 'UTC' "
    + "sur des composantes posees en UTC, ce qui est l'identite) et le seul instant "
    + 'reel (new Date() sans argument, dans maintenantNaif).',
  'src/modules/shared/dates.js':
    "pendant Worker du module ci-dessus, meme raison.",
  'src/modules/proactive/routes.js':
    "`new Date()` SANS argument = un instant reel ; lui appliquer Europe/Paris pour "
    + "connaitre l'heure locale est correct, c'est l'inverse du defaut.",
  'scripts/test_dates.mjs':
    'le controle negatif reproduit deliberement le defaut pour prouver que le test '
    + 'sait le voir.',
  'scripts/verifier-dates.mjs': 'ce fichier decrit les motifs interdits.',
};

const EXCLUS = ['node_modules', '.next', 'out', '.git', 'dist', '.wrangler', 'venv',
  '__pycache__', 'tradopp', '.playwright-mcp', 'design', 'voixia-portal',
  '.vercel', 'coverage'];
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

function fichiers(d, a = []) {
  for (const e of readdirSync(d)) {
    if (EXCLUS.includes(e)) continue;
    // Les repertoires de sauvegarde sont gitignores (`*_backup_*/`, .gitignore:47) :
    // du code non suivi qui ne partira jamais en production. Les signaler noierait
    // les vraies violations sous du bruit que personne ne corrigera.
    if (/_backup_/.test(e)) continue;
    const p = join(d, e);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) fichiers(p, a);
    else if (EXT.has(extname(e)) && !/\.(backup|bak)/.test(e)) a.push(p);
  }
  return a;
}

const violations = [];

for (const f of fichiers(RACINE)) {
  const rel = relative(RACINE, f);
  const permis = Object.prototype.hasOwnProperty.call(LISTE_BLANCHE, rel);
  let contenu;
  try { contenu = readFileSync(f, 'utf-8'); } catch { continue; }

  contenu.split('\n').forEach((ligne, i) => {
    // Les commentaires DECRIVENT souvent le defaut pour l'expliquer : on ne les
    // compte pas, sinon toute documentation du piege devient une violation.
    if (/^\s*(\/\/|\*|\/\*|#)/.test(ligne)) return;

    // ── Regle A : un timeZone autre que 'UTC' / FUSEAU_METIER ──
    const tz = ligne.match(/timeZone\s*:\s*([^,}\s]+)/);
    if (tz && !permis) {
      const valeur = tz[1].replace(/['"]/g, '');
      if (valeur !== 'UTC' && valeur !== 'FUSEAU_METIER') {
        violations.push({
          regle: 'A', fichier: rel, ligne: i + 1,
          message: `timeZone: ${tz[1]} — interdit hors de lib/dates. Sur une date naive `
            + `il DECALE l'heure (14:30 devient 16:30 depuis un Worker). Si la valeur `
            + `formatee est un instant reel (new Date() sans argument), ajoutez le `
            + `fichier a la liste blanche avec son motif.`,
          extrait: ligne.trim().slice(0, 100),
        });
      }
    }

    // ── Regle B : new Date(<champ naif>) hors des modules ──
    const nd = ligne.match(/new Date\(([^)]*)\)/);
    if (nd && !permis && CHAMPS_NAIFS.test(nd[1] || '')) {
      violations.push({
        regle: 'B', fichier: rel, ligne: i + 1,
        message: 'new Date() sur un champ naif — passez par lireDateNaive() '
          + '(lib/dates.ts cote front, shared/dates.js cote Worker). Sans cette regle, '
          + 'la source unique n\'est pas verifiable et le defaut revient.',
        extrait: ligne.trim().slice(0, 100),
      });
    }
  });
}

if (violations.length) {
  console.log(`  ❌ ${violations.length} violation(s)\n`);
  for (const v of violations) {
    console.log(`  [${v.regle}] ${v.fichier}:${v.ligne}`);
    console.log(`      ${v.extrait}`);
    console.log(`      → ${v.message}\n`);
  }
  process.exit(1);
}

const n = Object.keys(LISTE_BLANCHE).length;
console.log(`  ✅ aucune date naive formatee avec un timeZone, aucun new Date() sur un `
  + `champ naif hors module (${n} fichiers en liste blanche, chacun avec son motif)`);

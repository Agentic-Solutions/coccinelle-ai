// Recette du plafond quotidien — hors ligne, faux D1 fidele au SQL recu.
import { reserverUnite, relacherUnite, PLAFONDS_DEFAUT, ORIGINE_PUBLIQUE, ORIGINE_AUTHENTIFIEE }
  from '../src/modules/shared/sms-plafond.js';

let ok = 0; const echecs = [];
const v = (nom, cond, det='') => cond ? (ok++, console.log(`  ✅ ${nom}`))
  : (console.log(`  ❌ ${nom}${det?' — '+det:''}`), echecs.push(nom));

function faireEnv(plafondTenant = null) {
  const lignes = new Map();          // cle: tenant|jour|origine
  return { lignes, DB: { prepare(sql) { return { bind(...a) { return {
    async first() {
      if (/FROM tenants/.test(sql)) return { plafond: plafondTenant };
      if (/SELECT envoyes/.test(sql)) return lignes.get(a.join('|')) || null;
      return null;
    },
    async run() {
      if (/INSERT INTO sms_compteurs_jour/.test(sql)) {
        const [t, j, o, plafond] = a; const k = [t,j,o].join('|');
        const cur = lignes.get(k);
        if (!cur) { lignes.set(k, { envoyes: 1, alerte_envoyee_at: null }); return { meta:{changes:1} }; }
        // La condition `WHERE envoyes < ?` du ON CONFLICT, honoree telle quelle.
        if (!/WHERE envoyes < \?/.test(sql) || cur.envoyes < plafond) { cur.envoyes++; return { meta:{changes:1} }; }
        return { meta:{changes:0} };
      }
      if (/SET alerte_envoyee_at/.test(sql)) {
        const r = lignes.get(a.join('|'));
        if (r && !r.alerte_envoyee_at) { r.alerte_envoyee_at = 'x'; return { meta:{changes:1} }; }
        return { meta:{changes:0} };
      }
      if (/envoyes = MAX/.test(sql)) {
        const r = lignes.get(a.join('|')); if (r) r.envoyes = Math.max(0, r.envoyes-1);
        return { meta:{changes:1} };
      }
      return { meta:{changes:0} };
    },
  }; } }; } } };
}

console.log('══════ 1. Le plafond public borne bien a 20');
{
  const env = faireEnv();
  let autorises = 0, premier = 0;
  for (let i = 0; i < 25; i++) {
    const r = await reserverUnite(env, 't1', ORIGINE_PUBLIQUE);
    if (r.autorise) autorises++;
    if (r.premierDepassement) premier++;
  }
  v(`20 autorises sur 25 tentatives`, autorises === PLAFONDS_DEFAUT.public, `${autorises}`);
  v('UNE seule alerte, pas cinq', premier === 1, `${premier}`);
}

console.log('\n══════ 2. Les deux seaux sont ETANCHES');
{
  const env = faireEnv();
  for (let i = 0; i < 25; i++) await reserverUnite(env, 't1', ORIGINE_PUBLIQUE);
  const rappel = await reserverUnite(env, 't1', ORIGINE_AUTHENTIFIEE);
  v('un rappel J-1 passe malgre le seau public sature', rappel.autorise === true);
  v('le seau authentifie a son propre plafond', rappel.plafond === PLAFONDS_DEFAUT.authentifie);
}

console.log('\n══════ 3. Cloisonnement entre tenants');
{
  const env = faireEnv();
  for (let i = 0; i < 25; i++) await reserverUnite(env, 't1', ORIGINE_PUBLIQUE);
  const autre = await reserverUnite(env, 't2', ORIGINE_PUBLIQUE);
  v('un autre tenant n\'est pas affecte', autre.autorise === true);
}

console.log('\n══════ 4. Relache et plafond par tenant');
{
  const env = faireEnv();
  for (let i = 0; i < 20; i++) await reserverUnite(env, 't1', ORIGINE_PUBLIQUE);
  v('21e refusee', (await reserverUnite(env, 't1', ORIGINE_PUBLIQUE)).autorise === false);
  await relacherUnite(env, 't1', ORIGINE_PUBLIQUE);
  v('apres relache, une place se libere', (await reserverUnite(env, 't1', ORIGINE_PUBLIQUE)).autorise === true);
}
{
  const env = faireEnv('3');
  let n = 0; for (let i = 0; i < 10; i++) if ((await reserverUnite(env, 't1', ORIGINE_PUBLIQUE)).autorise) n++;
  v('le plafond par tenant (3) prime sur le defaut', n === 3, `${n}`);
}
{
  const env = faireEnv('0');   // valeur abimee : ne doit PAS tout couper
  v('un plafond a 0 retombe sur le defaut, il ne coupe pas tout',
    (await reserverUnite(env, 't1', ORIGINE_PUBLIQUE)).plafond === PLAFONDS_DEFAUT.public);
}

console.log('\n══════ 5. Panne de base : on laisse passer');
{
  const casse = { DB: { prepare() { throw new Error('D1 down'); } } };
  v('base en panne → envoi autorise (le plafond n\'est pas une condition de service)',
    (await reserverUnite(casse, 't1', ORIGINE_PUBLIQUE)).autorise === true);
  v('sans base du tout → autorise', (await reserverUnite({}, 't1', ORIGINE_PUBLIQUE)).autorise === true);
}

console.log(`\nRESULTAT : ${ok}/${ok+echecs.length}`);
if (echecs.length) { echecs.forEach(e => console.log('  - '+e)); process.exit(1); }

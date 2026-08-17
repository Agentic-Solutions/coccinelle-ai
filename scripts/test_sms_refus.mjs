/**
 * Recette du refus (STOP) et des deux gardes de consentement.
 *
 * ── CE QUE CE TEST DOIT PROUVER ──
 * 1. Les variantes de refus sont reconnues, et les FAUX AMIS ne le sont pas :
 *    « ARRET DE TRAVAIL » ou « je ne veux pas que ca s'arrete » ne doivent PAS couper
 *    les SMS de quelqu'un qui n'a rien demande. Le faux positif est plus grave que le
 *    faux negatif : il fait disparaitre un service.
 * 2. Le refus est idempotent : un second STOP ne repousse pas la date du premier.
 * 3. `aRefuse` ECHOUE EN FERMETURE (lecture impossible = refus present).
 * 4. Le rapprochement des numeros tolere les formats (`0760…` / `+3376…`).
 */

import { estDemandeDeRefus, enregistrerRefus, aRefuse }
  from '../src/modules/shared/sms-refus.js';

let ok = 0;
const echecs = [];
const v = (nom, cond, det = '') => cond ? ok++
  : echecs.push(`${nom}${det ? ' — ' + det : ''}`);

// ═══════════ 1. RECONNAISSANCE DES VARIANTES ═══════════
const REFUS = ['STOP', 'Stop', 'stop', 'stop.', '  STOP  ', 'STOP!', 'ARRET', 'ARRÊT',
  'arrêt', 'Arret.', 'STOP SMS', 'stop sms', 'STOP PUB', 'stoppub', 'DESABONNEMENT',
  'désabonnement', 'DESINSCRIPTION', 'unsubscribe', 'OPT-OUT', 'desabonner'];
for (const t of REFUS) v(`refus reconnu : ${JSON.stringify(t)}`, estDemandeDeRefus(t) === true);

// Les faux amis : ils contiennent le mot mais ne sont PAS des refus.
const FAUX_AMIS = [
  'je ne veux pas que ca sarrete',
  'stoppez de me faire attendre',
  'ARRET DE TRAVAIL',
  'arretez vous demain matin',
  'STOP je plaisante',
  'bonjour',
  'oui merci',
  'ok pour larret du 12',
];
for (const t of FAUX_AMIS) v(`PAS un refus : ${JSON.stringify(t)}`, estDemandeDeRefus(t) === false);

for (const t of [null, undefined, '', '   ', 42, {}, []]) {
  v(`valeur absurde ignoree : ${JSON.stringify(t)}`, estDemandeDeRefus(t) === false);
}

// ═══════════ 2. ENREGISTREMENT ET LECTURE ═══════════
function faireEnv() {
  const lignes = [];
  return { lignes, DB: { prepare(sql) { return { bind(...a) { return {
    async first() {
      if (/FROM sms_refus/.test(sql)) {
        const [tenant, ...tels] = a;
        return lignes.some((l) => l.tenant === tenant && tels.includes(l.phone))
          ? { ok: 1 } : null;
      }
      return null;
    },
    async run() {
      if (/INSERT INTO sms_refus/.test(sql)) {
        const [tenant, phone, message] = a;
        // `ON CONFLICT DO NOTHING` : la premiere expression du refus est celle qui compte.
        const deja = lignes.find((l) => l.tenant === tenant && l.phone === phone);
        if (!deja) lignes.push({ tenant, phone, message, at: lignes.length + 1 });
        return { meta: { changes: deja ? 0 : 1 } };
      }
      return { meta: { changes: 0 } };
    },
  }; } }; } } };
}

{
  const env = faireEnv();
  v('avant tout STOP, personne n\'a refuse', (await aRefuse(env, 't1', '+33612345678')) === false);
  await enregistrerRefus(env, { tenantId: 't1', phone: '+33612345678', message: 'STOP' });
  v('apres STOP, le refus est lu', (await aRefuse(env, 't1', '+33612345678')) === true);

  // Le refus est PAR ENTREPRISE : refuser le garage ne refuse pas le dentiste d'a cote.
  v('un autre tenant n\'est pas concerne', (await aRefuse(env, 't2', '+33612345678')) === false);
  v('un autre numero n\'est pas concerne', (await aRefuse(env, 't1', '+33699999999')) === false);

  // Idempotence : un second STOP ne cree pas de doublon.
  await enregistrerRefus(env, { tenantId: 't1', phone: '+33612345678', message: 'STOP encore' });
  v('un second STOP ne duplique pas', env.lignes.length === 1, `${env.lignes.length} lignes`);
  v('et ne remplace pas le message d\'origine', env.lignes[0].message === 'STOP');
}

// ═══════════ 3. LES FORMATS DE NUMERO ═══════════
// 4 des 34 contacts reels ne sont PAS en E.164 : un refus enregistre sous une forme
// doit bloquer les envois vers l'autre forme, sinon la garde est contournee sans le savoir.
{
  const env = faireEnv();
  await enregistrerRefus(env, { tenantId: 't1', phone: '0612345678', message: 'STOP' });
  v('refus en 06… bloque un envoi vers +336…', (await aRefuse(env, 't1', '+33612345678')) === true);
}
{
  const env = faireEnv();
  await enregistrerRefus(env, { tenantId: 't1', phone: '+33612345678', message: 'STOP' });
  v('refus en +336… bloque un envoi vers 06…', (await aRefuse(env, 't1', '0612345678')) === true);
  v('et tolere les espaces de saisie', (await aRefuse(env, 't1', '06 12 34 56 78')) === true);
}

// ═══════════ 4. ECHEC EN FERMETURE ═══════════
{
  const casse = { DB: { prepare() { throw new Error('D1 down'); } } };
  v('lecture impossible → considere comme REFUS (echec en fermeture)',
    (await aRefuse(casse, 't1', '+33612345678')) === true);
  // A l'inverse, sans tenant il n'y a rien a verifier : ce n'est pas une panne.
  v('sans tenant → pas de refus (rien a verifier)',
    (await aRefuse(casse, null, '+33612345678')) === false);
}

console.log(`  ${ok}/${ok + echecs.length}`);
if (echecs.length) { echecs.forEach((e) => console.log(`  ❌ ${e}`)); process.exit(1); }

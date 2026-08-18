/**
 * Recette du refus (STOP) et des deux gardes de consentement.
 *
 * ── CE QUE CE TEST DOIT PROUVER ──
 * 1. Les variantes de refus sont reconnues, et les FAUX AMIS ne le sont pas :
 *    « ARRET DE TRAVAIL » ou « je ne veux pas que ca s'arrete » ne doivent PAS couper
 *    les SMS de quelqu'un qui n'a rien demande. Le faux positif est plus grave que le
 *    faux negatif : il fait disparaitre un service.
 * 2. Le refus est idempotent : un second STOP ne repousse pas la date du premier.
 * 3. `aRefuse` ECHOUE EN FERMETURE (lecture impossible = refus present)…
 * 3bis. …SAUF si le schema n'est pas encore migre : « no such table » et « no such
 *    column » valent ABSENCE de refus, pas panne. Sans cette nuance, deployer le
 *    Worker avant la migration 0089 couperait TOUS les SMS clients.
 * 4. Le rapprochement des numeros tolere les formats (`0760…` / `+3376…`).
 * 5. LA CLE EST L'EXPEDITEUR, PAS LE TENANT (migration 0089). Un refus vaut pour tous
 *    les tenants emettant depuis ce numero — y compris pour un tenant qui ecrit a ce
 *    contact POUR LA PREMIERE FOIS APRES le refus. C'est ce cas precis qui condamnait
 *    la version « liste des tenants ayant deja ecrit », et c'est donc le test qui
 *    compte le plus dans ce fichier.
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
const NUM = '+33939035760';   // l'expediteur unique d'aujourd'hui
const AUTRE_NUM = '+33939035761';

function faireEnv() {
  const lignes = [];
  return { lignes, DB: { prepare(sql) { return { bind(...a) { return {
    async first() {
      if (/FROM sms_refus/.test(sql)) {
        const [expediteur, ...tels] = a;
        return lignes.some((l) => l.expediteur === expediteur && tels.includes(l.phone))
          ? { ok: 1 } : null;
      }
      return null;
    },
    async all() { return { results: [] }; },   // `tenantsAyantEcrit`, informatif
    async run() {
      if (/INSERT INTO sms_refus/.test(sql)) {
        const [expediteur, phone, source, message] = a;
        // `ON CONFLICT DO NOTHING` : la premiere expression du refus est celle qui compte.
        const deja = lignes.find((l) => l.expediteur === expediteur && l.phone === phone);
        if (!deja) lignes.push({ expediteur, phone, source, message });
        return { meta: { changes: deja ? 0 : 1 } };
      }
      return { meta: { changes: 0 } };
    },
  }; } }; } } };
}

{
  const env = faireEnv();
  v('avant tout refus, personne n\'a refuse', (await aRefuse(env, NUM, '+33612345678')) === false);
  await enregistrerRefus(env, { expediteur: NUM, phone: '+33612345678', message: 'ARRET' });
  v('apres le refus, il est lu', (await aRefuse(env, NUM, '+33612345678')) === true);

  v('un autre numero de contact n\'est pas concerne',
    (await aRefuse(env, NUM, '+33699999999')) === false);
  // La portee suit l'IDENTITE D'EXPEDITEUR PERCUE : un autre numero d'envoi est une
  // autre identite, et devra etre refuse separement. C'est aussi ce qui fera se
  // resserrer la portee toute seule quand chaque tenant aura son propre numero.
  v('un autre numero expediteur n\'est pas concerne',
    (await aRefuse(env, AUTRE_NUM, '+33612345678')) === false);

  // Idempotence : un second refus ne cree pas de doublon.
  await enregistrerRefus(env, { expediteur: NUM, phone: '+33612345678', message: 'STOP encore' });
  v('un second refus ne duplique pas', env.lignes.length === 1, `${env.lignes.length} lignes`);
  v('et ne remplace pas le message d\'origine', env.lignes[0].message === 'ARRET');
}

// ═══════════ 2bis. LE CAS QUI A CONDAMNE LA CLE PAR TENANT ═══════════
// Un tenant qui ecrit a ce contact POUR LA PREMIERE FOIS APRES le refus. Avec une cle
// par tenant — ou une liste des tenants ayant deja ecrit — aucune ligne ne le couvre et
// son SMS part. Avec la cle par expediteur, il est bloque sans rien avoir a enumerer.
{
  const env = faireEnv();
  await enregistrerRefus(env, {
    expediteur: NUM, phone: '+33612345678', message: 'ARRET',
    tenantsConcernes: ['tenant_garage'],          // seul tenant connu ce jour-la
  });
  v('un tenant INCONNU au moment du refus est bloque lui aussi',
    (await aRefuse(env, NUM, '+33612345678')) === true);
  v('la liste des tenants est enregistree mais ne decide de rien',
    env.lignes.length === 1);
}

// ═══════════ 2ter. LES DEUX SOURCES ═══════════
// `twilio_21610` n'a besoin d'aucun message entrant : c'est le seul chemin qui survit a
// un webhook non configure. Il doit s'enregistrer et s'appliquer comme l'autre.
{
  const env = faireEnv();
  await enregistrerRefus(env, {
    expediteur: NUM, phone: '+33612345678',
    message: 'unsubscribed recipient', source: 'twilio_21610',
  });
  v('un refus appris par le 21610 bloque les envois suivants',
    (await aRefuse(env, NUM, '+33612345678')) === true);
  v('et la source est conservee', env.lignes[0].source === 'twilio_21610');
}

// ═══════════ 3. LES FORMATS DE NUMERO ═══════════
// 4 des 34 contacts reels ne sont PAS en E.164 : un refus enregistre sous une forme
// doit bloquer les envois vers l'autre forme, sinon la garde est contournee sans le savoir.
{
  const env = faireEnv();
  await enregistrerRefus(env, { expediteur: NUM, phone: '0612345678', message: 'ARRET' });
  v('refus en 06… bloque un envoi vers +336…', (await aRefuse(env, NUM, '+33612345678')) === true);
}
{
  const env = faireEnv();
  await enregistrerRefus(env, { expediteur: NUM, phone: '+33612345678', message: 'ARRET' });
  v('refus en +336… bloque un envoi vers 06…', (await aRefuse(env, NUM, '0612345678')) === true);
  v('et tolere les espaces de saisie', (await aRefuse(env, NUM, '06 12 34 56 78')) === true);
}

// ═══════════ 4. ECHEC EN FERMETURE, ET SES DEUX EXCEPTIONS ═══════════
{
  const casse = { DB: { prepare() { throw new Error('D1 down'); } } };
  v('lecture impossible → considere comme REFUS (echec en fermeture)',
    (await aRefuse(casse, NUM, '+33612345678')) === true);
  // A l'inverse, sans expediteur il n'y a rien a verifier : ce n'est pas une panne.
  v('sans expediteur → pas de refus (rien a verifier)',
    (await aRefuse(casse, null, '+33612345678')) === false);
}
// ⚠️ PIEGE DE DEPLOIEMENT. Entre le deploiement du Worker et l'application de la
// migration, la table est absente ou porte encore l'ancien schema. Les deux valent
// « personne n'a jamais pu refuser », donc ABSENCE de refus. Les traiter comme une
// panne couperait TOUS les SMS clients pendant la fenetre, et rendrait l'ordre de
// deploiement critique sans que rien ne le signale.
for (const [cas, msg] of [
  ['table absente', 'no such table: sms_refus'],
  ['schema pre-0089', 'no such column: expediteur'],
]) {
  const vieux = { DB: { prepare() { throw new Error(msg); } } };
  v(`${cas} → PAS un refus (sinon tous les SMS sont coupes)`,
    (await aRefuse(vieux, NUM, '+33612345678')) === false);
}


// ═══════════ 5. LA GARDE DANS `envoyerSmsTrace` ═══════════
// Jusqu'ici on ne testait que `aRefuse` — la LECTURE. Rien ne prouvait que l'ENVOI
// s'arrete effectivement. La recette du 18/08 en production n'a pas comble ce trou :
// le silence a bien ete constate, mais le log de la garde n'est jamais apparu (le
// chemin teste n'a pas tente d'envoi), donc le mecanisme n'a pas ete demontre bout en
// bout. Ce test le demontre ici, ou c'est deterministe.
{
  const { envoyerSmsTrace } = await import('../src/modules/shared/sms-envoi.js');

  const envRefus = (refus) => ({
    TWILIO_PHONE_NUMBER: NUM,
    // Pas de TWILIO_ACCOUNT_SID : rien ne peut partir sur le reseau pendant la recette.
    DB: { prepare(sql) { return { bind() { return {
      async first() { return /FROM sms_refus/.test(sql) && refus ? { ok: 1 } : null; },
      async all() { return { results: [] }; },
      async run() { return { meta: { changes: 0 } }; },
    }; } }; } },
  });

  const bloque = await envoyerSmsTrace(envRefus(true), {
    tenantId: 't1', to: '+33612345678', message: 'Rappel RDV', type: 'rappel_rdv',
    ignorerPlafond: true,
  });
  v('un destinataire ayant refuse : l\'envoi est REFUSE', bloque.envoye === false);
  v('et le refus est CERTAIN (rien n\'est parti)', bloque.refuse === true);
  v('et la cause est identifiable par l\'appelant', bloque.refusDestinataire === true);

  // Le meme envoi, sans refus enregistre, doit franchir la garde. Il echoue ensuite sur
  // « Twilio non configure » — ce qui prouve justement qu'il est alle PLUS LOIN.
  const passe = await envoyerSmsTrace(envRefus(false), {
    tenantId: 't1', to: '+33612345678', message: 'Rappel RDV', type: 'rappel_rdv',
    ignorerPlafond: true,
  });
  v('sans refus, la garde laisse passer', passe.refusDestinataire === undefined);

  // ⚠️ LES TYPES INTERNES ECHAPPENT A LA GARDE. Sans cette exemption, notre propre
  // accuse de reception « vous ne recevrez plus de SMS » serait bloque par le refus
  // qu'il confirme : la personne dirait ARRET et n'aurait aucun retour.
  const interne = await envoyerSmsTrace(envRefus(true), {
    tenantId: null, to: '+33612345678', message: 'Confirmation', type: 'interne',
    ignorerPlafond: true,
  });
  v('un type INTERNE n\'est pas bloque par le refus', interne.refusDestinataire === undefined);
}

console.log(`  ${ok}/${ok + echecs.length}`);
if (echecs.length) { echecs.forEach((e) => console.log(`  ❌ ${e}`)); process.exit(1); }

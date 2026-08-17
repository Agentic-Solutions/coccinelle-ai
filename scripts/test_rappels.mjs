// Recette des rappels J-1 — hors ligne, sans reseau, sans base.
//
//   node scripts/test_rappels.mjs
//
// POURQUOI CE TEST EXISTE
// Le 11/08/2026, un client a recu DEUX rappels pour le meme rendez-vous. Trois
// defauts se superposaient, et aucun n'etait detectable a la relecture :
//
//   1. deux formes de retour cohabitaient — `sendSMSViaTwilio` rendait
//      `{success}`, `envoyerSmsTrace` rend `{envoye}`. Une version deployee
//      entre les deux testait `.success` sur le nouveau retour : `undefined`
//      etant faux, le SMS partait et `reminder_sent` n'etait jamais pose ;
//   2. le SELECT et l'UPDATE n'etaient pas atomiques : deux passages lisaient
//      tous les deux avant qu'aucun n'ecrive ;
//   3. la fonction balayait TOUS les tenants, sur une route exposee au dashboard.
//
// Les quatre familles ci-dessous echouent si l'un de ces defauts revient. Le
// test 1 est le plus important : c'est la couture qui a rendu les deux autres
// invisibles.
//
// ⚠️ Ce que ce test NE prouve PAS : que le doublon soit impossible. Sans cle
// d'idempotence cote Twilio — l'API Messages n'en propose pas —, la reservation
// atomique le rend RARE, pas impossible. On ne l'ecrit nulle part comme une
// garantie.

import { envoyerSmsTrace } from '../src/modules/shared/sms-envoi.js';
import { sendTomorrowReminders } from '../src/cron/reminders.js';

let ok = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  if (condition) { ok++; console.log(`  ✅ ${nom}`); }
  else { console.log(`  ❌ ${nom}${detail ? ' — ' + detail : ''}`); echecs.push(nom); }
}

// ── Faux D1 : il doit honorer le SQL, pas le deviner ──
//
// La cle est `UPDATE … SET reminder_sent = 1 WHERE id = ? AND reminder_sent = 0`
// qui doit rendre `meta.changes = 1` au premier appelant et `0` au second.
//
// ⚠️ PIEGE VECU EN ECRIVANT CE TEST : la premiere version du mock appliquait la
// condition `reminder_sent === 0` de son propre chef, quel que soit le SQL recu.
// Resultat, en retirant `AND reminder_sent = 0` du code de production, le test
// passait toujours — il validait le mock, pas le code. C'est le meme defaut
// qu'un rejeu de purge avec `PRAGMA foreign_keys=OFF` (§ q) : un banc qui ne
// peut pas echouer ne demontre rien.
//
// Le mock LIT donc la clause dans le SQL. Verifie en injectant la regression :
// sans la clause, le test echoue.
function faireDB(rdv) {
  const lignes = new Map(rdv.map((r) => [r.id, { reminder_sent: 0, reminder_sent_at: null, ...r }]));
  const traces = [];

  return {
    lignes,
    traces,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              // D1 refuse un nombre de liaisons different du nombre de « ? ».
              // Sans ce controle, retirer la clause de cantonnement du SQL tout
              // en continuant a lier le tenant passait inapercu ici alors que la
              // production aurait leve.
              const attendus = (sql.match(/\?/g) || []).length;
              if (args.length !== attendus) {
                throw new Error(`D1: ${args.length} liaisons pour ${attendus} placeholders`);
              }
              // Le cantonnement est applique SEULEMENT s'il est dans le SQL —
              // même raison que pour la reservation : le mock ne doit pas
              // corriger le code qu'il teste.
              const cantonne = /AND\s+a\.tenant_id\s*=\s*\?/.test(sql);
              const [dateStr, tenantIdLie] = args;
              const results = [...lignes.values()].filter((r) =>
                r.scheduled_at.startsWith(dateStr)
                && r.reminder_sent === 0
                && r.phone
                && (!cantonne || r.tenant_id === tenantIdLie));
              return { results };
            },
            async first() {
              // ── Gardes de consentement (chantier CONSENTEMENT, 17/08/2026) ──
              // `envoyerSmsTrace` verifie desormais deux choses avant d'envoyer : que
              // le destinataire n'a pas demande STOP, et qu'il est un contact du
              // tenant. Ce faux D1 doit les modeliser, sinon il fait echouer des
              // assertions qui portent sur la forme de retour de l'envoi.
              //
              // On repond « aucun refus » et « contact connu », ce qui est l'etat
              // nominal. Le comportement des gardes elles-memes est teste a part, dans
              // `scripts/test_sms_refus.mjs`, avec un faux D1 dedie.
              if (/FROM sms_refus/.test(sql)) return null;              // personne n'a refuse
              if (/FROM (prospects|customers|omni_conversations|calls)/.test(sql)) {
                return { ok: 1 };                                      // contact connu
              }
              return null;
            },
            async run() {
              // Reservation. La condition est celle QU'ON LIT DANS LE SQL, pas
              // celle qu'on suppose : c'est ce qui rend la regression detectable.
              if (/SET reminder_sent = 1/.test(sql)) {
                const r = lignes.get(args[0]);
                if (!r) return { meta: { changes: 0 } };
                const conditionnel = /AND\s+reminder_sent\s*=\s*0/.test(sql);
                if (conditionnel && r.reminder_sent !== 0) return { meta: { changes: 0 } };
                r.reminder_sent = 1;
                r.reminder_sent_at = 'maintenant';
                return { meta: { changes: 1 } };
              }
              // Relachement.
              if (/SET reminder_sent = 0/.test(sql)) {
                const r = lignes.get(args[0]);
                if (r) { r.reminder_sent = 0; r.reminder_sent_at = null; }
                return { meta: { changes: r ? 1 : 0 } };
              }
              // Traces de conversation : on note, sans modeliser.
              if (/INSERT INTO omni_/.test(sql)) traces.push(args);
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

/** Un RDV de demain, eligible : pris il y a plus de 24 h, avec un telephone. */
function rdvDemain(id, tenantId) {
  const demain = new Date();
  demain.setUTCDate(demain.getUTCDate() + 1);
  const jour = demain.toISOString().split('T')[0];
  return {
    id,
    tenant_id: tenantId,
    scheduled_at: `${jour}T10:00:00`,
    phone: '+33600000000',
    customer_name: 'Client Test',
    company_name: 'Entreprise Test',
    tenant_slug: 'entreprise-test',
    prospect_id: null,
  };
}

function faireEnv(db, fetchStub) {
  globalThis.fetch = fetchStub;
  return {
    DB: db,
    TWILIO_ACCOUNT_SID: 'ACtest',
    TWILIO_AUTH_TOKEN: 'token',
    TWILIO_PHONE_NUMBER: '+33900000000',
  };
}

/** Twilio accepte. */
const twilioOk = () => async () => ({ ok: true, json: async () => ({ sid: 'SMtest' }) });
/** Twilio refuse explicitement — issue CERTAINE. */
const twilioRefuse = () => async () => ({ ok: false, json: async () => ({ code: 21610, message: 'Refuse' }) });
/** Le reseau lache — issue INCONNUE. */
const twilioInconnu = () => async () => { throw new Error('network down'); };

// ═══════════════════════════════════════════════════════════
console.log('══════ 1. Forme de retour — la couture qui a cause le doublon');

{
  const env = faireEnv(faireDB([]), twilioOk());
  const r = await envoyerSmsTrace(env, { tenantId: 't1', to: '+33600000000', message: 'Bonjour', type: 'information' });
  verifier('succes → `envoye` vaut true', r.envoye === true, JSON.stringify(r));
  verifier('succes → PAS de champ `success` (la couture ne revient pas)',
    !('success' in r), JSON.stringify(Object.keys(r)));
  verifier('succes → `corps` porte le texte reellement parti', typeof r.corps === 'string' && r.corps.length > 0);
}
{
  const env = faireEnv(faireDB([]), twilioRefuse());
  const r = await envoyerSmsTrace(env, { tenantId: 't1', to: '+33600000000', message: 'Bonjour', type: 'information' });
  verifier('refus Twilio → `envoye` false ET `refuse` true', r.envoye === false && r.refuse === true, JSON.stringify(r));
}
{
  const env = faireEnv(faireDB([]), twilioInconnu());
  const r = await envoyerSmsTrace(env, { tenantId: 't1', to: '+33600000000', message: 'Bonjour', type: 'information' });
  verifier('issue inconnue → `envoye` false et `refuse` ABSENT',
    r.envoye === false && r.refuse === undefined, JSON.stringify(r));
}
{
  const env = faireEnv(faireDB([]), twilioOk());
  const r = await envoyerSmsTrace(env, { tenantId: 't1', to: '', message: 'Bonjour', type: 'information' });
  verifier('destinataire vide → refus certain, rien n\'est tente', r.envoye === false && r.refuse === true);
}
{
  // Twilio absent de l'env : c'est le chemin qu'exerce la recette sans envoi.
  const env = { DB: faireDB([]).prepare ? faireDB([]) : null };
  const r = await envoyerSmsTrace(env, { tenantId: 't1', to: '+33600000000', message: 'Bonjour', type: 'information' });
  verifier('Twilio non configure → refus certain', r.envoye === false && r.refuse === true, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════
console.log('\n══════ 2. Reservation atomique — deux passages, un seul envoi');

{
  const db = faireDB([rdvDemain('a1', 't_garage')]);
  let envois = 0;
  const env = faireEnv(db, async () => { envois++; return { ok: true, json: async () => ({ sid: 'SM' + envois }) }; });

  // Les deux passages partent ENSEMBLE et voient donc la meme liste de
  // candidats — exactement la situation du 11/08 (cron + declenchement manuel).
  const [a, b] = await Promise.all([
    sendTomorrowReminders(env, { tenantId: 't_garage' }),
    sendTomorrowReminders(env, { tenantId: 't_garage' }),
  ]);

  verifier('UN SEUL SMS envoye pour deux passages simultanes', envois === 1, `${envois} envois`);
  verifier('un seul passage compte l\'envoi', (a.sent + b.sent) === 1, `${a.sent} + ${b.sent}`);
  verifier('le RDV reste marque comme rappele', db.lignes.get('a1').reminder_sent === 1);
}

// ═══════════════════════════════════════════════════════════
console.log('\n══════ 3. Cantonnement au tenant — la faille inter-tenant');

{
  const db = faireDB([rdvDemain('g1', 't_garage'), rdvDemain('s1', 't_syndic')]);
  const destinataires = [];
  const env = faireEnv(db, async (url, init) => {
    destinataires.push(new URLSearchParams(init.body).get('To'));
    return { ok: true, json: async () => ({ sid: 'SMx' }) };
  });

  const r = await sendTomorrowReminders(env, { tenantId: 't_garage' });
  verifier('un seul rappel envoye, celui du tenant demande', r.sent === 1, `${r.sent} envois`);
  verifier('le RDV de l\'AUTRE tenant n\'est pas touche',
    db.lignes.get('s1').reminder_sent === 0);
  verifier('le RDV du tenant demande est marque', db.lignes.get('g1').reminder_sent === 1);
}
{
  // Le cron, lui, balaie bien toute la plateforme — c'est son role.
  const db = faireDB([rdvDemain('g2', 't_garage'), rdvDemain('s2', 't_syndic')]);
  const env = faireEnv(db, twilioOk());
  const r = await sendTomorrowReminders(env, { tenantId: null });
  verifier('portee plateforme → les deux tenants sont rappeles', r.sent === 2, `${r.sent} envois`);
}
{
  // Le defaut d'appel ne doit pas etre « toute la plateforme » par surprise…
  // mais il l'est, et c'est assume : seuls des appelants INTERNES peuvent
  // l'invoquer sans portee. Ce test fige ce contrat pour qu'il soit visible.
  const db = faireDB([rdvDemain('g3', 't_garage'), rdvDemain('s3', 't_syndic')]);
  const env = faireEnv(db, twilioOk());
  const r = await sendTomorrowReminders(env);
  verifier('sans argument → plateforme (contrat du cron, fige ici)', r.sent === 2, `${r.sent} envois`);
}

// ═══════════════════════════════════════════════════════════
console.log('\n══════ 4. Relachement — refus certain vs issue inconnue');

{
  const db = faireDB([rdvDemain('r1', 't_garage')]);
  const env = faireEnv(db, twilioRefuse());
  const r = await sendTomorrowReminders(env, { tenantId: 't_garage' });
  verifier('refus Twilio → reservation RELACHEE (reessayable)',
    db.lignes.get('r1').reminder_sent === 0);
  verifier('refus Twilio → compte comme erreur', r.errors === 1);
  verifier('refus Twilio → statut « error »', r.details[0]?.status === 'error', JSON.stringify(r.details));
}
{
  const db = faireDB([rdvDemain('i1', 't_garage')]);
  const env = faireEnv(db, twilioInconnu());
  const r = await sendTomorrowReminders(env, { tenantId: 't_garage' });
  verifier('issue inconnue → reservation CONSERVEE (pas de doublon)',
    db.lignes.get('i1').reminder_sent === 1);
  verifier('issue inconnue → statut « incertain », distinct d\'une erreur',
    r.details[0]?.status === 'incertain', JSON.stringify(r.details));
}
{
  // Apres un refus relache, un second passage doit pouvoir reessayer.
  const db = faireDB([rdvDemain('r2', 't_garage')]);
  let tentatives = 0;
  const env = faireEnv(db, async () => {
    tentatives++;
    return tentatives === 1
      ? { ok: false, json: async () => ({ message: 'Refuse' }) }
      : { ok: true, json: async () => ({ sid: 'SMok' }) };
  });
  await sendTomorrowReminders(env, { tenantId: 't_garage' });
  const r2 = await sendTomorrowReminders(env, { tenantId: 't_garage' });
  verifier('un refus relache permet un nouvel essai qui aboutit', r2.sent === 1, `${r2.sent} envois`);
  verifier('et le RDV finit marque', db.lignes.get('r2').reminder_sent === 1);
}

console.log('\n═══════════════════════════════════════════');
console.log(`RESULTAT : ${ok}/${ok + echecs.length}`);
if (echecs.length) {
  console.log('ECHECS :');
  echecs.forEach((e) => console.log('  - ' + e));
  process.exit(1);
}

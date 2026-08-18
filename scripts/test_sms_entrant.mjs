/**
 * Recette des décisions communes aux DEUX webhooks de SMS entrant.
 *
 * ── CE QUE CE TEST DOIT PROUVER ──
 * 1. La signature Twilio ÉCHOUE EN FERMETURE : pas d'en-tête, mauvaise signature, ou
 *    aucun token configuré ⇒ rejet. Un webhook qui écrit un refus et annule des
 *    rendez-vous ne s'ouvre pas parce qu'une variable d'environnement manque.
 * 2. Les DEUX tokens régionaux sont acceptés. Mesuré le 17/08 : la messagerie signe
 *    avec le token us1 alors que les numéros vivent en IE1 ; si la messagerie basculait
 *    en IE1, n'accepter qu'un seul token produirait un 403 SILENCIEUX — exactement le
 *    symptôme qui a coûté une soirée.
 * 3. Le tenant se résout par le numéro APPELÉ, et un numéro inconnu vaut `null` —
 *    jamais un tenant deviné (`'tenant_demo_001'` servait en production).
 * 4. Le refus est intercepté quelle que soit la route, clé sur le numéro APPELÉ, et un
 *    message ordinaire passe son chemin.
 */

import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { signatureTwilioValide, resoudreTenantParNumeroAppele, intercepterRefus } =
  await import('../src/modules/shared/sms-entrant.js');

let ok = 0;
const echecs = [];
const v = (nom, cond, det = '') => cond ? ok++
  : echecs.push(`${nom}${det ? ' — ' + det : ''}`);

const URL_HOOK = 'https://exemple.test/webhooks/twilio/sms';
const TOK_US1 = 'a'.repeat(32);
const TOK_IE1 = 'b'.repeat(32);

/** La signature Twilio : HMAC-SHA1 de (URL + paramètres triés), en base64. */
async function signer(token, params) {
  const data = URL_HOOK + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const cle = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const sig = await webcrypto.subtle.sign('HMAC', cle, new TextEncoder().encode(data));
  return Buffer.from(new Uint8Array(sig)).toString('base64');
}

function requete(params, signature) {
  return new Request(URL_HOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(signature ? { 'X-Twilio-Signature': signature } : {}),
    },
    body: new URLSearchParams(params).toString(),
  });
}

// ═══════════ 1. SIGNATURE ═══════════
{
  const p = { MessageSid: 'SM1', From: '+33600000001', To: '+33939035760', Body: 'Arret ' };
  const bonne = await signer(TOK_US1, p);

  v('signature us1 valide → acceptee',
    (await signatureTwilioValide(requete(p, bonne), { TWILIO_AUTH_TOKEN: TOK_US1 })) === true);
  v('aucune signature → rejetee',
    (await signatureTwilioValide(requete(p, null), { TWILIO_AUTH_TOKEN: TOK_US1 })) === false);
  v('signature bidon → rejetee',
    (await signatureTwilioValide(requete(p, 'bidon=='), { TWILIO_AUTH_TOKEN: TOK_US1 })) === false);
  v('signature d\'un AUTRE token → rejetee',
    (await signatureTwilioValide(requete(p, await signer(TOK_IE1, p)),
      { TWILIO_AUTH_TOKEN: TOK_US1 })) === false);

  // ⚠️ ECHEC EN FERMETURE. `validateTwilioRequest` (twilio/validator.js) renvoie `true`
  // sans token : c'est ce comportement-la qu'on refuse ici.
  v('AUCUN token configure → rejetee (echec en fermeture)',
    (await signatureTwilioValide(requete(p, bonne), {})) === false);

  // Les deux regions acceptees quand les deux tokens existent.
  const env2 = { TWILIO_AUTH_TOKEN: TOK_US1, TWILIO_IE1_AUTH_TOKEN: TOK_IE1 };
  v('token us1 accepte quand les deux sont configures',
    (await signatureTwilioValide(requete(p, bonne), env2)) === true);
  v('token ie1 accepte quand les deux sont configures',
    (await signatureTwilioValide(requete(p, await signer(TOK_IE1, p)), env2)) === true);
}

// ═══════════ 2. RESOLUTION DU TENANT ═══════════
function envAvecMappings(lignes) {
  return { DB: { prepare(sql) { return { bind(...a) { return {
    async first() {
      if (/omni_phone_mappings/.test(sql)) {
        const [numero, canal] = a;
        return lignes.find((l) => l.phone === numero && l.canal === canal) || null;
      }
      return null;
    },
    async all() { return { results: [] }; },
    async run() { return { meta: { changes: 0 } }; },
  }; } }; } } };
}

{
  const env = envAvecMappings([
    { phone: '+33939035760', canal: 'voice', tenant_id: 'tenant_A' },
    { phone: '+33111111111', canal: 'sms', tenant_id: 'tenant_B' },
  ]);
  v('mapping SMS direct', (await resoudreTenantParNumeroAppele(env, '+33111111111')) === 'tenant_B');
  // Le cas courant aujourd'hui : seule la voix est declaree.
  v('repli sur le mapping VOIX', (await resoudreTenantParNumeroAppele(env, '+33939035760')) === 'tenant_A');
  v('numero INCONNU → null, jamais un tenant devine',
    (await resoudreTenantParNumeroAppele(env, '+33999999999')) === null);
  v('numero absent → null', (await resoudreTenantParNumeroAppele(env, null)) === null);
}

// ═══════════ 3. INTERCEPTION DU REFUS ═══════════
// `TWILIO_ACCOUNT_SID` volontairement absent : `envoyerSmsTrace` rend la main avant
// tout appel reseau, la confirmation n'est donc pas envoyee pendant la recette.
function envRefus() {
  const lignes = [];
  return { lignes, DB: { prepare(sql) { return { bind(...a) { return {
    async first() { return null; },
    async all() { return { results: [] }; },
    async run() {
      if (/INSERT INTO sms_refus/.test(sql)) {
        const [expediteur, phone, source, message] = a;
        lignes.push({ expediteur, phone, source, message });
      }
      return { meta: { changes: 1 } };
    },
  }; } }; } } };
}

{
  const env = envRefus();
  const rien = await intercepterRefus(env, {
    from: '+33600000001', to: '+33939035760', Body: undefined, body: 'bonjour, vous ouvrez a quelle heure ?',
  });
  v('un message ordinaire n\'est PAS intercepte', rien === null);
  v('et n\'ecrit rien', env.lignes.length === 0);
}
{
  const env = envRefus();
  // Le corps EXACT recu de Twilio le 17/08 : majuscule initiale, espace final.
  const rep = await intercepterRefus(env, { from: '+33600000001', to: '+33939035760', body: 'Arret ' });
  v('un refus est intercepte et rend une reponse', rep instanceof Response);
  v('la reponse est du TwiML vide',
    (await rep.text()).includes('<Response></Response>'));
  v('une ligne de refus est ecrite', env.lignes.length === 1, `${env.lignes.length} lignes`);
  v('clee sur le numero APPELE, pas sur un tenant',
    env.lignes[0]?.expediteur === '+33939035760');
  v('et portant le numero de la personne', env.lignes[0]?.phone === '+33600000001');
  v('source = sms_entrant', env.lignes[0]?.source === 'sms_entrant');
}

console.log(`  ${ok}/${ok + echecs.length}`);
if (echecs.length) { echecs.forEach((e) => console.log(`  ❌ ${e}`)); process.exit(1); }

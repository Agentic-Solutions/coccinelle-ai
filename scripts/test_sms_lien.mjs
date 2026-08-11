// Recette de la regle du lien de reservation — hors ligne, sans reseau.
//
//   node scripts/test_sms_lien.mjs
//
// Verifie les deux erreurs qui coutent cher : un SMS commercial SANS lien
// (client perdu a la derniere marche) et un SMS transactionnel AVEC lien
// (on invite a reprendre un rendez-vous deja pris).

import {
  TYPES_SMS,
  doitInclureLien,
  enrichirSmsAvecLien,
  construireLienReservation,
} from '../src/modules/shared/sms-booking-link.js';

// ── Faux env : une base qui repond comme D1 ──
function faireEnv(slugParTenant) {
  return {
    DB: {
      prepare() {
        return {
          bind(id) {
            return { first: async () => (id in slugParTenant ? { slug: slugParTenant[id] } : null) };
          },
        };
      },
    },
  };
}
const ENV = faireEnv({
  t_garage: 'garage-toulouse',
  t_sans_slug: '',
  // t_inconnu absent : le tenant n'existe pas
});

let total = 0, ok = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  total++;
  if (condition) { ok++; console.log(`  ✅ ${nom}`); }
  else { console.log(`  ❌ ${nom}${detail ? ' — ' + detail : ''}`); echecs.push(nom); }
}

console.log('══════ Regle d\'inclusion par type');
const AVEC_LIEN = ['devis', 'tarif', 'horaires', 'rappel_conseiller', 'suivi_appel',
  'information', 'prospection', 'reponse_sms', 'manuel', 'annulation_rdv'];
const SANS_LIEN = ['confirmation_rdv', 'rappel_rdv', 'verification', 'interne'];

for (const t of AVEC_LIEN) verifier(`${t} → lien`, doitInclureLien(t) === true);
for (const t of SANS_LIEN) verifier(`${t} → pas de lien`, doitInclureLien(t) === false);
verifier('type inconnu → pas de lien (on ne devine pas)', doitInclureLien('type_jamais_vu') === false);
verifier('type absent → cas general, donc lien', doitInclureLien(undefined) === true);
verifier('la table couvre les 14 types documentes', Object.keys(TYPES_SMS).length === 14,
  `${Object.keys(TYPES_SMS).length} types`);

console.log('\n══════ Construction du lien');
verifier('slug present → URL publique',
  (await construireLienReservation(ENV, 't_garage')) === 'https://coccinelle.ai/booking/garage-toulouse');
verifier('slug vide → null, jamais une URL cassee',
  (await construireLienReservation(ENV, 't_sans_slug')) === null);
verifier('tenant inconnu → null',
  (await construireLienReservation(ENV, 't_inconnu')) === null);
verifier('sans tenantId → null',
  (await construireLienReservation(ENV, null)) === null);

console.log('\n══════ Enrichissement du message');
const devis = await enrichirSmsAvecLien(ENV, {
  tenantId: 't_garage',
  message: 'Votre devis : vidange essence 89 euros, filtre inclus.',
  type: 'devis',
});
verifier('le devis porte le lien', devis.includes('https://coccinelle.ai/booking/garage-toulouse'));
verifier('le message d\'origine est preserve mot pour mot',
  devis.startsWith('Votre devis : vidange essence 89 euros, filtre inclus.'), devis);

const confirmation = await enrichirSmsAvecLien(ENV, {
  tenantId: 't_garage',
  message: 'Votre RDV du 12/08 a 9h est confirme.',
  type: 'confirmation_rdv',
});
verifier('la confirmation de RDV reste intacte',
  confirmation === 'Votre RDV du 12/08 a 9h est confirme.', confirmation);

const code = await enrichirSmsAvecLien(ENV, {
  tenantId: 't_garage', message: 'Votre code est 483920.', type: 'verification',
});
verifier('le code de verification reste intact', code === 'Votre code est 483920.');

const deja = await enrichirSmsAvecLien(ENV, {
  tenantId: 't_garage',
  message: 'Reservez ici : https://coccinelle.ai/booking/garage-toulouse',
  type: 'devis',
});
verifier('idempotent : un lien deja present n\'est pas double',
  (deja.match(/\/booking\//g) || []).length === 1, deja);

const sansSlug = await enrichirSmsAvecLien(ENV, {
  tenantId: 't_sans_slug', message: 'Nos tarifs commencent a 89 euros.', type: 'tarif',
});
verifier('tenant sans slug → message envoye tel quel',
  sansSlug === 'Nos tarifs commencent a 89 euros.', sansSlug);

const vide = await enrichirSmsAvecLien(ENV, { tenantId: 't_garage', message: '', type: 'devis' });
verifier('message vide → inchange', vide === '');

// Un env casse ne doit JAMAIS empecher l'envoi.
const casse = await enrichirSmsAvecLien(
  { DB: { prepare() { throw new Error('D1 indisponible'); } } },
  { tenantId: 't_garage', message: 'Nos tarifs commencent a 89 euros.', type: 'tarif' },
);
verifier('base indisponible → message envoye quand meme',
  casse === 'Nos tarifs commencent a 89 euros.', casse);

console.log('\n══════ Ponctuation');
const sansPoint = await enrichirSmsAvecLien(ENV, {
  tenantId: 't_garage', message: 'Vidange 89 euros', type: 'tarif',
});
verifier('une phrase sans point final recoit un point avant le lien',
  sansPoint.includes('Vidange 89 euros. Réservez en ligne'), sansPoint);

console.log('\n═══════════════════════════════════════════');
console.log(`RESULTAT : ${ok}/${total}`);
if (echecs.length) { console.log('ECHECS :'); echecs.forEach(e => console.log('  - ' + e)); process.exit(1); }

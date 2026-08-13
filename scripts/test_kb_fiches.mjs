// Recette du normaliseur de base de connaissances — hors ligne, sans reseau.
//
//   node scripts/test_kb_fiches.mjs
//
// Verifie l'invariant produit : l'agent restitue le bon chiffre quel que soit le
// format importe par le client. Les memes 10 questions sont rejouees sur QUATRE
// ecritures du meme catalogue (CSV, point-virgule, tabulation, Markdown) — un
// client qui exporte depuis Excel, Sheets ou Notion doit obtenir le meme
// resultat. Exigence : 100 %.

import {
  construireFiches,
  classerFiches,
  detecterAmbiguite,
  detecterStructure,
  plier,
  reecrireLigneFiche,
  supprimerLigneFiche,
} from '../src/modules/shared/kb-fiches.js';

// ── Le catalogue reel du tenant de recette (Garage Toulouse), 29 lignes ──
const CSV = `Nous proposons : categorie,prestation,prix,details
Infos,Horaires,,"Lun-ven 8h-19h, samedi 9h-17h, ferme dimanche"
Infos,Adresse,,"45 avenue des Minimes, 31200 Toulouse, parking client gratuit"
Infos,Vehicule de courtoisie,,"Sur reservation, intervention >4h, 3 vehicules disponibles"
Entretien,Vidange essence (filtre inclus),89 EUR,
Entretien,Vidange diesel (filtre inclus),99 EUR,
Entretien,Revision complete citadine,189 EUR,
Entretien,Revision complete berline,229 EUR,
Entretien,Revision complete SUV/4x4,269 EUR,
Freinage,Forfait plaquettes avant (main d oeuvre incluse),149 EUR,
Freinage,Plaquettes + disques avant,289 EUR,
Distribution,Courroie de distribution + pompe a eau,450-750 EUR,"Sur devis selon modele"
Pneus,Montage equilibrage,15 EUR,Par pneu
Pneus,Pneu entree de gamme,des 59 EUR,
Pneus,Pneu Michelin/Continental,des 89 EUR,
Pneus,Pneu hiver,des 79 EUR,
Pneus,Permutation,25 EUR,
Pneus,Reparation crevaison,25 EUR,"Si reparable"
Climatisation,Recharge gaz R134a,79 EUR,
Climatisation,Recharge gaz R1234yf,129 EUR,"Vehicules apres 2017"
Divers,Diagnostic electronique,59 EUR,"Offert si reparation au garage"
Divers,Batterie posee,des 119 EUR,
Divers,Ampoules et essuie-glaces,,"Pose offerte si achat au garage"
Controle technique,Forfait pre-controle,49 EUR,"Pas de CT sur place, partenaire Autosur a 500m"
RDV,Delai entretien courant,,48h en moyenne
RDV,Delai intervention lourde,,1 semaine
RDV,Depannage urgence,,"Jour meme selon dispo, majoration 30%"
RDV,Depot avant 9h,,"Pret le soir meme (entretien courant)"
Paiement,Moyens acceptes,,"CB, especes, cheque, virement, 3x sans frais des 300 EUR"
Garantie,Reparations,,"2 ans pieces et main d oeuvre, pieces restituees sur demande".`;

/** Reecrit le meme catalogue dans un autre format d'import. */
function versSeparateur(csv, sep) {
  return csv.split('\n').map(ligne => {
    // On repasse par un decoupage cite pour ne pas casser les champs a virgules.
    const champs = [];
    let cur = '', q = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { champs.push(cur); cur = ''; continue; }
      cur += c;
    }
    champs.push(cur);
    return champs.map(ch => (ch.includes(sep) ? `"${ch}"` : ch)).join(sep);
  }).join('\n');
}

function versMarkdown(csv) {
  const lignes = csv.split('\n').map(ligne => {
    const champs = [];
    let cur = '', q = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { champs.push(cur); cur = ''; continue; }
      cur += c;
    }
    champs.push(cur);
    return `| ${champs.join(' | ')} |`;
  });
  return [lignes[0], '| --- | --- | --- | --- |', ...lignes.slice(1)].join('\n');
}

const FORMATS = {
  'CSV (virgule)': CSV,
  'point-virgule': versSeparateur(CSV, ';'),
  'tabulation': versSeparateur(CSV, '\t'),
  'tableau Markdown': versMarkdown(CSV),
};

// ── Les 10 questions de recette, avec le montant exact attendu ──
const QUESTIONS = [
  { q: 'prix montage et equilibrage pneu',            attendu: '15',  libelle: 'montage equilibrage' },
  { q: 'combien coute la permutation des pneus',      attendu: '25',  libelle: 'permutation' },
  { q: 'tarif reparation crevaison',                  attendu: '25',  libelle: 'reparation crevaison' },
  { q: 'prix d un pneu hiver',                        attendu: '79',  libelle: 'pneu hiver' },
  { q: 'combien coute une vidange essence',           attendu: '89',  libelle: 'vidange essence' },
  { q: 'combien coute une vidange diesel',            attendu: '99',  libelle: 'vidange diesel' },
  { q: 'prix revision complete berline',              attendu: '229', libelle: 'revision complete berline' },
  { q: 'tarif changement plaquettes avant',           attendu: '149', libelle: 'forfait plaquettes avant',
    ambiguAttendu: 'plaquettes + disques avant' },
  { q: 'prix plaquettes et disques avant',            attendu: '289', libelle: 'plaquettes + disques avant' },
  { q: 'prix recharge climatisation R1234yf',         attendu: '129', libelle: 'recharge gaz r1234yf' },
];

const STOP = new Set([
  'les', 'des', 'une', 'pour', 'avec', 'vous', 'quel', 'quelle', 'est', 'que', 'qui',
  'sur', 'dans', 'par', 'combien', 'coute', 'cout', 'prix', 'tarif', 'votre', 'vos',
  'the', 'and', 'aux', 'ses', 'son', 'sont', 'etes', 'faites',
]);

function motsDeQuestion(question) {
  return plier(question)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(m => m.length >= 3 && !STOP.has(m));
}

// ── Execution ──
let total = 0;
let reussites = 0;
const echecs = [];

for (const [nomFormat, contenu] of Object.entries(FORMATS)) {
  const structure = detecterStructure(contenu);
  const fiches = construireFiches(contenu);
  console.log(`\n══════ ${nomFormat} — structure : ${structure.type} (separateur ${JSON.stringify(structure.separateur)}), ${fiches.length} fiches`);

  if (structure.type !== 'tableau') {
    echecs.push(`${nomFormat} : structure non reconnue comme tableau`);
    continue;
  }

  for (const cas of QUESTIONS) {
    total++;
    const mots = motsDeQuestion(cas.q);
    const classees = classerFiches(fiches, mots);
    const meilleure = classees[0];
    const ambigu = detecterAmbiguite(classees);

    // Le libelle de la fiche porte legitimement sa precision entre parentheses
    // (« Vidange essence (filtre inclus) ») : on exige qu'il COMMENCE par le
    // libelle attendu, pas qu'il lui soit identique.
    const ok = meilleure
      && plier(meilleure.libelle).startsWith(plier(cas.libelle))
      && meilleure.texte.includes(cas.attendu);

    // Invariant : aucun montant orphelin — le texte rendu porte toujours le libelle.
    const invariantOk = !meilleure || meilleure.texte.startsWith(meilleure.libelle.charAt(0).toUpperCase() + meilleure.libelle.slice(1));

    // Quand une ambiguite est attendue, elle DOIT se declencher : repondre un
    // seul chiffre sur « plaquettes avant » (149 ou 289 ?) serait faux une fois
    // sur deux. Et quand elle n'est pas attendue, elle ne doit PAS se
    // declencher, sinon l'agent pose une question pour rien.
    const ambiguiteConforme = cas.ambiguAttendu
      ? !!ambigu && plier(ambigu[1].libelle).startsWith(plier(cas.ambiguAttendu))
      : !ambigu;

    if (ok && invariantOk && ambiguiteConforme) {
      reussites++;
      const marque = ambigu ? ` [+ clarification : « ${ambigu[1].texte} »]` : '';
      console.log(`  ✅ ${cas.q}\n       → ${meilleure.texte}${marque}`);
    } else {
      const detail = meilleure
        ? `obtenu « ${meilleure.texte} » (score ${meilleure.score.toFixed(2)})`
          + (cas.ambiguAttendu && !ambigu ? ' — AUCUNE clarification alors qu\'elle est exigee' : '')
          + (!cas.ambiguAttendu && ambigu ? ` — clarification parasite avec « ${ambigu[1].libelle} »` : '')
        : 'aucune fiche';
      console.log(`  ❌ ${cas.q}\n       attendu ${cas.attendu} sur « ${cas.libelle} », ${detail}`);
      console.log(`       suivantes : ${classees.slice(1, 4).map(f => `${f.libelle} (${f.score.toFixed(2)})`).join(' | ') || '—'}`);
      echecs.push(`${nomFormat} / ${cas.q}`);
    }
  }
}

// ── Un texte redige ne doit PAS etre traite comme un tableau ──
const PROSE = `Notre garage est ouvert du lundi au vendredi, de 8h a 19h.
Nous realisons l entretien courant, la revision et le remplacement des pneumatiques.
La vidange essence est facturee 89 euros, filtre inclus.
Prenez rendez-vous par telephone, nous vous rappelons sous 24 heures.`;
const structureProse = detecterStructure(PROSE);
const fichesProse = construireFiches(PROSE);
console.log(`\n══════ garde-fou prose — structure : ${structureProse.type}, ${fichesProse.length} fiche(s)`);
if (structureProse.type !== 'prose' || fichesProse.length !== 0) {
  echecs.push('garde-fou prose : un texte redige a ete pris pour un tableau');
  console.log('  ❌ un texte redige a ete pris pour un tableau — le chemin prose serait court-circuite');
} else {
  console.log('  ✅ laisse au chemin prose existant, inchange');
}

// ── Correction d'une fiche : on reecrit LA LIGNE DU DOCUMENT ──
// C'est l'invariant du chantier CX-2. Si la correction n'atterrit pas dans le
// contenu du document, elle sera effacee a la premiere re-ingestion.
console.log(`\n══════ correction d'une fiche (reecriture de la ligne source)`);

function verifier(nom, condition, detail = '') {
  total++;
  if (condition) { reussites++; console.log(`  ✅ ${nom}`); }
  else { echecs.push(`${nom}${detail ? ' — ' + detail : ''}`); console.log(`  ❌ ${nom} ${detail}`); }
}

const fichesCsv = construireFiches(CSV);
const montage = fichesCsv.find(f => plier(f.libelle).startsWith('montage equilibrage'));

verifier('la fiche porte son index de ligne source',
  montage && Number.isInteger(montage.ligne));
verifier('cet index designe bien la ligne du fichier',
  montage && plier(CSV.split('\n')[montage.ligne]).includes('montage equilibrage'),
  montage ? `ligne ${montage.ligne} = ${JSON.stringify(CSV.split('\n')[montage.ligne])}` : '');

const corrige = reecrireLigneFiche(CSV, montage.ligne, { prix: '18 EUR' });
verifier('la reecriture aboutit', !!corrige);
verifier('la ligne corrigee porte le nouveau prix',
  corrige && corrige.apres.includes('18 EUR'), corrige ? corrige.apres : '');
verifier('le libelle est intact', corrige && corrige.apres.includes('Montage equilibrage'));
verifier('les autres lignes ne bougent pas',
  corrige && corrige.contenu.split('\n').filter((l, i) => i !== montage.ligne)
    .join('\n') === CSV.split('\n').filter((l, i) => i !== montage.ligne).join('\n'));

const refiches = construireFiches(corrige?.contenu || '');
const remontage = refiches.find(f => plier(f.libelle).startsWith('montage equilibrage'));
verifier('la re-ingestion restitue 18 euros',
  remontage && remontage.texte.includes('18 euros'), remontage ? remontage.texte : '');
verifier('le nombre de fiches est inchange', refiches.length === fichesCsv.length,
  `${refiches.length} vs ${fichesCsv.length}`);

// Une valeur contenant le separateur ne doit pas fabriquer une colonne de plus.
const piege = reecrireLigneFiche(CSV, montage.ligne, { details: 'Par pneu, jantes alu comprises' });
const fichesPiege = construireFiches(piege?.contenu || '');
verifier('une valeur contenant une virgule ne casse pas la ligne',
  fichesPiege.length === fichesCsv.length, `${fichesPiege.length} fiches`);
verifier('...et se relit entiere',
  fichesPiege.some(f => f.details === 'Par pneu, jantes alu comprises'));

// L'en-tete n'est pas une fiche : le reecrire renommerait les colonnes.
verifier('l\'en-tete est refuse', reecrireLigneFiche(CSV, 0, { prix: '1 EUR' }) === null);
verifier('une ligne hors tableau est refusee',
  reecrireLigneFiche(PROSE, 1, { prix: '1 EUR' }) === null);

const suppr = supprimerLigneFiche(CSV, montage.ligne);
verifier('la suppression retire la ligne', suppr
  && construireFiches(suppr.contenu).length === fichesCsv.length - 1);
verifier('...et seulement celle-la',
  suppr && !construireFiches(suppr.contenu).some(f => plier(f.libelle).startsWith('montage equilibrage')));

console.log(`\n═══════════════════════════════════════════`);
console.log(`RESULTAT : ${reussites}/${total} restitutions exactes`);
if (echecs.length) {
  console.log(`ECHECS (${echecs.length}) :`);
  for (const e of echecs) console.log('  - ' + e);
  process.exit(1);
}
console.log('Tous les formats donnent le meme chiffre. Invariant tenu.');

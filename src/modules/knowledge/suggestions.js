// Chips de suggestion de la page « Ce que sait votre assistant » (CX-2).
//
// REGLE DU PRODUIT : on ne suggere que ce qui a une REPONSE. Une chip qui
// aboutit a « je n'ai pas cette information » est pire que pas de chip du tout —
// elle apprend au client que son assistant ne sait rien, sur la page meme qui
// doit lui prouver le contraire.
//
// D'ou la construction : les questions sont fabriquees A PARTIR du contenu reel
// du tenant, jamais d'une liste ecrite d'avance. Une question batie sur le
// libelle d'une fiche touche forcement ce libelle a la recherche, ce qui est
// exactement la condition du niveau fiche (garde-fou de _repondreDepuisFiches).
//
// Le secteur ne sert qu'a TOURNER la phrase. Il ne peut pas ajouter de question :
// il ne connait pas la base du client.

import { normalizeSector } from '../shared/sector-prompts.js';

/** Nombre de chips affichees simultanement (maquette : une rangee). */
export const MAX_CHIPS = 5;

/** Au-dela, le libelle ne tient plus dans une pilule. */
const MAX_LONGUEUR_LIBELLE = 34;

/**
 * Comment on demande un prix, selon le metier. Un garagiste dit « Prix », un
 * cabinet dit « Honoraires ». Le defaut convient a la majorite des secteurs.
 */
const PREFIXE_PRIX = {
  juridique: 'Honoraires',
  sante: 'Tarif',
  immobilier: 'Honoraires',
  syndic: 'Charges',
};

function prefixePrix(secteur) {
  return PREFIXE_PRIX[normalizeSector(secteur)] || 'Prix';
}

/** Identifiant stable d'une chip — sert a l'exclure une fois utilisee. */
export function idChip(question) {
  return String(question || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function raccourcir(libelle) {
  // Le contenu entre parentheses est une precision (« main d'oeuvre incluse »,
  // « filtre inclus »), pas le nom de la prestation : personne ne le prononce
  // en posant la question. On le retire AVANT de mesurer, sinon la troncature
  // tombe dedans et produit « Forfait plaquettes avant (main d ? ».
  const l = String(libelle || '').replace(/\([^)]*\)?/g, ' ').replace(/\s+/g, ' ').trim();
  if (l.length <= MAX_LONGUEUR_LIBELLE) return l;
  const coupe = l.slice(0, MAX_LONGUEUR_LIBELLE);
  const espace = coupe.lastIndexOf(' ');
  return (espace > 12 ? coupe.slice(0, espace) : coupe).trim();
}

function majuscule(texte) {
  const t = String(texte || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/** Mots qui ne distinguent pas une question d'une autre. */
const MOTS_VIDES = new Set([
  'prix', 'tarif', 'tarifs', 'honoraires', 'charges', 'votre', 'vos', 'numero',
]);

/** Les mots qui font le SUJET d'une question. */
function motsCles(label) {
  return new Set(String(label || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(m => m.length >= 4 && !MOTS_VIDES.has(m)));
}

/**
 * Ajoute une chip SI elle apporte un sujet nouveau.
 *
 * Deduper sur l'identifiant ne suffit pas : « Adresse ? » (une fiche) et
 * « Adresse et localisation ? » (un document) ont deux identifiants distincts
 * et la meme reponse. Deux chips pour une reponse, c'est une place perdue sur
 * les cinq. On compare donc les SUJETS : si l'un est contenu dans l'autre, on
 * garde le premier arrive — les fiches passent avant les documents, et ce sont
 * elles qui repondent le plus precisement.
 */
function ajouter(candidats, chip) {
  const sujets = motsCles(chip.label);
  if (!sujets.size) return;
  for (const existant of candidats) {
    const autres = motsCles(existant.label);
    const inclus = [...sujets].every(m => autres.has(m))
      || [...autres].every(m => sujets.has(m));
    if (inclus) return;
  }
  candidats.push(chip);
}

/**
 * Construit les suggestions d'un tenant.
 *
 * @param {string[]} exclure identifiants deja servis (rotation)
 */
export async function construireSuggestions(env, tenantId, exclure = []) {
  const dejaVus = new Set(exclure.filter(Boolean));
  const candidats = [];
  const libellesVus = new Set();
  // Compteurs par categorie — ils alimentent les filtres de la carte « Vos
  // informations ». Ils sortent d'ici parce qu'on lit deja toutes les fiches :
  // une seconde requete pour les memes lignes serait du gaspillage, et deux
  // comptages independants finiraient par se contredire.
  const categories = new Map();
  let fichesActives = 0;

  const tenant = await env.DB.prepare(
    'SELECT sector, phone, address, horaires FROM tenants WHERE id = ?',
  ).bind(tenantId).first().catch(() => null);
  const secteur = tenant?.sector || 'generaliste';

  // ── 1. Les fiches : une fiche = une reponse garantie ──
  const fiches = await env.DB.prepare(`
    SELECT kc.metadata
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
     WHERE kc.tenant_id = ? AND kd.is_active = 1
     LIMIT 300
  `).bind(tenantId).all().catch(() => ({ results: [] }));

  for (const ligne of fiches.results || []) {
    let meta = null;
    try { meta = JSON.parse(ligne.metadata || '{}'); } catch { continue; }
    if (!meta || meta.type !== 'fiche' || !meta.libelle) continue;

    fichesActives++;
    const cat = String(meta.categorie || '').trim() || 'Autres';
    categories.set(cat, (categories.get(cat) || 0) + 1);

    const cle = meta.libelle.toLowerCase();
    if (libellesVus.has(cle)) continue;
    libellesVus.add(cle);

    const court = raccourcir(meta.libelle);
    // Avec un prix, la question naturelle porte sur le prix. Sans prix, le
    // libelle EST la question (« Horaires ? », « Vehicule de courtoisie ? »).
    const question = meta.prix
      ? `${prefixePrix(secteur)} ${court.toLowerCase()} ?`
      : `${majuscule(court)} ?`;

    ajouter(candidats, {
      id: idChip(question),
      label: majuscule(question),
      // Une fiche avec prix est ce que le client verifiera en premier.
      famille: meta.prix ? 'tarif' : 'info',
    });
  }

  // ── 2. Les coordonnees, servies par _answerFromTenantContact ──
  // Elles ne vivent pas dans la base de connaissances mais dans `tenants` :
  // l'agent sait y repondre, donc la chip a bien une reponse.
  //
  // Sauf si une FICHE couvre deja le sujet : le catalogue de Garage Toulouse
  // porte une ligne « Horaires », qui donnerait « Horaires ? » a cote de
  // « Vos horaires ? ». Deux chips pour la meme reponse, c'est une place
  // gachee sur les cinq.
  const libellesPlies = [...libellesVus].map(l => l.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const dejaCouvert = (mot) => libellesPlies.some(l => l.includes(mot));
  const contacts = [
    { presente: !!tenant?.horaires && !dejaCouvert('horaire'), question: 'Vos horaires ?' },
    { presente: !!tenant?.address && !dejaCouvert('adresse'), question: 'Votre adresse ?' },
    { presente: !!tenant?.phone && !dejaCouvert('telephone'), question: 'Votre numéro de téléphone ?' },
  ];
  for (const c of contacts) {
    if (!c.presente) continue;
    ajouter(candidats, { id: idChip(c.question), label: c.question, famille: 'contact' });
  }

  // ── 3. Les documents rediges : leur titre fait une question acceptable ──
  const docs = await env.DB.prepare(`
    SELECT title FROM knowledge_documents
     WHERE tenant_id = ? AND is_active = 1 AND chunk_count = 0
     ORDER BY created_at DESC LIMIT 20
  `).bind(tenantId).all().catch(() => ({ results: [] }));

  for (const d of docs.results || []) {
    const titre = String(d.title || '').trim();
    // Un titre de fichier (« tarifs.csv ») n'est pas une question.
    if (!titre || /\.(csv|txt|md|pdf|xlsx?)$/i.test(titre)) continue;
    const question = `${majuscule(raccourcir(titre))} ?`;
    ajouter(candidats, { id: idChip(question), label: question, famille: 'document' });
  }

  const restants = candidats.filter(c => !dejaVus.has(c.id));

  // ── Panachage ──
  // Un tri par poids puis alphabetique donnait cinq « Prix ... » d'affilee, tous
  // en « b » et « c », et ne montrait JAMAIS les horaires : le client teste cinq
  // fois la meme chose et croit que son assistant ne sait faire que des tarifs.
  // On sert donc un tour de chaque famille, en commencant par les tarifs (ce que
  // le client vient verifier). L'ordre reste DETERMINISTE : deux appels avec la
  // meme exclusion rendent la meme rangee, aucune chip ne saute sous les doigts.
  const familles = ['tarif', 'contact', 'info', 'document'];
  const paniers = familles.map(f => restants
    .filter(c => c.famille === f)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr')));

  const panachees = [];
  for (let tour = 0; panachees.length < restants.length; tour++) {
    let servi = false;
    for (const panier of paniers) {
      if (tour < panier.length) { panachees.push(panier[tour]); servi = true; }
      if (panachees.length >= restants.length) break;
    }
    if (!servi) break;
  }

  return {
    suggestions: panachees.slice(0, MAX_CHIPS),
    // Ce qui permet au front de savoir si « Autres questions » a encore
    // quelque chose a servir, sans deviner.
    restantes: Math.max(0, restants.length - MAX_CHIPS),
    total: candidats.length,
    // Etat reel de la base, pour la carte « Vos informations ».
    fiches: fichesActives,
    categories: [...categories.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'fr')),
  };
}

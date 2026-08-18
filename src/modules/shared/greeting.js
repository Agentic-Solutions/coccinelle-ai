/**
 * La phrase d'accueil — SOURCE UNIQUE (chantier PRENOM, 18/08/2026).
 *
 * ── POURQUOI CE FICHIER ──
 * La phrase que l'agent prononce au decrochage etait ecrite DEUX FOIS, dans deux
 * langages : en Python (`voixia/agent/prompts.py`) pour ce qui est reellement dit, et
 * en TypeScript (`app/dashboard/assistant/page.tsx`) pour ce que la page montre au
 * client. Deux formulations a garder synchronisees a la main, sans rien pour le
 * verifier. Le 13/08 elles avaient deja diverge : la page annoncait un prenom que
 * l'agent ne prononcait pas.
 *
 * Desormais le backend construit la phrase et la sert :
 *   — a l'agent, par `resolve-phone` (champ `greeting`) — il la PRONONCE, il ne la
 *     fabrique plus ;
 *   — a la page, par `GET /assistant/config` (champ `greeting`) — pour l'etat
 *     enregistre.
 *
 * ⚠️ Il reste une copie TypeScript, et c'est VOULU : la page met la phrase a jour
 * PENDANT LA FRAPPE, avant tout enregistrement — c'est l'interet de cette page, et
 * elle ne peut donc pas se contenter d'un champ renvoye par le serveur. Cette copie
 * est verrouillee par `scripts/test_greeting.mjs` : 18 prenoms x 14 secteurs, la
 * fonction TypeScript et celle-ci doivent rendre la MEME chaine, caractere pour
 * caractere. Une divergence casse `npm test`.
 *
 * ⚠️ CETTE PHRASE PART AU TTS. Les accents sont obligatoires (« a votre ecoute » se
 * ferait lire « a », verbe, au lieu de « à »), et la ponctuation compte.
 */

/**
 * Prefixe d'etablissement par secteur.
 *
 * Transcrit de `SECTOR_ESTABLISHMENT` (`voixia/agent/prompts.py`), qui reste en place
 * comme repli quand `greeting` n'est pas fourni. Les deux tables doivent rester
 * identiques ; `scripts/test_greeting.mjs` compare la version TypeScript, et le repli
 * Python n'est atteint que par un agent non redeploye.
 *
 * `''` = pas de prefixe metier -> repli neutre « Entreprise … ».
 */
export const PREFIXE_SECTEUR = {
  immobilier: 'Agence',
  sante: 'Cabinet médical',
  dentiste: 'Cabinet dentaire',
  restaurant: 'Restaurant',
  automobile: 'Garage',
  beaute: 'Salon',
  fitness: 'Salle de sport',
  ecommerce: 'Boutique',
  // avocat/conseil ; notaire (« Etude ») est indistinguable au niveau du secteur
  juridique: 'Cabinet',
  education: 'Centre de formation',
  syndic: 'Syndic',
  artisan: '',        // neutre — « Entreprise Dupont » sonne mal
  generaliste: '',
  autre: '',
};

/**
 * Mots qui designent deja un type d'etablissement.
 *
 * Sans cette garde : « Garage Garage Dupont ». Comparaison par mot ENTIER et sans
 * accents — « Etude » et « Étude » sont le meme mot, et « garagiste » n'est pas
 * « garage ».
 */
const MOTS_ETABLISSEMENT = new Set([
  'garage', 'cabinet', 'etude', 'agence', 'salon', 'restaurant', 'resto',
  'boutique', 'entreprise', 'societe', 'centre', 'ecole', 'clinique',
  'salle', 'club', 'atelier', 'institut', 'pharmacie', 'hotel', 'studio',
  'brasserie', 'maison', 'sarl', 'sas', 'eurl', 'notaire', 'notarial', 'office',
  'syndic',
]);

const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Nom de l'entreprise tel qu'il doit etre prononce en tete de phrase.
 *
 * Ex. (automobile, « AMROUCHE »)      -> « Garage AMROUCHE »
 *     (automobile, « Garage Dupont ») -> « Garage Dupont »  (inchange)
 *     (generaliste, « AMROUCHE »)     -> « Entreprise AMROUCHE »
 */
export function formaterEntreprise(companyName, secteur) {
  const nom = String(companyName || '').trim();
  if (!nom) return '';

  const mots = new Set(sansAccents(nom).toLowerCase().match(/[a-z]+/g) || []);
  for (const m of mots) {
    if (MOTS_ETABLISSEMENT.has(m)) return nom;   // deja un etablissement
  }

  const prefixe = PREFIXE_SECTEUR[secteur] || '';
  if (prefixe) return `${prefixe} ${nom}`;
  // Tete de phrase (« …, bonjour ! ») -> capitale, sans article.
  return `Entreprise ${nom}`;
}

/**
 * La phrase d'accueil complete.
 *
 * ⚠️ SANS NOM D'ENTREPRISE, ON NE DIT AUCUNE RAISON SOCIALE. C'est le Lot B : la
 * valeur de repli de l'agent etait `"VoixIA"`, le nom de l'EDITEUR, et un client du
 * Garage Toulouse s'est entendu repondre « VoixIA » le 18/08 apres un echec de
 * resolution. Mieux vaut une phrase neutre qu'une identite qui n'est pas la sienne.
 *
 * ⚠️ SANS PRENOM, on retombe sur la formulation historique plutot que de laisser un
 * trou au milieu de la phrase (« Garage Toulouse, bonjour !  à votre écoute »).
 */
export function construireGreeting({ companyName, secteur, agentName } = {}) {
  const entreprise = formaterEntreprise(companyName, secteur);
  if (!entreprise) return 'Bonjour ! Comment puis-je vous aider ?';

  const prenom = String(agentName || '').trim();
  if (!prenom) return `${entreprise}, bonjour ! Comment puis-je vous aider ?`;

  return `${entreprise}, bonjour ! ${prenom} à votre écoute, que puis-je faire pour vous ?`;
}

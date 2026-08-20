/**
 * La phrase d'accueil — COPIE FRONT, verrouillee par un test (chantier PRENOM, 18/08/2026).
 *
 * ── POURQUOI UNE COPIE, ALORS QU'ON VIENT DE SUPPRIMER LES DOUBLONS ──
 * La source est `src/modules/shared/greeting.js`, cote Worker. C'est elle qui sert la
 * phrase a l'agent vocal (`resolve-phone`) et a la page (`GET /assistant/config`).
 *
 * Mais la page « Mon Assistant » met la phrase a jour PENDANT LA FRAPPE, avant tout
 * enregistrement — c'est l'interet de la page : on voit ce que l'assistant dira en
 * tapant. Un aller-retour serveur par caractere est exclu, donc il faut la formule ici.
 *
 * Ce qui change par rapport a l'ancien etat : cette copie n'est plus libre. Un test
 * (`scripts/test_greeting.mjs`, dans `npm test`) compare les deux implementations sur
 * **18 prenoms x 14 secteurs** et exige la MEME chaine, caractere pour caractere. Une
 * divergence casse la recette au lieu de se decouvrir a l'oral six semaines plus tard —
 * ce qui s'est produit le 13/08, la page annoncant un prenom que l'agent ne disait pas.
 *
 * ⚠️ TOUTE MODIFICATION ICI DOIT ETRE FAITE DANS `src/modules/shared/greeting.js`.
 * ⚠️ Cette phrase part au TTS : les accents sont obligatoires (« a votre ecoute » se
 * ferait lire « a », verbe, au lieu de « à »).
 */

/** Prefixe d'etablissement par secteur. `''` = repli neutre « Entreprise … ». */
export const PREFIXE_SECTEUR: Record<string, string> = {
  immobilier: 'Agence',
  sante: 'Cabinet médical',
  dentiste: 'Cabinet dentaire',
  restaurant: 'Restaurant',
  automobile: 'Garage',
  beaute: 'Salon',
  fitness: 'Salle de sport',
  ecommerce: 'Boutique',
  juridique: 'Cabinet',
  education: 'Centre de formation',
  syndic: 'Syndic',
  artisan: '',
  generaliste: '',
  autre: '',
};

/** Mots designant deja un etablissement — evite « Garage Garage Dupont ». */
const MOTS_ETABLISSEMENT = new Set([
  'garage', 'cabinet', 'etude', 'agence', 'salon', 'restaurant', 'resto',
  'boutique', 'entreprise', 'societe', 'centre', 'ecole', 'clinique',
  'salle', 'club', 'atelier', 'institut', 'pharmacie', 'hotel', 'studio',
  'brasserie', 'maison', 'sarl', 'sas', 'eurl', 'notaire', 'notarial', 'office',
  'syndic',
]);

const sansAccents = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Nom de l'entreprise tel qu'il doit etre prononce en tete de phrase. */
export function formaterEntreprise(companyName: string, secteur: string): string {
  const nom = String(companyName || '').trim();
  if (!nom) return '';

  const mots = new Set(sansAccents(nom).toLowerCase().match(/[a-z]+/g) || []);
  for (const m of mots) {
    if (MOTS_ETABLISSEMENT.has(m)) return nom;
  }

  const prefixe = PREFIXE_SECTEUR[secteur] || '';
  if (prefixe) return prefixe + ' ' + nom;
  return 'Entreprise ' + nom;
}

/**
 * La phrase d'accueil complete.
 *
 * Sans nom d'entreprise : phrase neutre, JAMAIS une raison sociale (Lot B — l'agent
 * a decroche en disant « VoixIA » chez un client du Garage Toulouse le 18/08).
 * Sans prenom : formulation historique, plutot qu'un trou au milieu de la phrase.
 */
export function construireGreeting(
  companyName: string,
  secteur: string,
  agentName: string,
): string {
  const entreprise = formaterEntreprise(companyName, secteur);
  if (!entreprise) return 'Bonjour ! Comment puis-je vous aider ?';

  const prenom = String(agentName || '').trim();
  if (!prenom) return entreprise + ', bonjour ! Comment puis-je vous aider ?';

  return entreprise + ', bonjour ! ' + prenom + ' à votre écoute, que puis-je faire pour vous ?';
}

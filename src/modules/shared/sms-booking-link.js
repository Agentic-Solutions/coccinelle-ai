// Lien de reservation dans les SMS sortants — DECISION UNIQUE.
//
// POURQUOI CE MODULE EXISTE
// Un SMS ou une prise de rendez-vous a du sens sans le lien pour la prendre,
// c'est un client perdu a la derniere marche : il a le tarif, il est d'accord,
// et il doit rappeler. Le lien etait ajoute au cas par cas dans un seul chemin
// (le devis) alors qu'une douzaine de chemins envoient des SMS.
//
// La regle d'inclusion vit ICI et nulle part ailleurs. Un nouveau type de SMS
// s'ajoute a TYPES_SMS ; il n'y a aucune raison de recoder « faut-il un lien ? »
// dans un module d'envoi.
//
// EXCLUSIONS : les SMS purement transactionnels ou le rendez-vous est DEJA pris
// (confirmation, rappel) et ceux qui n'ont rien de commercial (code de
// verification). Y glisser un lien de reservation serait au mieux du bruit, au
// pire une invitation a reprendre un second rendez-vous.

import { logger } from '../../utils/logger.js';
import { compacterPourGsm7, compterSms } from './sms-format.js';

/** Base publique des pages de reservation. */
const BASE_PUBLIQUE = 'https://coccinelle.ai';

// Route COURTE : /b/{slug} plutot que /booking/{slug}. Sept caracteres gagnes
// sur chaque SMS, la ou 160 decident du nombre de segments factures.
const CHEMIN_COURT = '/b/';

/**
 * Regle d'inclusion par type de SMS.
 * `true`  = le rendez-vous a du sens, on ajoute le lien.
 * `false` = SMS transactionnel ou le RDV est deja pris, ou hors sujet.
 */
export const TYPES_SMS = {
  // ── Le rendez-vous a du sens ──
  devis: true,              // « voici votre devis » — l'etape suivante est un RDV
  tarif: true,              // reponse a une question de prix
  horaires: true,           // « nous sommes ouverts de… » — donc venez
  rappel_conseiller: true,  // « un conseiller vous rappelle » — il peut aussi reserver
  suivi_appel: true,        // SMS envoye apres un appel
  information: true,        // reponse libre de l'agent vocal (tool send_sms)
  prospection: true,        // campagne proactive
  reponse_sms: true,        // reponse a un SMS entrant
  manuel: true,             // SMS ecrit depuis le dashboard vers un client

  // Un rendez-vous annule est un rendez-vous a REPRENDRE : le SMS d'annulation
  // dit deja « contactez-nous pour reprogrammer ». C'est l'endroit meme ou le
  // lien evite un appel.
  annulation_rdv: true,

  // ── Le rendez-vous est deja pris, ou hors sujet ──
  confirmation_rdv: false,
  rappel_rdv: false,
  verification: false,      // code de verification du numero (tunnel d'inscription)
  interne: false,           // notification a l'equipe, pas au client
  test: false,              // SMS de test declenche depuis le dashboard
};

/**
 * Les types qui NE S'ADRESSENT PAS a un client — donc qui ne doivent PAS apparaitre
 * dans « Mes communications ».
 *
 * ── POURQUOI UNE TABLE, ET PAS UN `if` PAR APPELANT ──
 * `tracerDansConversation()` trace tout envoi portant un `tenantId`, en creant une
 * conversation indexee sur le NUMERO DU DESTINATAIRE. Faire passer le code de
 * verification par la creerait donc, dans la messagerie du dashboard, une
 * « conversation » avec le numero du gerant lui-meme, contenant son propre code a six
 * chiffres. Meme chose pour un SMS de test, ou pour la notification de tache envoyee a
 * un salarie : ce sont des numeros internes, pas des clients.
 *
 * C'est exactement la faute qu'on ne voit qu'en production, et c'est pour ca que la
 * decision vit ICI, a cote de `TYPES_SMS`, et non dans chaque module d'envoi. Ajouter
 * un type interne = ajouter une ligne. Jamais un `if` chez l'appelant.
 *
 * ⚠️ Un type interne est quand meme COMPACTE (GSM-7) et COMPTE par le plafond
 * quotidien : il coute de l'argent comme les autres. Seule la trace est sautee.
 */
export const EST_INTERNE = new Set(['verification', 'interne', 'test']);

/** Ce message s'adresse-t-il a un client ? Un type inconnu est traite comme client. */
export function estPourClient(type) {
  return !EST_INTERNE.has(String(type || ''));
}

/** Type applique quand l'appelant n'en fournit pas : le cas general. */
const TYPE_PAR_DEFAUT = 'information';

export function doitInclureLien(type) {
  const regle = TYPES_SMS[type || TYPE_PAR_DEFAUT];
  // Un type inconnu n'ajoute PAS de lien : on ne devine pas a la place de
  // l'appelant, et un type oublie doit se voir dans les logs, pas dans les SMS.
  return regle === true;
}

/**
 * URL publique de reservation d'un tenant, ou null s'il n'a pas de slug.
 * Ne fabrique JAMAIS une URL a partir d'un slug absent : mieux vaut un SMS sans
 * lien qu'un lien vers « Entreprise introuvable ».
 */
export async function construireLienReservation(env, tenantId) {
  if (!env?.DB || !tenantId) return null;
  try {
    const t = await env.DB.prepare('SELECT slug FROM tenants WHERE id = ?')
      .bind(tenantId).first();
    const slug = (t?.slug || '').trim();
    if (!slug) {
      logger.warn('[SMS] Tenant sans slug — lien de reservation omis', { tenantId });
      return null;
    }
    return `${BASE_PUBLIQUE}${CHEMIN_COURT}${encodeURIComponent(slug)}`;
  } catch (error) {
    logger.warn('[SMS] Lien de reservation indisponible', { tenantId, erreur: error.message });
    return null;
  }
}

/**
 * Ajoute le lien de reservation a un SMS quand son type le justifie.
 *
 * Ne leve jamais et ne bloque jamais l'envoi : en cas de doute, le message part
 * tel quel. Idempotent — un message qui porte deja le lien n'est pas double.
 *
 * @param {object} env
 * @param {{tenantId: string, message: string, type?: string}} options
 * @returns {Promise<string>} le message, enrichi ou inchange
 */
/** Au-dela, on tronque l'enumeration plutot que de payer un segment de plus. */
const MAX_PRESTATIONS_CITEES = 4;

/**
 * Ramene un message a UN SEUL segment quand c'est possible sans mutiler
 * l'information.
 *
 * La troncature se fait sur les separateurs d'enumeration, jamais au milieu
 * d'une prestation : couper « Permutation 25 » laisserait un montant sans
 * libelle, ce que tout le reste du produit s'interdit. Si meme quatre
 * prestations ne tiennent pas, on rend le message tel quel — deux segments
 * valent mieux qu'un devis faux.
 */
export function ajusterAUnSegment(corps, lien) {
  const avecLien = (texte) => (lien ? `${texte.replace(/[\s.]+$/, '')}. RDV : ${lien}` : texte);

  const complet = compacterPourGsm7(avecLien(corps));
  if (compterSms(complet).segments <= 1 || !lien) return complet;

  // On isole la partie enumerative : ce qui suit le premier « : ».
  const sep = corps.indexOf(' : ');
  if (sep === -1) return complet;

  const entete = corps.slice(0, sep + 3);
  const items = corps.slice(sep + 3).split(/,\s*/).map(x => x.trim()).filter(Boolean);
  if (items.length <= 1) return complet;

  for (let n = Math.min(MAX_PRESTATIONS_CITEES, items.length - 1); n >= 1; n--) {
    const candidat = compacterPourGsm7(
      `${entete}${items.slice(0, n).join(', ')}. Devis complet et RDV : ${lien}`,
    );
    if (compterSms(candidat).segments <= 1) return candidat;
  }
  return complet;
}

/**
 * Ajoute le lien de reservation a un SMS quand son type le justifie, puis
 * ajuste le message a un segment.
 *
 * Ne leve jamais et ne bloque jamais l'envoi : en cas de doute, le message part
 * tel quel. Idempotent — un message qui porte deja le lien n'est pas double.
 *
 * @param {object} env
 * @param {{tenantId: string, message: string, type?: string}} options
 * @returns {Promise<string>} le message, enrichi ou inchange
 */
export async function enrichirSmsAvecLien(env, { tenantId, message, type }) {
  const texte = String(message || '');
  try {
    if (!texte.trim()) return texte;

    // Meme sans lien, on rend le message compatible GSM-7 : un seul « ô » ou
    // un « ç » fait tomber la capacite de 160 a 70 caracteres par segment.
    if (!doitInclureLien(type)) return compacterPourGsm7(texte);

    // Deja present (l'appelant l'a compose lui-meme, ou re-enrichissement).
    if (texte.includes('/booking/') || texte.includes('/b/')) return compacterPourGsm7(texte);

    const lien = await construireLienReservation(env, tenantId);
    if (!lien) return compacterPourGsm7(texte);

    return ajusterAUnSegment(texte.trim(), lien);
  } catch (error) {
    logger.warn('[SMS] Enrichissement du lien echoue, message envoye tel quel', {
      tenantId, erreur: error.message,
    });
    return texte;
  }
}

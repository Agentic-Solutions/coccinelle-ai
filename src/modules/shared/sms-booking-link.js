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

/** Base publique des pages de reservation. */
const BASE_PUBLIQUE = 'https://coccinelle.ai';

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
};

/** Type applique quand l'appelant n'en fournit pas : le cas general. */
const TYPE_PAR_DEFAUT = 'information';

/** Un SMS Twilio depasse 160 caracteres = plusieurs segments factures. */
const LONGUEUR_SEGMENT = 160;

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
    return `${BASE_PUBLIQUE}/booking/${encodeURIComponent(slug)}`;
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
export async function enrichirSmsAvecLien(env, { tenantId, message, type }) {
  const texte = String(message || '');
  try {
    if (!texte.trim()) return texte;
    if (!doitInclureLien(type)) return texte;
    // Deja present (l'appelant l'a compose lui-meme, ou re-enrichissement).
    if (texte.includes('/booking/')) return texte;

    const lien = await construireLienReservation(env, tenantId);
    if (!lien) return texte;

    const separateur = /[.!?]$/.test(texte.trim()) ? ' ' : '. ';
    const enrichi = `${texte.trim()}${separateur}Réservez en ligne : ${lien}`;

    // Garde-fou de cout : on n'ajoute pas un segment SMS a un message qui tient
    // deja tout juste. Au-dela, le lien vaut son segment — c'est le but.
    if (texte.length <= LONGUEUR_SEGMENT && enrichi.length > LONGUEUR_SEGMENT * 2) {
      return texte;
    }
    return enrichi;
  } catch (error) {
    logger.warn('[SMS] Enrichissement du lien echoue, message envoye tel quel', {
      tenantId, erreur: error.message,
    });
    return texte;
  }
}

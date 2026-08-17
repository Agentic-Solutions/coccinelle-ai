/**
 * Refus de recevoir des SMS — SOURCE UNIQUE (chantier CONSENTEMENT, 17/08/2026).
 *
 * ── LE CONSTAT QUI A DECLENCHE CE FICHIER ──
 * Diagnostic du 17/08 : aucune trace de consentement dans tout le schema, et surtout
 * AUCUN moyen de refuser. Un client repondant « STOP » voyait son message enregistre
 * comme un message ordinaire, puis interprete par l'IA comme une question. Le refus
 * disparaissait dans le vide.
 *
 * Ne pas traiter un STOP recu est indefendable quel que soit le type de message : la
 * personne a exprime un refus explicite. C'est le point le plus expose des quatre.
 *
 * ── LE REFUS BLOQUE TOUT, CONFIRMATIONS ET RAPPELS INCLUS ──
 * Decision du 17/08/2026. Un refus est un refus : mieux vaut un client qui note son
 * rendez-vous a la main qu'un client qui recoit un SMS apres avoir dit non. La
 * degradation est deja ecrite ailleurs — la page de reservation lit
 * `confirmation_sent` et affiche « Notez bien ce rendez-vous : nous n'avons pas pu vous
 * envoyer le SMS de confirmation ».
 *
 * Seuls les types INTERNES echappent au refus (`verification`, `interne`, `test`) :
 * ils ne s'adressent pas a la personne en tant que contact — le code de verification
 * va au gerant lui-meme, l'alerte a nous.
 */

import { logger } from '../../utils/logger.js';
import { phoneVariants } from '../prospects/dedup.js';

/**
 * Les formulations de refus reconnues.
 *
 * ── POURQUOI SI LARGE ──
 * « Un client qui refuse ne va pas soigner son orthographe. » On accepte donc les
 * accents ou leur absence, la casse, un point final, un espace en trop. La liste
 * couvre les usages francais courants et les mentions AF2M.
 */
const FORMULATIONS_REFUS = new Set([
  'stop', 'stopsms', 'stoppub', 'stopmsg',
  'arret', 'arretsms', 'arretpub',
  'desabonnement', 'desabonner', 'desabonne', 'desinscription', 'desinscrire',
  'unsubscribe', 'optout',
]);

/**
 * Ce message est-il une demande de refus ?
 *
 * ⚠️ On exige que le message ne contienne QUE cela (apres normalisation). Sinon
 * « je ne veux pas que ca s'arrete » ou « stoppez de me faire attendre » seraient pris
 * pour des refus, et on couperait les SMS de quelqu'un qui n'a rien demande. Le faux
 * positif est ici plus grave que le faux negatif : il fait disparaitre un service.
 */
export function estDemandeDeRefus(texte) {
  if (typeof texte !== 'string') return false;
  const nu = texte
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // accents : ARRÊT → ARRET
    .toLowerCase()
    .replace(/[^a-z]/g, '');                            // espaces, points, chiffres
  if (!nu) return false;
  return FORMULATIONS_REFUS.has(nu);
}

/**
 * Enregistre le refus. Idempotent : un second STOP ne cree pas de doublon et ne
 * repousse pas la date — c'est la PREMIERE expression du refus qui compte.
 */
export async function enregistrerRefus(env, { tenantId, phone, message }) {
  if (!env?.DB || !tenantId || !phone) return false;
  try {
    await env.DB.prepare(`
      INSERT INTO sms_refus (tenant_id, phone, refuse_at, source, message)
      VALUES (?, ?, datetime('now'), 'sms_entrant', ?)
      ON CONFLICT (tenant_id, phone) DO NOTHING
    `).bind(tenantId, phone, String(message || '').slice(0, 200)).run();
    logger.warn('[SMS] Refus enregistre', { tenantId, phone });
    return true;
  } catch (error) {
    logger.error('[SMS] Refus NON enregistre', { tenantId, phone, erreur: error.message });
    return false;
  }
}

/**
 * Cette personne a-t-elle refuse ?
 *
 * Le rapprochement passe par `phoneVariants()` de `prospects/dedup.js` — la meme
 * fonction que la deduplication des prospects, pas une seconde implementation. Mesure
 * du 17/08 : 4 des 34 contacts ne sont PAS en E.164 (`0760…` au lieu de `+3376…`).
 * Comparer strictement laisserait passer un SMS a quelqu'un qui a refuse depuis un
 * numero ecrit autrement — le defaut serait invisible et exactement celui qu'on corrige.
 *
 * ⚠️ ECHOUE EN FERMETURE. Si la lecture echoue, on considere le refus PRESENT et on
 * n'envoie pas. C'est l'inverse du plafond quotidien, et c'est deliberé : une panne de
 * base ne doit pas faire envoyer un SMS a quelqu'un qui a dit non. Le cout d'un faux
 * negatif est un message manquant ; celui d'un faux positif est un manquement.
 */
export async function aRefuse(env, tenantId, phone) {
  if (!env?.DB || !tenantId || !phone) return false;
  const variantes = phoneVariants(phone);
  if (!variantes.length) return false;
  try {
    const marques = variantes.map(() => '?').join(', ');
    const ligne = await env.DB.prepare(
      `SELECT 1 AS ok FROM sms_refus WHERE tenant_id = ? AND phone IN (${marques}) LIMIT 1`,
    ).bind(tenantId, ...variantes).first();
    return Boolean(ligne?.ok);
  } catch (error) {
    // ⚠️ DISTINGUER « TABLE ABSENTE » D'UNE PANNE, et c'est un piege de deploiement.
    // Si `sms_refus` n'existe pas encore — backend deploye AVANT la migration 0088 —
    // alors personne n'a jamais pu refuser, donc il n'y a aucun refus a respecter. Ne
    // pas faire cette distinction couperait TOUS les SMS clients pendant la fenetre
    // entre les deux operations, et l'ordre de deploiement deviendrait critique sans
    // que rien ne le dise.
    if (/no such table/i.test(error.message || '')) {
      logger.warn('[SMS] Table sms_refus absente — migration 0088 non appliquee ?', { tenantId });
      return false;
    }
    // Toute AUTRE erreur reste un echec EN FERMETURE : une panne de base ne doit pas
    // faire envoyer un SMS a quelqu'un qui a dit non. C'est l'inverse du plafond, et
    // c'est delibere — le cout d'un message manquant est moindre que celui d'un
    // manquement.
    logger.error('[SMS] Lecture des refus impossible — envoi BLOQUE par precaution', {
      tenantId, erreur: error.message,
    });
    return true;
  }
}

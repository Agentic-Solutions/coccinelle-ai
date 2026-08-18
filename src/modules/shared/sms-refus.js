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
 * personne a exprime un refus explicite.
 *
 * ── LA CLE EST L'EXPEDITEUR, PAS LE TENANT (correction du soir du 17/08) ──
 * La premiere version clait sur `(tenant_id, phone)`. Mesure en production : tous les
 * tenants emettent depuis `+33939035760`, le webhook resolvait donc le tenant par
 * `omni_phone_mappings` — qui pointe ce numero vers « Coccinelle.ai ». Un STOP repondu
 * a un devis de Garage Toulouse s'enregistrait chez Coccinelle.ai, et Garage Toulouse
 * continuait d'envoyer.
 *
 * On cle desormais sur le NUMERO QUI A RECU LE STOP. C'est ce que la personne a
 * refuse : elle ne connait pas nos tenants, elle voit un numero. Voir la migration
 * 0089 pour le raisonnement complet, notamment pourquoi enumerer « les tenants qui ont
 * deja ecrit » ne suffit pas.
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
 * ── POURQUOI SI LARGE, ET POURQUOI CA COMPTE PLUS QU'IL N'Y PARAIT ──
 * « Un client qui refuse ne va pas soigner son orthographe. » On accepte donc les
 * accents ou leur absence, la casse, un point final, un espace en trop.
 *
 * Surtout : mesure du 17/08/2026, en envoyant les deux mots depuis un vrai combine
 * vers `+33939035760`. « STOP » est intercepte par l'operateur francais (Legos), qui
 * repond lui-meme et ne nous le transmet JAMAIS. « ARRET » traverse et nous parvient.
 * Twilio, de son cote, ne connait que « STOP » et laisse passer « ARRET » sans rien en
 * faire. Autrement dit : les formulations francaises de cette liste sont traitees par
 * NOUS ET PAR PERSONNE D'AUTRE. Retirer une entree d'ici, c'est rendre un refus
 * explicite totalement inoperant.
 */
const FORMULATIONS_REFUS = new Set([
  'stop', 'stopsms', 'stoppub', 'stopmsg',
  'arret', 'arretsms', 'arretpub',
  'desabonnement', 'desabonner', 'desabonne', 'desinscription', 'desinscrire',
  'unsubscribe', 'optout',
]);

/** Le code d'erreur Twilio qui signale un destinataire desabonne. */
export const CODE_TWILIO_DESABONNE = 21610;

/**
 * Ce message est-il une demande de refus ?
 *
 * ⚠️ On exige que le message ne contienne QUE cela (apres normalisation). Sinon
 * « je ne veux pas que ca s'arrete » ou « stoppez de me faire attendre » seraient pris
 * pour des refus, et on couperait les SMS de quelqu'un qui n'a rien demande. Le faux
 * positif est ici plus grave que le faux negatif : il fait disparaitre un service.
 *
 * La normalisation absorbe au passage l'espace final que Twilio nous a effectivement
 * livre le 17/08 (corps recu : `'ARRET '`).
 */
export function estDemandeDeRefus(texte) {
  if (typeof texte !== 'string') return false;
  const nu = texte
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // accents : ARRÊT → ARRET
    .toLowerCase()
    .replace(/[^a-z]/g, '');                           // espaces, points, chiffres
  if (!nu) return false;
  return FORMULATIONS_REFUS.has(nu);
}

/**
 * Enregistre le refus. Idempotent : un second STOP ne cree pas de doublon et ne
 * repousse pas la date — c'est la PREMIERE expression du refus qui compte.
 *
 * @param {object} env
 * @param {{expediteur: string, phone: string, message?: string, source?: string,
 *          tenantsConcernes?: string[]|null}} options
 *   `expediteur` — le numero qui a recu le refus (webhook), ou celui depuis lequel
 *   l'envoi a ete refuse par Twilio (chemin 21610). C'est la cle d'application.
 */
export async function enregistrerRefus(env, {
  expediteur, phone, message, source = 'sms_entrant', tenantsConcernes = null,
}) {
  if (!env?.DB || !expediteur || !phone) return false;
  try {
    await env.DB.prepare(`
      INSERT INTO sms_refus (expediteur, phone, refuse_at, source, message, tenants_concernes)
      VALUES (?, ?, datetime('now'), ?, ?, ?)
      ON CONFLICT (expediteur, phone) DO NOTHING
    `).bind(
      expediteur,
      phone,
      source,
      String(message || '').slice(0, 200),
      tenantsConcernes?.length ? JSON.stringify(tenantsConcernes) : null,
    ).run();
    logger.warn('[SMS] Refus enregistre', { expediteur, phone, source });
    return true;
  } catch (error) {
    logger.error('[SMS] Refus NON enregistre', { expediteur, phone, erreur: error.message });
    return false;
  }
}

/**
 * Cette personne a-t-elle refuse les SMS de cet expediteur ?
 *
 * Le rapprochement passe par `phoneVariants()` de `prospects/dedup.js` — la meme
 * fonction que la deduplication des prospects, pas une seconde implementation. Mesure
 * du 17/08 : 4 des 34 contacts ne sont PAS en E.164 (`0760…` au lieu de `+3376…`).
 * Comparer strictement laisserait passer un SMS a quelqu'un qui a refuse depuis un
 * numero ecrit autrement — le defaut serait invisible et exactement celui qu'on corrige.
 *
 * ⚠️ ECHOUE EN FERMETURE. Si la lecture echoue, on considere le refus PRESENT et on
 * n'envoie pas. C'est l'inverse du plafond, et c'est delibere : une panne de base ne
 * doit pas faire envoyer un SMS a quelqu'un qui a dit non. Le cout d'un faux negatif
 * est un message manquant ; celui d'un faux positif est un manquement.
 */
export async function aRefuse(env, expediteur, phone) {
  if (!env?.DB || !expediteur || !phone) return false;
  const variantes = phoneVariants(phone);
  if (!variantes.length) return false;
  try {
    const marques = variantes.map(() => '?').join(', ');
    const ligne = await env.DB.prepare(
      `SELECT 1 AS ok FROM sms_refus WHERE expediteur = ? AND phone IN (${marques}) LIMIT 1`,
    ).bind(expediteur, ...variantes).first();
    return Boolean(ligne?.ok);
  } catch (error) {
    // ⚠️ DISTINGUER « TABLE ABSENTE » D'UNE PANNE, et c'est un piege de deploiement.
    // Si `sms_refus` n'existe pas encore — backend deploye AVANT la migration — alors
    // personne n'a jamais pu refuser, donc il n'y a aucun refus a respecter. Ne pas
    // faire cette distinction couperait TOUS les SMS clients pendant la fenetre entre
    // les deux operations, et l'ordre de deploiement deviendrait critique sans que
    // rien ne le dise.
    if (/no such table/i.test(error.message || '')) {
      logger.warn('[SMS] Table sms_refus absente — migration 0089 non appliquee ?', { expediteur });
      return false;
    }
    // ⚠️ ET DISTINGUER « COLONNE ABSENTE », pour la meme raison, appliquee a la
    // MIGRATION 0089 elle-meme : entre le deploiement du Worker et l'application de la
    // migration, la table existe encore sous son ancienne forme `(tenant_id, phone)` et
    // la requete echoue sur `no such column: expediteur`. Traiter ca comme une panne
    // couperait tous les SMS clients pendant la fenetre — exactement ce que la garde
    // precedente evite deja pour la table entiere.
    if (/no such column/i.test(error.message || '')) {
      logger.warn('[SMS] Schema sms_refus obsolete — migration 0089 non appliquee ?', { expediteur });
      return false;
    }
    // Toute AUTRE erreur reste un echec EN FERMETURE.
    logger.error('[SMS] Lecture des refus impossible — envoi BLOQUE par precaution', {
      expediteur, erreur: error.message,
    });
    return true;
  }
}

/**
 * Quels tenants ecrivaient a ce contact au moment du refus ?
 *
 * ⚠️ PUREMENT INFORMATIF. Cette liste n'est JAMAIS lue pour decider d'un envoi — c'est
 * tout l'objet de la migration 0089 : decider a partir d'une liste de tenants laisse
 * passer celui qui ecrit pour la premiere fois APRES le refus. Elle sert a repondre
 * « qui cela concernait-il ? », et a rendre les refus migrables le jour ou chaque
 * tenant aura son propre numero.
 *
 * Ne leve jamais : une liste absente ne doit pas empecher d'enregistrer un refus.
 */
export async function tenantsAyantEcrit(env, phone) {
  if (!env?.DB || !phone) return [];
  const variantes = phoneVariants(phone);
  if (!variantes.length) return [];
  try {
    const marques = variantes.map(() => '?').join(', ');
    const res = await env.DB.prepare(
      `SELECT DISTINCT tenant_id FROM omni_conversations
       WHERE client_phone IN (${marques}) AND tenant_id IS NOT NULL`,
    ).bind(...variantes).all();
    return (res?.results || []).map((r) => r.tenant_id).filter(Boolean);
  } catch (error) {
    logger.warn('[SMS] Tenants concernes non determines', { erreur: error.message });
    return [];
  }
}

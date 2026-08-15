// L'e-mail vers les CLIENTS est coupe — barriere unique (15/08/2026).
//
// DECISION PRODUIT : Coccinelle ne parle jamais d'e-mail a ses clients. Le
// produit, c'est la voix et le SMS apres appel. La reception et la reponse
// automatique reviendront avec MailIA, brique separee partagee avec leoo.io.
//
// POURQUOI UNE BARRIERE ET PAS DES SUPPRESSIONS PARTOUT
// Trois chemins d'envoi AUTOMATIQUE ont ete supprimes a la source, parce qu'ils
// partaient tout seuls : la confirmation de rendez-vous
// (`utils/notifications.js`), le rappel (`modules/reminders/routes.js`) et la
// regle omnicanal `send_email` (`modules/omnicanal/orchestrator.js`).
//
// Restent des ROUTES d'envoi manuel, qu'aucune page n'appelle aujourd'hui mais
// qui repondent : `/api/v1/email/send`, `/api/v1/channels/email/send`,
// `/api/v1/omnichannel/email/send`. Les supprimer emporterait la plomberie que
// MailIA reutilisera ; les laisser ouvertes laisserait un chemin par lequel un
// client peut recevoir un e-mail. On les barre donc en tete, comme le kill switch
// WhatsApp du Lot 0 — meme forme, meme raison.
//
// ⚠️ CE QUI N'EST PAS CONCERNE : nos e-mails a NOUS, qui ne sont pas une fonction
// vendue et ne s'adressent pas aux clients de nos clients.
//   — verification d'adresse a l'inscription   `modules/auth/routes.js`
//   — mot de passe oublie                      `modules/auth/routes.js`
//   — invitation d'equipe                      `modules/users/routes.js`
//   — tickets vers support@coccinelle.ai       `modules/support/routes.js`
//   — notifications de conformite au revendeur `modules/compliance/notify.js`
//   — recapitulatif hebdomadaire a l'UTILISATEUR `modules/reports/routes.js`
// Aucun de ces chemins ne passe par cette barriere.

import { logger } from '../../utils/logger.js';

/** Motif rendu a l'appelant. Il dit ce qui se passe, pas « erreur ». */
export const MOTIF_EMAIL_COUPE =
  'Canal e-mail indisponible : Coccinelle ne contacte plus les clients par e-mail.';

/**
 * Reponse a rendre par une route d'envoi d'e-mail vers un client.
 *
 * 403 et non 404 : la route existe et l'appelant est peut-etre legitime — c'est
 * la CAPACITE qui est retiree, pas le chemin. Un 404 enverrait chercher une
 * faute de frappe.
 */
export function refuserEmailClient(contexte = {}) {
  logger.info('[E-mail] Envoi vers un client refuse — hors perimetre', contexte);
  return new Response(
    JSON.stringify({ success: false, error: MOTIF_EMAIL_COUPE, hors_perimetre: true }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );
}

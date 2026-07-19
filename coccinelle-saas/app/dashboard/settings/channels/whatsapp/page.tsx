import { redirect } from 'next/navigation';

/**
 * WhatsApp V1 gelé — Lot 0 sécurisation (19/07/2026), voir WHATSAPP_V2_PLAN.md
 *
 * Cette route hébergeait une page de configuration (718 lignes) qui annonçait
 * « Votre compte WhatsApp est connecté et opérationnel » et proposait un faux
 * OAuth (setTimeout de 2 s + numéro codé en dur), alors que le canal n'a jamais
 * fonctionné en production. Elle contredisait /dashboard/channels/whatsapp, qui
 * affiche correctement « Bientôt disponible ».
 *
 * On redirige vers cette dernière plutôt que de maintenir deux pages opposées.
 * Le contenu d'origine reste dans l'historique git (commit ac8466c et suivants)
 * si la V2 veut en récupérer des morceaux d'UI.
 */
export default function WhatsAppSettingsRedirect() {
  redirect('/dashboard/channels/whatsapp');
}

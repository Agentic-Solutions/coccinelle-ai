/**
 * Kill switch WhatsApp — Lot 0 sécurisation (19/07/2026)
 *
 * WhatsApp V1 est gelé en attendant la V2 (voir WHATSAPP_V2_PLAN.md).
 * Motif : le webhook Meta ne vérifie aucune signature X-Hub-Signature-256 et
 * retombe sur « premier tenant actif » quand le numéro entrant est inconnu
 * → un POST non authentifié pouvait être attribué à un tenant arbitraire,
 * charger SA base de connaissances et déclencher un envoi.
 *
 * Le flag est DÉSACTIVÉ PAR DÉFAUT : absent de wrangler.toml = coupé.
 * Ne l'activer qu'en recette du Lot 5, une fois la vérification de signature
 * et la résolution stricte du tenant en place.
 */

export function isWhatsAppEnabled(env) {
  return env?.WHATSAPP_ENABLED === 'true';
}

/**
 * 404 volontaire (et non 403) : ne pas confirmer l'existence de la route.
 */
export function whatsappDisabledResponse() {
  return new Response('Not Found', { status: 404 });
}

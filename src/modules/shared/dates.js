/**
 * Dates NAIVES cote Worker — pendant de `coccinelle-saas/lib/dates.ts`.
 *
 * ── POURQUOI DEUX FICHIERS ──
 * Le Worker et le Next n'ont aucun module en commun : ni chemin partage, ni build
 * commun. Un seul fichier est donc impossible. Ce qui est possible, et ce que fait
 * `scripts/test_dates.mjs`, c'est de VERIFIER QUE LES DEUX S'ACCORDENT sur les memes
 * cas. Sans ce test, elles divergeraient — c'est exactement ce qui est arrive aux
 * prompts sectoriels, ou trois sources ont vecu des mois en desaccord.
 *
 * Ce module est volontairement PLUS PETIT que son homologue front : cote Worker, on
 * n'affiche rien. On n'extrait que des composantes (heure, jour de la semaine), et
 * c'est tout ce dont les deux sites concernes ont besoin.
 *
 * ── LE DEFAUT QU'IL EMPECHE ──
 * `appointments.scheduled_at` vaut « 2026-08-17T14:30:00 » : heure murale, deja
 * locale, AUCUN decalage. Un Worker Cloudflare tourne en UTC, donc
 * `new Date(naif)` y place les composantes en UTC. Les relire par `getUTCHours()`
 * rend la bonne heure — juste, mais par COMPENSATION : deux erreurs qui s'annulent
 * parce que le runtime est en UTC. Le jour ou ce n'est plus vrai, tout bascule
 * ensemble et sans bruit. Ces fonctions ne dependent d'aucun fuseau : elles lisent
 * le texte.
 *
 * ⚠️ Et le vrai piege, celui qui a frappe TROIS fois : appliquer un `timeZone` a une
 * date naive. `toLocaleString(..., { timeZone: 'Europe/Paris' })` sur « 14:30 » rend
 * « 16:30 » depuis un Worker. La regle 10quinquies interdit le `timeZone`, pas le
 * `new Date()` — c'est cette lecture-la qui manquait.
 */

/**
 * Lit une date-heure naive SANS construire de `Date`.
 * Tolerante : separateur `T` ou espace, secondes optionnelles.
 * @returns {{annee:number,mois:number,jour:number,heures:number,minutes:number,secondes:number}|null}
 */
export function lireDateNaive(valeur) {
  if (typeof valeur !== 'string') return null;
  const m = valeur.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const d = {
    annee: Number(m[1]), mois: Number(m[2]), jour: Number(m[3]),
    heures: Number(m[4] ?? 0), minutes: Number(m[5] ?? 0), secondes: Number(m[6] ?? 0),
  };
  if (d.mois < 1 || d.mois > 12 || d.jour < 1 || d.jour > 31) return null;
  if (d.heures > 23 || d.minutes > 59 || d.secondes > 59) return null;
  return d;
}

/** Minutes depuis minuit — la forme dont les calculs de creneaux ont besoin. */
export function minutesDepuisMinuit(valeur) {
  const d = lireDateNaive(valeur);
  return d ? d.heures * 60 + d.minutes : null;
}

/**
 * Jour de la semaine CANONIQUE : 1 = lundi … 7 = dimanche.
 *
 * C'est la convention de `availability_slots.day_of_week`, validee par
 * `availability/routes.js:91`. Ce n'est PAS celle de `getDay()` (0 = dimanche) :
 * les confondre a rendu le dimanche toujours indisponible dans
 * `twilio/conversation.js`, et decale d'un jour entier deux endroits du module
 * `retell`. Lundi a samedi coincident, ce qui rend le defaut invisible six jours
 * sur sept — d'ou l'interet de ne plus jamais l'ecrire a la main.
 */
export function jourSemaineNaive(valeur) {
  const d = lireDateNaive(valeur);
  if (!d) return null;
  const js = new Date(Date.UTC(d.annee, d.mois - 1, d.jour)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** Forme canonique `YYYY-MM-DDTHH:MM:SS` — la seule comparable entre elles. */
export function normaliserNaif(valeur) {
  const d = lireDateNaive(valeur);
  if (!d) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.annee}-${p(d.mois)}-${p(d.jour)}T${p(d.heures)}:${p(d.minutes)}:${p(d.secondes)}`;
}

/**
 * Dates NAÏVES — SOURCE UNIQUE (chantier DATES, 16/08/2026).
 *
 * ── LE PROBLÈME QUE CE FICHIER EXISTE POUR EMPÊCHER ──
 * `appointments.scheduled_at` vaut `"2026-08-17T14:30:00"` : séparateur `T`, AUCUN
 * décalage. C'est une heure murale, déjà locale — pas un instant.
 *
 * Une date-heure sans décalage est parsée par JavaScript comme LOCALE. Donc, mesuré
 * le 16/08/2026 sous quatre fuseaux, `new Date(s).toLocaleTimeString('fr-FR')` rend
 * **14:30 partout** — Paris, UTC, New York, Auckland. L'affichage n'a jamais été
 * cassé, contrairement à ce qu'on a pu croire.
 *
 * Ce qui CASSE, et c'est le seul défaut, c'est d'ajouter un `timeZone` :
 *     TZ=Europe/Paris  + timeZone:'Europe/Paris'  →  14:30
 *     TZ=UTC           + timeZone:'Europe/Paris'  →  16:30   ← le Worker
 *     TZ=New_York      + timeZone:'Europe/Paris'  →  20:30
 * Un Worker Cloudflare tourne en UTC : un rendez-vous de 14h30 y était annoncé pour
 * 16h30 en été. Le défaut est apparu TROIS fois (`public/booking.js`,
 * `cron/reminders.js`, puis `modules/reminders/routes.js`) parce que la règle
 * 10quinquies se lit de travers : **c'est le `timeZone` qui est interdit sur une date
 * naïve, pas le `new Date()`.**
 *
 * ── POURQUOI CE MODULE, PUISQUE L'AFFICHAGE MARCHE ──
 * Il ne répare rien à l'écran. Il existe pour qu'on ne réintroduise pas le défaut une
 * quatrième fois : un seul endroit qui sait lire ces chaînes, et un garde-fou
 * (`scripts/verifier-dates.mjs`) qui échoue si quelqu'un rappelle `new Date()` sur un
 * champ naïf ailleurs. C'est l'uniformité qui rend la règle vérifiable.
 *
 * ── DEUX OPÉRATIONS, ET NON UNE ──
 * Une date naïve n'a AUCUN instant tant qu'on ne lui attache pas de fuseau. Donc :
 *   • AFFICHER  → `lireDateNaive()` et ses formateurs. Sans fuseau, jamais.
 *   • COMPARER  → impossible sans fuseau. On rend « maintenant » en heure murale du
 *     fuseau métier (`maintenantNaif()`), puis on compare deux chaînes naïves. Les
 *     chaînes `YYYY-MM-DDTHH:MM:SS` s'ordonnent correctement en lexicographique, donc
 *     aucun instant n'est construit de part et d'autre.
 */

/**
 * Le fuseau de l'activité. UNE constante, parce qu'il n'existe aucun fuseau par
 * tenant en base et que tous les tenants sont français. Le jour où ça doit varier,
 * c'est ici — et nulle part ailleurs.
 */
export const FUSEAU_METIER = 'Europe/Paris';

/**
 * Noms de jours indexés CANONIQUEMENT : `NOMS_JOURS[1]` = « Lundi », `[7]` = « Dimanche ».
 *
 * L'indice 0 est vide, et c'est délibéré : il rend le décalage impossible à ignorer.
 * Un tableau `['Dimanche', 'Lundi', …]` indexé par `getDay()` est correct tant qu'on
 * ne touche pas au calcul — mais le jour où quelqu'un passe à `jourSemaineNaive()`
 * sans changer le tableau, l'étiquette nomme un autre jour, et rien ne le signale.
 * Ces deux choses doivent donc vivre au même endroit.
 */
export const NOMS_JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi',
  'Samedi', 'Dimanche'] as const;

/** Version courte, même indexation. */
export const NOMS_JOURS_COURTS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven',
  'Sam', 'Dim'] as const;

export interface DateNaive {
  annee: number;
  mois: number;      // 1-12, comme on l'écrit, pas comme JS l'indexe
  jour: number;
  heures: number;
  minutes: number;
  secondes: number;
}

/**
 * Lit une date-heure naïve SANS jamais construire de `Date`.
 *
 * Tolérante par conception, comme le parse de `lib/horaires.ts` : séparateur `T` ou
 * espace, secondes optionnelles, un éventuel `Z` ou décalage ignoré s'il traîne
 * (certaines lignes anciennes en portent — on lit alors l'heure murale telle
 * qu'écrite, ce qui est le comportement voulu pour un champ naïf).
 *
 * @returns null si la chaîne n'est pas exploitable. On ne devine pas.
 */
export function lireDateNaive(valeur: string | null | undefined): DateNaive | null {
  if (typeof valeur !== 'string') return null;
  const m = valeur.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!m) return null;
  const [, a, mo, j, h, mi, s] = m;
  const d: DateNaive = {
    annee: Number(a), mois: Number(mo), jour: Number(j),
    heures: Number(h ?? 0), minutes: Number(mi ?? 0), secondes: Number(s ?? 0),
  };
  // Bornes : une chaîne abîmée doit rendre null, pas une date absurde.
  if (d.mois < 1 || d.mois > 12 || d.jour < 1 || d.jour > 31) return null;
  if (d.heures > 23 || d.minutes > 59 || d.secondes > 59) return null;
  return d;
}

/**
 * Convertit une date naïve en `Date` positionnée sur les MÊMES composantes en UTC.
 *
 * ⚠️ Le résultat n'est PAS l'instant du rendez-vous — c'est un support de calcul.
 * On s'en sert uniquement pour obtenir un nom de jour ou de mois localisé, en
 * formatant ensuite avec `timeZone: 'UTC'`. C'est le SEUL usage légitime de
 * `timeZone` sur une date naïve, et il est confiné ici : UTC contre des composantes
 * posées en UTC est l'identité, donc rien ne se décale.
 */
function supportUtc(d: DateNaive): Date {
  return new Date(Date.UTC(d.annee, d.mois - 1, d.jour, d.heures, d.minutes, d.secondes));
}

/**
 * Porte de sortie pour un formatage sur mesure, quand aucun formateur ci-dessous ne
 * convient. Rend un `Date` dont les composantes UTC sont celles de l'heure murale.
 *
 * ⚠️ CONTRAT : l'appelant DOIT passer `timeZone: 'UTC'` à son `toLocale*`. C'est la
 * seule valeur correcte, et c'est aussi la seule que le garde-fou
 * `scripts/verifier-dates.mjs` autorise hors de ce module — donc un appelant qui
 * l'oublie ou qui met `'Europe/Paris'` fait échouer `npm test`. La souplesse est
 * offerte, pas la possibilité de se tromper en silence.
 *
 * Préférez un formateur nommé quand il existe : cette fonction est l'exception.
 */
export function supportAffichage(valeur: string | null | undefined): Date | null {
  const d = lireDateNaive(valeur);
  return d ? supportUtc(d) : null;
}

/** `"14:30"`. Chaîne vide si la valeur est illisible — jamais « Invalid Date ». */
export function formaterHeureNaive(valeur: string | null | undefined): string {
  const d = lireDateNaive(valeur);
  if (!d) return '';
  return `${String(d.heures).padStart(2, '0')}:${String(d.minutes).padStart(2, '0')}`;
}

/** `"17/08/2026"` — l'équivalent de `toLocaleDateString('fr-FR')`, sans fuseau. */
export function formaterDateNaive(valeur: string | null | undefined): string {
  const d = lireDateNaive(valeur);
  if (!d) return '';
  return `${String(d.jour).padStart(2, '0')}/${String(d.mois).padStart(2, '0')}/${d.annee}`;
}

/** `"lundi 17 août 2026"`. */
export function formaterDateLongue(valeur: string | null | undefined): string {
  const d = lireDateNaive(valeur);
  if (!d) return '';
  return supportUtc(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/** `"lun 17 août"` — format court des cartes et listes. */
export function formaterDateCourte(valeur: string | null | undefined): string {
  const d = lireDateNaive(valeur);
  if (!d) return '';
  return supportUtc(d).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

/** `"lundi 17 août 2026 à 14:30"`. */
export function formaterDateHeureNaive(valeur: string | null | undefined): string {
  const d = lireDateNaive(valeur);
  if (!d) return '';
  return `${formaterDateLongue(valeur)} à ${formaterHeureNaive(valeur)}`;
}

/**
 * Jour de la semaine CANONIQUE : 1 = lundi … 7 = dimanche.
 *
 * C'est la convention de `availability_slots.day_of_week`, validée par
 * `availability/routes.js:91`. Elle n'est PAS celle de `getDay()` (0 = dimanche) —
 * confondre les deux a rendu le dimanche toujours indisponible dans
 * `twilio/conversation.js` jusqu'au 16/08/2026, et décale d'un jour entier deux
 * autres endroits du module `retell`.
 */
export function jourSemaineNaive(valeur: string | null | undefined): number | null {
  const d = lireDateNaive(valeur);
  if (!d) return null;
  const js = supportUtc(d).getUTCDay();   // 0 = dimanche
  return js === 0 ? 7 : js;
}

/** L'heure seule, en nombre — pour les histogrammes « appels par heure ». */
export function heureNaive(valeur: string | null | undefined): number | null {
  const d = lireDateNaive(valeur);
  return d ? d.heures : null;
}

/**
 * « Maintenant », rendu en heure murale du fuseau métier, au format naïf.
 *
 * C'est la seule façon de comparer sans construire d'instant : on ramène les deux
 * côtés dans le même référentiel (l'heure murale de l'activité), puis on compare des
 * chaînes. `new Date()` sans argument est un instant RÉEL, donc lui appliquer un
 * `timeZone` est correct — c'est l'inverse exact du défaut que ce module empêche.
 */
export function maintenantNaif(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: FUSEAU_METIER,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date());
  // 'sv-SE' rend « 2026-08-17 14:30:00 » : déjà l'ordre ISO, d'où ce choix de locale
  // plutôt qu'un assemblage manuel de `formatToParts`.
  return parts.replace(' ', 'T');
}

/**
 * Compare deux dates naïves. Négatif si `a` précède `b`, 0 si égales.
 *
 * La comparaison est LEXICOGRAPHIQUE sur `YYYY-MM-DDTHH:MM:SS`, ce qui est
 * exactement l'ordre chronologique tant que les deux chaînes sont normalisées. On
 * passe donc par `lireDateNaive` avant de comparer, pour que `"2026-8-1 9:00"` et
 * `"2026-08-01T09:00:00"` se rangent pareil.
 */
export function comparerNaif(a: string | null | undefined, b: string | null | undefined): number {
  const na = normaliserNaif(a);
  const nb = normaliserNaif(b);
  if (na === null || nb === null) return 0;   // incomparable : on ne tranche pas
  return na < nb ? -1 : na > nb ? 1 : 0;
}

/** Forme canonique `YYYY-MM-DDTHH:MM:SS`, seule forme comparable. */
export function normaliserNaif(valeur: string | null | undefined): string | null {
  const d = lireDateNaive(valeur);
  if (!d) return null;
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.annee}-${p(d.mois)}-${p(d.jour)}T${p(d.heures)}:${p(d.minutes)}:${p(d.secondes)}`;
}

/** Le rendez-vous est-il à venir, à l'heure murale de l'activité ? */
export function estAVenir(valeur: string | null | undefined): boolean {
  return comparerNaif(valeur, maintenantNaif()) > 0;
}

/** Le rendez-vous est-il passé ? */
export function estPasse(valeur: string | null | undefined): boolean {
  return comparerNaif(valeur, maintenantNaif()) < 0;
}

/**
 * Écart en HEURES entre deux dates naïves (b - a), décimal.
 *
 * ⚠️ C'est un écart d'heure MURALE, pas de temps réellement écoulé : à travers un
 * changement d'heure, les deux diffèrent d'une heure. C'est volontaire et c'est ce que
 * le métier veut dire — « ce rendez-vous est dans moins de 2 heures » se juge sur la
 * pendule du garage, pas sur une durée physique. Ne pas « corriger » sans raison.
 */
export function ecartHeures(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  const da = lireDateNaive(a);
  const db = lireDateNaive(b);
  if (!da || !db) return null;
  const ia = Date.UTC(da.annee, da.mois - 1, da.jour, da.heures, da.minutes, da.secondes);
  const ib = Date.UTC(db.annee, db.mois - 1, db.jour, db.heures, db.minutes, db.secondes);
  return (ib - ia) / 3_600_000;
}

/** Heures d'ici au rendez-vous. Négatif s'il est passé. */
export function heuresJusqua(valeur: string | null | undefined): number | null {
  return ecartHeures(maintenantNaif(), valeur);
}

/** Jours calendaires d'ici au rendez-vous. Négatif s'il est passé. */
export function joursJusqua(valeur: string | null | undefined): number | null {
  return ecartJours(maintenantNaif(), valeur);
}

/**
 * Nombre de jours calendaires entre deux dates naïves (b - a), l'heure ignorée.
 * Utilisé par les alertes « demain » et « dans 3 jours ».
 */
export function ecartJours(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  const da = lireDateNaive(a);
  const db = lireDateNaive(b);
  if (!da || !db) return null;
  const ja = Date.UTC(da.annee, da.mois - 1, da.jour);
  const jb = Date.UTC(db.annee, db.mois - 1, db.jour);
  return Math.round((jb - ja) / 86_400_000);
}

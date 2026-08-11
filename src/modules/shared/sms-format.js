// Encodage et longueur des SMS — SOURCE UNIQUE.
//
// POURQUOI CE MODULE EXISTE
// Un devis parti en DEUX SMS alors qu'il tenait visuellement en un seul. La
// cause n'est pas la longueur : c'est l'ENCODAGE. Twilio encode en GSM-7
// (160 caracteres par segment) tant que TOUS les caracteres appartiennent a
// l'alphabet GSM 03.38 ; un seul caractere hors table bascule le message
// entier en UCS-2, et la capacite tombe a **70 caracteres**. Un message de
// 150 signes passe alors de 1 a 3 segments.
//
// LE PIEGE FRANCAIS, contre-intuitif :
//   - « é è à ù ì ò » sont DANS le GSM-7. Les garder ne coute rien.
//   - « ô â ê î û ë ï » n'y sont PAS.
//   - « ç » minuscule n'y est PAS (seul « Ç » majuscule y figure) :
//     le mot « francais » correctement accentue fait exploser le compte.
//   - l'apostrophe courbe « ’ » (celle des traitements de texte) n'y est pas.
//   - « € » y est, mais dans la table d'extension : il compte DOUBLE.
//
// On translitere donc UNIQUEMENT ce qui est hors table, et on garde les
// accents qui passent — degrader « Réservez » en « Reservez » serait gratuit.

/** Alphabet GSM 03.38 de base — 1 unite par caractere. */
const GSM7_BASE = new Set(
  ('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡'
   + 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà').split(''),
);

/** Table d'extension — 2 unites par caractere (echappement 0x1B). */
const GSM7_EXT = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€']);

/**
 * Caracteres hors GSM-7 frequents en francais, et leur equivalent sur.
 * On ne touche a rien d'autre : la translitteration est un dernier recours,
 * pas un nettoyage general.
 */
const TRANSLITERATION = {
  'ô': 'o', 'Ô': 'O', 'â': 'a', 'Â': 'A', 'ê': 'e', 'Ê': 'E',
  'î': 'i', 'Î': 'I', 'û': 'u', 'Û': 'U', 'ë': 'e', 'Ë': 'E',
  'ï': 'i', 'Ï': 'I', 'ÿ': 'y', 'ç': 'c', 'œ': 'oe', 'Œ': 'OE',
  'æ': 'ae',   // 'æ' est dans le GSM-7 mais illisible pour beaucoup de mobiles
  '’': "'", '‘': "'", '“': '"', '”': '"', '«': '"', '»': '"',
  '–': '-', '—': '-', '…': '...', '\u00a0': ' ', '\u202f': ' ',
};

export function estGsm7(texte) {
  for (const c of String(texte || '')) {
    if (!GSM7_BASE.has(c) && !GSM7_EXT.has(c)) return false;
  }
  return true;
}

/**
 * Compte les segments reellement factures par Twilio.
 * @returns {{encodage: 'GSM-7'|'UCS-2', unites: number, segments: number,
 *            capaciteSegment: number, restantAvantSegmentSuivant: number}}
 */
export function compterSms(texte) {
  const t = String(texte || '');
  const gsm7 = estGsm7(t);

  let unites = 0;
  if (gsm7) {
    for (const c of t) unites += GSM7_EXT.has(c) ? 2 : 1;
  } else {
    // UCS-2 : une unite par unite de code UTF-16 (un emoji hors BMP en coute 2).
    unites = t.length;
  }

  const capaciteSimple = gsm7 ? 160 : 70;
  const capaciteMulti = gsm7 ? 153 : 67;   // l'en-tete de concatenation mange la difference

  let segments;
  let capaciteSegment;
  if (unites <= capaciteSimple) {
    segments = unites === 0 ? 0 : 1;
    capaciteSegment = capaciteSimple;
  } else {
    segments = Math.ceil(unites / capaciteMulti);
    capaciteSegment = capaciteMulti;
  }

  const plafond = segments <= 1 ? capaciteSimple : segments * capaciteMulti;
  return {
    encodage: gsm7 ? 'GSM-7' : 'UCS-2',
    unites,
    segments,
    capaciteSegment,
    restantAvantSegmentSuivant: Math.max(0, plafond - unites),
  };
}

/**
 * Rend un texte compatible GSM-7 en ne touchant QUE les caracteres hors table.
 * « Contrôle » devient « Controle », « Réservez » reste « Réservez ».
 */
export function compacterPourGsm7(texte) {
  let t = String(texte || '');
  for (const [source, cible] of Object.entries(TRANSLITERATION)) {
    if (t.includes(source)) t = t.split(source).join(cible);
  }
  // Ce qui reste hors table apres translitteration (alphabets non latins,
  // emojis) est retire : mieux vaut un caractere perdu qu'un message triple.
  let sortie = '';
  for (const c of t) {
    if (GSM7_BASE.has(c) || GSM7_EXT.has(c)) sortie += c;
    else {
      const sansAccent = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      sortie += (GSM7_BASE.has(sansAccent) ? sansAccent : '');
    }
  }
  return sortie.replace(/[ \t]{2,}/g, ' ').trim();
}

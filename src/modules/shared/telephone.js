// Normalisation des numéros de téléphone — SOURCE UNIQUE.
//
// POURQUOI CE FICHIER EXISTE (incident du 16/08/2026)
// La réservation publique a été bloquée pour TOUS les visiteurs pendant la durée
// d'un déploiement : le formulaire affiche `06 12 34 56 78` en exemple, et la
// validation serveur exigeait `+33…`. Elle refusait donc exactement ce qu'elle
// demandait d'écrire. Zéro rendez-vous pris entre les deux.
//
// La leçon n'est pas « il fallait une regex plus large ». C'est : une validation
// se juge sur ce que le formulaire DEMANDE, jamais sur ce que la base préfère
// stocker. Le format canonique est un besoin technique (Twilio veut de l'E.164),
// donc c'est au serveur de convertir, pas au visiteur de deviner.
//
// ⚠️ Il existe encore des normalisations ad hoc ailleurs (`public/routes.js:417`,
// `prospects/dedup.js`, `voixia/routes.js:1243`). Elles ne sont PAS reprises ici
// dans l'urgence — les rassembler est au backlog. Tout NOUVEAU point d'entrée
// utilise cette fonction.

/**
 * Normalise un numéro saisi par un humain en E.164.
 *
 * Accepte ce qu'un Français écrit réellement : `06 12 34 56 78`, `06.12.34.56.78`,
 * `06-12-34-56-78`, `0612345678`, `+33 6 12 34 56 78`, `0033612345678`,
 * `33612345678`. Les séparateurs sont du bruit d'affichage, pas de la donnée.
 *
 * @param {string} brut
 * @returns {{ valide: boolean, e164: string|null }}
 *   `e164` n'est renseigné que si `valide` — pas de demi-valeur à propager.
 */
export function normaliserTelephone(brut) {
  if (typeof brut !== 'string') return { valide: false, e164: null };

  // On ne garde que les chiffres et un éventuel « + » de tête. Espaces, points,
  // tirets, parenthèses et espaces insécables (le copier-coller en produit)
  // disparaissent.
  let n = brut.trim().replace(/[\s.\-()  ]/g, '');

  if (n.startsWith('00')) n = `+${n.slice(2)}`;      // 0033… → +33…
  else if (n.startsWith('0')) n = `+33${n.slice(1)}`; // 06…   → +336…
  else if (!n.startsWith('+')) {
    // Ni 0 ni + : soit un indicatif nu (33…, 32…), soit un numéro national
    // étranger qu'on ne peut pas deviner. On préfixe, et la validation tranche —
    // on ne suppose PAS la France sur un numéro qui ne commence pas par 0.
    n = `+${n}`;
  }

  // E.164 : « + », un premier chiffre non nul, puis 7 à 14 chiffres. Même motif
  // que `/onboarding/send-verification`, pour ne pas avoir deux dialectes.
  if (!/^\+[1-9]\d{6,14}$/.test(n)) return { valide: false, e164: null };

  // ── Longueur française, en plus de l'E.164 ──
  // Sans ce contrôle, `06 12 34 56 7` (un chiffre oublié) devient `+3361234567`,
  // qui est un E.164 syntaxiquement valide et un numéro français inexistant. Il
  // partirait à Twilio, échouerait ou — pire — joindrait quelqu'un d'autre. Un
  // numéro français a exactement 9 chiffres après l'indicatif.
  if (n.startsWith('+33') && n.length !== 12) return { valide: false, e164: null };

  return { valide: true, e164: n };
}

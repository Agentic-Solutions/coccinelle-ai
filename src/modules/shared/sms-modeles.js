// Gabarits de SMS modifiables par le tenant — SOURCE UNIQUE (chantier CX-3, lot 2).
//
// POURQUOI CE MODULE EXISTE
// « Un modele modifie dans la page doit etre celui qui part vraiment. » Sans un
// endroit unique qui porte le texte par defaut, les jetons obligatoires et la
// validation, on obtient trois verites : celle de la page, celle de la base, et
// celle du code qui envoie. C'est exactement la divergence qui a coute trois
// mois sur les templates sectoriels (§ j).
//
// CE QUI EST MODIFIABLE, ET CE QUI NE L'EST PAS
// Un seul type dans ce lot : `confirmation_rdv`. Les autres sont ecartes, chacun
// pour une raison mesuree :
//
//   `rappel_rdv`   — part par CRON, sans personne pour relire. Un gabarit casse
//                    echoue en silence a 17 h pour TOUS les rendez-vous du
//                    lendemain. Il attendra une preuve d'usage sur la
//                    confirmation.
//   `verification` — code SMS du tunnel d'inscription. Une phrase modifiee casse
//                    une inscription, sur le parcours deja le plus fragile
//                    (8 completions sur 145).
//   `interne`      — notification a l'equipe, pas au client.
//   devis, tarif, horaires, information, reponse_sms, suivi_appel
//                  — PAS des gabarits : leur corps est compose par le LLM pendant
//                    l'appel. Offrir de les « modifier » serait offrir de
//                    modifier un texte qui n'existe pas encore. Ce qui se regle,
//                    pour ceux-la, c'est le prompt — sur « Mon assistant ».
//   `prospection`  — a DEJA ses gabarits par tenant (`proactive_templates`), avec
//                    sa page. En ajouter un second jeu ici creerait le doublon
//                    que ce module cherche a eviter.
//
// LA CONTRAINTE GSM-7 : ON AVERTIT, ON NE REFUSE PAS
// Un seul caractere hors table GSM 03.38 fait tomber la capacite de 160 a 70 par
// segment. Le piege est contre-intuitif en francais : « é », « è » et « à » SONT
// dans la table, « ô », « â », « ê » et « ç » MINUSCULE non.
//
// MAIS refuser serait une fausse contrainte, et c'est le controle qui l'a montre :
// le chemin d'envoi passe par `compacterPourGsm7` (shared/sms-format.js), qui
// TRANSLITERE les seuls caracteres hors table. « aout » remplace « août »,
// « Controle » remplace « Contrôle », tandis que « confirmé » et « à » restent
// intacts. Mesure faite : « Votre RDV est confirmé chez Contrôle Technique
// Toulouse… » = 2 segments brut, 1 segment apres compaction.
//
// Donc : on MESURE apres compaction, on refuse au-dela d'un segment, et on
// AVERTIT en montrant ce que le client va reellement lire — parce qu'un
// commercant qui ecrit « Contrôle Technique » a le droit de savoir que son SMS
// dira « Controle Technique ». Le taire serait le mensonge d'interface que tout
// ce chantier combat.

import { logger } from '../../utils/logger.js';
import { compacterPourGsm7, compterSms } from './sms-format.js';

/**
 * Definition d'un gabarit modifiable.
 *
 * `jetons` = OBLIGATOIRES. En retirer un est refuse, pas signale : un
 * « RDV confirme chez Garage Martin » sans heure est pire qu'un texte moins joli.
 * `exemple` sert l'apercu et la mesure — la longueur se juge APRES substitution,
 * jamais sur le gabarit (« {date} » fait 6 caracteres, « mercredi 12 aout » 16).
 */
export const MODELES = {
  confirmation_rdv: {
    libelle: 'Confirmation de rendez-vous',
    explication: 'Envoyé au client dès qu’il réserve, en ligne ou par téléphone.',
    // Le texte actuellement en dur dans `public/booking.js`. C'est le defaut, et
    // c'est aussi le repli si la table est absente ou la ligne vide.
    defaut: 'Votre RDV {prestation}chez {entreprise} est confirmé : {date} à {heure}.',
    jetons: ['{entreprise}', '{date}', '{heure}'],
    // Facultatif : il vaut la chaine vide quand le rendez-vous n'a pas de
    // prestation nommee. Le retirer n'est pas une faute.
    jetonsFacultatifs: ['{prestation}'],
    exemple: {
      '{entreprise}': 'Garage Toulouse',
      '{date}': 'mercredi 20 août',
      '{heure}': '10:00',
      '{prestation}': 'révision ',
    },
  },
};

/** Longueur maximale, en segments. Un SMS de confirmation tient en un. */
const SEGMENTS_MAX = 1;

/** Un gabarit trop long ne peut pas etre borne : on refuse au-dela. */
const CARACTERES_MAX = 320;

/**
 * Remplace les jetons par leurs valeurs.
 *
 * Un jeton absent du dictionnaire est remplace par la chaine VIDE et non laisse
 * tel quel : un « {prestation} » lu a voix haute ou affiche dans un SMS est le
 * defaut que `applyPromptVariables` existe pour eviter cote prompt (regle 6bis).
 */
export function appliquerJetons(gabarit, valeurs) {
  let texte = String(gabarit || '');
  for (const [jeton, valeur] of Object.entries(valeurs || {})) {
    texte = texte.split(jeton).join(valeur == null ? '' : String(valeur));
  }
  // Tout jeton restant (non fourni par l'appelant) disparait.
  texte = texte.replace(/\{[a-z_]+\}/gi, '');
  // La substitution laisse des doubles espaces quand un jeton facultatif est vide.
  return texte.replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * Valide un gabarit propose par le tenant.
 *
 * `erreurs` bloque l'enregistrement. `avertissements` ne bloque pas : il dit ce
 * qui va changer sans que le client l'ait demande.
 *
 * @returns {{valide: boolean, erreurs: string[], avertissements: string[],
 *            apercu: string, apercuEnvoye: string,
 *            segments: number, unites: number, encodage: string}}
 */
export function validerModele(type, gabarit) {
  const def = MODELES[type];
  if (!def) {
    return {
      valide: false, erreurs: ['Ce message ne se modifie pas.'], avertissements: [],
      apercu: '', apercuEnvoye: '', segments: 0, unites: 0, encodage: 'GSM-7',
    };
  }

  const texte = String(gabarit || '').trim();
  const erreurs = [];

  if (!texte) erreurs.push('Le message ne peut pas être vide.');
  if (texte.length > CARACTERES_MAX) {
    erreurs.push(`Le message dépasse ${CARACTERES_MAX} caractères.`);
  }

  // ── Jetons obligatoires ──
  const manquants = def.jetons.filter((j) => !texte.includes(j));
  if (manquants.length) {
    erreurs.push(
      manquants.length === 1
        ? `${manquants[0]} doit rester dans le message : sans lui, le client ne saurait pas ${LEGENDE_JETON[manquants[0]] || 'de quoi il s’agit'}.`
        : `Ces informations doivent rester dans le message : ${manquants.join(', ')}.`,
    );
  }

  // ── Jetons inventes ──
  // Un « {client} » tape a la main ne serait remplace par rien et partirait comme
  // un vide dans le SMS. On le refuse en nommant ce qui est disponible.
  const connus = new Set([...def.jetons, ...(def.jetonsFacultatifs || [])]);
  const inconnus = [...new Set(texte.match(/\{[a-z_]+\}/gi) || [])]
    .filter((j) => !connus.has(j));
  if (inconnus.length) {
    erreurs.push(
      `${inconnus.join(', ')} n’existe pas et serait remplacé par du vide. `
      + `Disponibles : ${[...connus].join(', ')}.`,
    );
  }

  // ── Longueur, APRES substitution ET APRES compaction ──
  //
  // Les deux etapes comptent, dans cet ordre : « {date} » fait 6 caracteres et
  // « mercredi 20 août » en fait 16 — mesurer le gabarit ne mesure rien. Et
  // c'est le texte COMPACTE qui part, donc c'est lui qu'on facture.
  const apercu = appliquerJetons(texte, def.exemple);
  const apercuEnvoye = compacterPourGsm7(apercu);
  const mesure = compterSms(apercuEnvoye);

  // L'avertissement ne porte que sur le texte que le CLIENT a tapé, jamais sur
  // l'aperçu substitué : « mercredi 20 août » vient de notre exemple, et prévenir
  // qu'un « û » qu'il n'a pas écrit sera remplacé est du bruit — pire, ça lui
  // impute notre propre mise en forme de la date.
  const avertissements = [];
  const remplaces = caracteresRemplaces(texte, compacterPourGsm7(texte));
  if (remplaces.length) {
    const pluriel = remplaces.length > 1;
    avertissements.push(
      `${remplaces.join(', ')} ${pluriel ? 'n’existent' : 'n’existe'} pas dans l’alphabet `
      + `des SMS et ${pluriel ? 'seront remplacés' : 'sera remplacé'} à l’envoi.`,
    );
  }

  if (mesure.segments > SEGMENTS_MAX) {
    erreurs.push(
      `Trop long : ${mesure.unites} caractères une fois la date et l’heure remplies, `
      + `soit ${mesure.segments} SMS facturés au lieu d’un. La limite est de 160.`,
    );
  }

  return {
    valide: erreurs.length === 0,
    erreurs,
    avertissements,
    apercu,
    // Le texte tel qu'il partira. C'est celui que la page doit montrer.
    apercuEnvoye,
    segments: mesure.segments,
    unites: mesure.unites,
    encodage: mesure.encodage,
  };
}

/**
 * Les caracteres que la compaction a remplaces, cites avec leur remplacement.
 *
 * Comparaison caractere par caractere plutot que reconstitution d'une table de
 * translitteration : la table vit dans `sms-format.js` et n'a aucune raison
 * d'etre recopiee ici. Si elle change, ce diagnostic suit.
 */
function caracteresRemplaces(avant, apres) {
  const vus = new Map();
  // Les deux chaines peuvent differer en longueur (« — » → « - » garde 1 pour 1,
  // mais rien ne le garantit) : on se contente des caracteres hors table presents
  // dans l'original et absents du resultat.
  for (const c of avant) {
    if (vus.has(c) || apres.includes(c)) continue;
    // Le remplacement exact, obtenu en compactant ce seul caractere.
    const remplacant = compacterPourGsm7(c);
    vus.set(c, remplacant);
  }
  return [...vus.entries()].map(([c, r]) => `« ${c} » (remplacé par « ${r} »)`);
}

/** Ce que chaque jeton apporte au client — sert les messages de refus. */
const LEGENDE_JETON = {
  '{entreprise}': 'chez qui il a rendez-vous',
  '{date}': 'quel jour',
  '{heure}': 'à quelle heure',
};

/**
 * Le gabarit ACTIF d'un tenant : le sien s'il en a un, sinon le defaut.
 *
 * Ne leve JAMAIS et retombe toujours sur le defaut. Un SMS de confirmation qui
 * n'est pas envoye parce qu'une table manque serait une regression pire que le
 * defaut d'origine — la confirmation n'existait deja pas avant le 11/08.
 */
export async function lireModele(env, tenantId, type) {
  const def = MODELES[type];
  if (!def) return null;
  try {
    const ligne = await env.DB.prepare(
      'SELECT corps FROM message_modeles WHERE tenant_id = ? AND type = ?',
    ).bind(tenantId, type).first();
    const corps = (ligne?.corps || '').trim();
    if (!corps) return def.defaut;

    // Garde-fou : un gabarit devenu invalide (jeton retire a la main en base,
    // ou regle durcie depuis) ne part PAS. On revient au defaut, en le disant
    // dans les logs — silencieusement cote client, qui n'y peut rien.
    const controle = validerModele(type, corps);
    if (!controle.valide) {
      logger.warn('[SMS] Gabarit invalide en base, repli sur le defaut', {
        tenantId, type, erreurs: controle.erreurs,
      });
      return def.defaut;
    }
    return corps;
  } catch (error) {
    logger.warn('[SMS] Gabarits illisibles, repli sur le defaut', {
      tenantId, type, erreur: error.message,
    });
    return def.defaut;
  }
}

/**
 * Le texte final a envoyer : gabarit actif du tenant + jetons substitues.
 *
 * C'est CE point d'entree que les chemins d'envoi appellent — jamais
 * `lireModele` suivi d'une substitution maison, sinon deux endroits decident.
 */
export async function composerMessage(env, tenantId, type, valeurs) {
  const gabarit = await lireModele(env, tenantId, type);
  if (!gabarit) return null;
  return appliquerJetons(gabarit, valeurs);
}

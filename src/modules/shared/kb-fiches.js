// Normalisation structurelle de la base de connaissances — SOURCE UNIQUE.
//
// POURQUOI CE MODULE EXISTE
// Un client importe ce qu'il a : un CSV export tableur, un tableau Markdown, un
// PDF converti, un texte redige. Jusqu'au 11/08/2026 la recherche decoupait le
// document en FENETRES DE CARACTERES : sur un tableau, une fenetre coupe entre
// une prestation et son prix, et l'agent annonce le tarif de la ligne voisine.
// Cas reel : « montage equilibrage » (15 EUR) repondu « 25 EUR » — le prix de la
// permutation, deux lignes plus bas.
//
// INVARIANT TENU ICI : un montant n'est JAMAIS separe de son libelle. L'unite
// n'est plus le caractere mais la FICHE — une ligne du tableau, indivisible.
// La normalisation se fait A L'INGESTION : le document reste intact, mais il
// engendre une fiche par ligne dans knowledge_chunks. La recherche compare des
// fiches entieres, plus des morceaux de texte.
//
// Ce module est PUR (aucun acces DB, aucun env) pour rester testable hors ligne.

/** Mots d'en-tete reconnus, desaccentues et en minuscules. */
const MOTS_LIBELLE = [
  'prestation', 'prestations', 'service', 'services', 'designation', 'libelle',
  'intitule', 'nom', 'produit', 'article', 'item', 'question', 'objet',
];
const MOTS_PRIX = ['prix', 'tarif', 'tarifs', 'montant', 'cout', 'price', 'amount', 'pu'];
const MOTS_CATEGORIE = ['categorie', 'categories', 'famille', 'rubrique', 'section', 'groupe', 'type'];
const MOTS_DETAILS = [
  'detail', 'details', 'description', 'note', 'notes', 'commentaire', 'precision',
  'precisions', 'remarque', 'info', 'infos', 'reponse', 'complement',
];

/** Separateurs candidats, par ordre de specificite decroissante. */
const SEPARATEURS = ['\t', ';', '|', ','];

/** Proportion de lignes qui doivent partager le meme nombre de champs. */
const SEUIL_REGULARITE = 0.6;

/** Un tableau d'une seule ligne utile n'en est pas un. */
const MIN_LIGNES_TABLEAU = 3;

/**
 * Desaccentue et met en minuscules — meme convention que la recherche VoixIA,
 * pour que les comparaisons d'en-tete tiennent avec « Catégorie » ou « CATEGORIE ».
 */
export function plier(texte) {
  return String(texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Decoupe une ligne en champs, en respectant les guillemets.
 *
 * Indispensable ici : « Infos,Horaires,,"Lun-ven 8h-19h, samedi 9h-17h" » compte
 * QUATRE champs, pas six. Un split() naif casse la ligne au milieu des horaires
 * et fabrique des colonnes fantomes.
 */
export function decouperLigne(ligne, separateur) {
  const champs = [];
  let courant = '';
  let dansGuillemets = false;

  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];

    if (c === '"') {
      // Guillemet double a l'interieur d'un champ cite = guillemet litteral.
      if (dansGuillemets && ligne[i + 1] === '"') {
        courant += '"';
        i++;
      } else {
        dansGuillemets = !dansGuillemets;
      }
      continue;
    }

    if (c === separateur && !dansGuillemets) {
      champs.push(courant.trim());
      courant = '';
      continue;
    }

    courant += c;
  }
  champs.push(courant.trim());

  // Un point final colle apres le guillemet fermant (« ...demande". ») ne doit
  // pas rester attache au dernier champ.
  return champs.map(ch => ch.replace(/^["\s]+|["\s.]+$/g, '').trim());
}

/**
 * Un tableau Markdown se reconnait a ses barres verticales encadrantes et a sa
 * ligne de separation en tirets, qu'il faut ecarter avant tout comptage.
 */
function estSeparateurMarkdown(ligne) {
  return /^[\s|:-]+$/.test(ligne) && ligne.includes('-');
}

function nettoyerLigneMarkdown(ligne) {
  return ligne.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
}

/**
 * Determine si un contenu est tabulaire, et avec quel separateur.
 *
 * Le critere est la REGULARITE : au moins 60 % des lignes utiles doivent se
 * decouper en le meme nombre de champs (>= 2). Un texte redige contenant des
 * virgules echoue ce test — ses lignes n'ont aucune regularite de comptage.
 */
export function detecterStructure(contenu) {
  const brut = String(contenu || '').replace(/\r\n?/g, '\n');
  // On rogne les espaces, JAMAIS les tabulations : un `trim()` complet mange la
  // tabulation finale d'un export tableur, donc la derniere colonne quand elle
  // est vide. La moitie des lignes perdaient un champ et la regularite
  // s'effondrait — le fichier repassait en « prose ».
  const toutesLignes = brut.split('\n')
    .map(l => l.replace(/^[ ]+/, '').replace(/[ \r]+$/, ''))
    .filter(l => l.trim());
  const lignes = toutesLignes.filter(l => !estSeparateurMarkdown(l));

  if (lignes.length < MIN_LIGNES_TABLEAU) {
    return { type: 'prose', separateur: null, lignes: [] };
  }

  const estMarkdown = lignes.filter(l => l.startsWith('|') && l.endsWith('|')).length
    >= lignes.length * SEUIL_REGULARITE;
  const lignesUtiles = estMarkdown ? lignes.map(nettoyerLigneMarkdown) : lignes;

  let meilleur = null;
  for (const sep of (estMarkdown ? ['|'] : SEPARATEURS)) {
    const comptes = lignesUtiles.map(l => decouperLigne(l, sep).length);
    // Nombre de champs dominant.
    const frequences = new Map();
    for (const n of comptes) frequences.set(n, (frequences.get(n) || 0) + 1);

    let nDominant = 0;
    let occurrences = 0;
    for (const [n, occ] of frequences) {
      if (n >= 2 && (occ > occurrences || (occ === occurrences && n > nDominant))) {
        nDominant = n;
        occurrences = occ;
      }
    }

    const proportion = occurrences / lignesUtiles.length;
    if (proportion >= SEUIL_REGULARITE && nDominant >= 2) {
      const score = proportion * 100 + nDominant;
      if (!meilleur || score > meilleur.score) {
        meilleur = { separateur: sep, nChamps: nDominant, proportion, score };
      }
    }
  }

  if (!meilleur) return { type: 'prose', separateur: null, lignes: [] };

  // On ne garde que les lignes au format dominant : une ligne d'un autre format
  // (titre isole, phrase de conclusion) n'est pas une fiche et ne doit pas
  // fabriquer de colonnes decalees.
  const lignesTableau = lignesUtiles
    .map(l => decouperLigne(l, meilleur.separateur))
    .filter(champs => champs.length === meilleur.nChamps);

  // ── Garde-fou anti-prose ──
  // La regularite ne suffit PAS. Un paragraphe redige ou chaque phrase porte
  // une virgule presente une regularite de 100 % en deux colonnes, et se
  // ferait decouper en fiches absurdes — la recherche prose, elle, y repond
  // tres bien. Deux criteres separent une vraie table d'un texte :
  //   1. ses cellules sont COURTES (un libelle, pas une phrase) ;
  //   2. elle a au moins 3 colonnes, ou bien une colonne de montants.
  const cellules = lignesTableau.flat();
  const nonVides = cellules.filter(c => c.trim());
  const courtes = nonVides.filter(c => c.trim().split(/\s+/).length <= 6).length;
  const proportionCourtes = nonVides.length ? courtes / nonVides.length : 0;

  const lignesAvecMontant = lignesTableau.filter(champs => champs.some(contientMontant)).length;
  const proportionMontants = lignesTableau.length ? lignesAvecMontant / lignesTableau.length : 0;

  const ressembleATable = proportionCourtes >= 0.7
    && (meilleur.nChamps >= 3 || proportionMontants >= 0.3);

  if (!ressembleATable) return { type: 'prose', separateur: null, lignes: [] };

  return {
    type: 'tableau',
    separateur: meilleur.separateur,
    nChamps: meilleur.nChamps,
    lignes: lignesTableau,
  };
}

/** Une cellule ressemble-t-elle a un montant ? */
function contientMontant(cellule) {
  return /\d/.test(cellule) && /(eur|€|euro|usd|\$|hors taxes|ht\b|ttc)/i.test(cellule);
}

/** Recherche l'indice de la colonne dont l'en-tete evoque l'un des mots donnes. */
function chercherColonne(entete, mots) {
  for (let i = 0; i < entete.length; i++) {
    const cellule = plier(entete[i]);
    if (!cellule) continue;
    // `includes` et non egalite : la premiere cellule peut porter un prefixe
    // (« Nous proposons : categorie »), et le pluriel ne doit pas faire echouer.
    if (mots.some(m => cellule.includes(m))) return i;
  }
  return -1;
}

/**
 * Identifie le role de chaque colonne : d'abord par l'en-tete, sinon par le
 * contenu. Un export tableur sans ligne d'en-tete reste exploitable.
 */
export function identifierColonnes(lignes) {
  if (!lignes.length) return null;

  const premiere = lignes[0];
  const idx = {
    categorie: chercherColonne(premiere, MOTS_CATEGORIE),
    libelle: chercherColonne(premiere, MOTS_LIBELLE),
    prix: chercherColonne(premiere, MOTS_PRIX),
    details: chercherColonne(premiere, MOTS_DETAILS),
  };
  // Un en-tete credible nomme au moins le libelle ou le prix, et ne contient
  // aucun montant (sinon c'est deja une ligne de donnees).
  const aEntete = (idx.libelle !== -1 || idx.prix !== -1)
    && !premiere.some(contientMontant);

  const donnees = aEntete ? lignes.slice(1) : lignes;
  if (!donnees.length) return null;

  const nCol = premiere.length;
  if (!aEntete) {
    // Sans en-tete : la colonne des prix est celle qui porte le plus de
    // montants ; le libelle est la colonne la plus discriminante parmi les
    // autres ; la categorie, la moins discriminante (elle se repete).
    const stats = [];
    for (let c = 0; c < nCol; c++) {
      const cellules = donnees.map(l => l[c] || '');
      const remplies = cellules.filter(Boolean);
      stats.push({
        col: c,
        montants: cellules.filter(contientMontant).length / (donnees.length || 1),
        distincts: new Set(remplies).size / (remplies.length || 1),
        longueur: remplies.reduce((s, v) => s + v.length, 0) / (remplies.length || 1),
      });
    }
    const prix = stats.filter(s => s.montants >= 0.3).sort((a, b) => b.montants - a.montants)[0];
    idx.prix = prix ? prix.col : -1;

    const restantes = stats.filter(s => s.col !== idx.prix);
    const libelle = restantes.slice().sort(
      (a, b) => (b.distincts - a.distincts) || (b.longueur - a.longueur),
    )[0];
    idx.libelle = libelle ? libelle.col : 0;

    const categorie = restantes
      .filter(s => s.col !== idx.libelle && s.distincts < 0.6)
      .sort((a, b) => a.distincts - b.distincts)[0];
    idx.categorie = categorie ? categorie.col : -1;

    const details = restantes
      .filter(s => s.col !== idx.libelle && s.col !== idx.categorie)
      .sort((a, b) => b.longueur - a.longueur)[0];
    idx.details = details ? details.col : -1;
  } else if (idx.libelle === -1) {
    // En-tete present mais sans colonne de libelle nommee : on prend la
    // premiere colonne qui n'est ni le prix ni la categorie.
    for (let c = 0; c < nCol; c++) {
      if (c !== idx.prix && c !== idx.categorie && c !== idx.details) { idx.libelle = c; break; }
    }
  }

  return { ...idx, aEntete, entete: aEntete ? premiere : null, donnees };
}

/**
 * Met un montant en francais parlable SANS toucher aux chiffres.
 * Seule l'unite et les deux abreviations de fourchette sont developpees :
 * « des 59 EUR » et « 450-750 EUR » sont illisibles a voix haute, mais les
 * nombres eux-memes sont recopies caractere pour caractere (regle i.6ter).
 */
export function normaliserPrix(prix) {
  let p = String(prix || '').trim();
  if (!p) return '';

  p = p.replace(/\bEUR\b|€/gi, 'euros').replace(/\s+/g, ' ').trim();
  // « des 59 euros » = « dès », accent perdu a l'export tableur.
  p = p.replace(/^d[eè]s\s+(?=\d)/i, 'à partir de ');
  // « de 450 à 750 euros »
  p = p.replace(/(\d)\s*[-–]\s*(\d)/, '$1 à $2');
  return p.trim();
}

function majusculeInitiale(texte) {
  const t = String(texte || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/**
 * Rend une fiche en une phrase prononcable. C'est ce texte que l'agent lira :
 * il porte le libelle ET le prix, donc l'un ne peut plus arriver sans l'autre.
 */
export function rendreFiche({ libelle, prix, details, categorie }) {
  const parts = [majusculeInitiale(libelle)];
  const p = normaliserPrix(prix);
  if (p) parts.push(` : ${p}`);
  if (details) {
    // Sans prix, le detail EST la reponse (« Horaires : lundi-vendredi 8h-19h »)
    // et se lit apres deux points. Avec un prix, il n'est qu'une precision et
    // reste entre parentheses pour ne pas se confondre avec le montant.
    parts.push(p ? ` (${details})` : ` : ${details}`);
  }
  let texte = parts.join('');
  if (!/[.!?]$/.test(texte)) texte += '.';
  // La categorie n'est pas prononcee : elle sert au classement, pas a l'oral.
  return { texte, categorie: categorie || null };
}

/**
 * Transforme un contenu de document en fiches.
 * Retourne [] si le document n'est pas tabulaire — le chemin prose existant
 * reste alors seul en piste, inchange.
 */
export function construireFiches(contenu) {
  const structure = detecterStructure(contenu);
  if (structure.type !== 'tableau') return [];

  const cols = identifierColonnes(structure.lignes);
  if (!cols || cols.libelle === -1) return [];

  const fiches = [];
  for (const ligne of cols.donnees) {
    const libelle = (ligne[cols.libelle] || '').trim();
    if (!libelle) continue;

    const prix = cols.prix !== -1 ? (ligne[cols.prix] || '').trim() : '';
    const details = cols.details !== -1 ? (ligne[cols.details] || '').trim() : '';
    const categorie = cols.categorie !== -1 ? (ligne[cols.categorie] || '').trim() : '';

    // Une ligne sans prix ni details n'apporte rien : le libelle seul ne
    // repond a aucune question.
    if (!prix && !details) continue;

    const rendu = rendreFiche({ libelle, prix, details, categorie });
    fiches.push({
      libelle,
      prix,
      details,
      categorie,
      texte: rendu.texte,
      index: fiches.length,
    });
  }

  return fiches;
}

/** Poids d'un mot : rare = discriminant. */
function poidsIdf(nFiches, frequence) {
  return Math.log(1 + nFiches / Math.max(1, frequence));
}

/**
 * Classe des fiches par pertinence pour une question.
 *
 * LE POINT CRITIQUE. L'ancien classement recompensait la DENSITE : sur
 * « montage equilibrage pneu », le mot « pneu » (10 occurrences dans le
 * document) ecrasait « equilibrage » (1 occurrence) qui portait pourtant la
 * reponse. Ici chaque mot est pondere par sa RARETE parmi les fiches
 * candidates, et un mot trouve dans le libelle compte double par rapport au
 * meme mot trouve dans les details.
 */
export function classerFiches(fiches, motsRecherches) {
  const mots = (motsRecherches || []).map(plier).filter(Boolean);
  if (!fiches.length || !mots.length) return [];

  const n = fiches.length;
  const frequences = new Map();
  for (const mot of mots) {
    let f = 0;
    for (const fiche of fiches) if (plier(fiche.texte).includes(mot)) f++;
    frequences.set(mot, f);
  }

  // Frequence de CHAQUE mot de libelle, pour la penalite ci-dessous.
  const freqLibelles = new Map();
  const motsDuLibelle = (fiche) => plier(fiche.libelle)
    // Le contenu entre parentheses est une precision (« filtre inclus »,
    // « main d'oeuvre incluse »), pas un concept distinctif : il ne doit pas
    // penaliser une fiche que personne ne nommera avec ces mots-la.
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(m => m.length >= 3);
  for (const fiche of fiches) {
    for (const m of new Set(motsDuLibelle(fiche))) {
      freqLibelles.set(m, (freqLibelles.get(m) || 0) + 1);
    }
  }

  const classees = fiches.map(fiche => {
    const dansLibelle = plier(fiche.libelle);
    const dansDetails = plier(`${fiche.details} ${fiche.categorie}`);
    let score = 0;
    let motsTrouves = 0;

    for (const mot of mots) {
      const idf = poidsIdf(n, frequences.get(mot) || 0);
      let poids = 0;
      if (dansLibelle.includes(mot)) {
        // Mot entier dans le libelle : le signal le plus fort.
        poids = new RegExp(`\\b${mot}\\b`).test(dansLibelle) ? 3 : 2;
      } else if (dansDetails.includes(mot)) {
        poids = 1;
      }
      if (poids > 0) {
        score += poids * idf;
        motsTrouves++;
      }
    }

    // ── Penalite des concepts non demandes ──
    // « Forfait plaquettes avant » (149 €) et « Plaquettes + disques avant »
    // (289 €) obtiennent exactement le meme score sur « plaquettes avant » :
    // departager au hasard, c'est annoncer 289 € une fois sur deux. Un mot RARE
    // present dans le libelle mais absent de la question designe une AUTRE
    // prestation (« disques ») ; un mot banal (« forfait », qui revient dans
    // plusieurs fiches) ne distingue rien. La penalite suit donc la rarete.
    for (const m of new Set(motsDuLibelle(fiche))) {
      if (mots.some(q => m.includes(q) || q.includes(m))) continue;
      score -= poidsIdf(n, freqLibelles.get(m) || 0);
    }

    return { ...fiche, score, motsTrouves };
  });

  return classees
    .filter(f => f.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));
}

/**
 * Deux fiches sont « trop proches » quand leurs scores se tiennent et qu'elles
 * annoncent des prix differents : repondre l'une des deux au hasard, c'est
 * annoncer un tarif faux une fois sur deux. Dans ce cas l'agent doit demander
 * laquelle — c'est la regle 2bis du prompt.
 */
export const SEUIL_AMBIGUITE = 0.82;

export function detecterAmbiguite(classees) {
  if (classees.length < 2) return null;
  const [a, b] = classees;
  if (a.score <= 0) return null;
  if (b.score / a.score < SEUIL_AMBIGUITE) return null;
  // Meme prix : peu importe laquelle on cite, la reponse chiffree est la meme.
  if (normaliserPrix(a.prix) === normaliserPrix(b.prix)) return null;
  return [a, b];
}

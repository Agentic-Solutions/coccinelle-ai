/**
 * Charte des deux pages du chantier CX-2 — SOURCE UNIQUE.
 *
 * Les maquettes Claude Design (design/cx2/) sont en styles inline ; le dashboard
 * est en Tailwind. Les valeurs exactes vivent ici plutôt que recopiées quarante
 * fois en classes arbitraires : une couleur qui dérive d'un hex sur une bulle et
 * la page ne ressemble plus à la maquette validée.
 *
 * Ces deux pages sont les seules à utiliser cette charte : le reste du dashboard
 * garde la palette blanc/noir/gris (règle i.16).
 */

/** Couleurs, au hex près, relevées dans le template des maquettes. */
export const CX2 = {
  fond: '#f6f6f5',
  encre: '#1a1a19',
  encreSurvol: '#3a3a37',
  texteSecondaire: '#6b6b66',
  texteTertiaire: '#8a8a83',
  texteDiscret: '#a3a39c',

  surface: '#ffffff',
  bordure: '#e2e2de',
  bordureFine: '#ebebe7',
  separateur: '#f2f2ee',

  champFond: '#fafaf9',
  bulleAssistant: '#f2f2ee',
  bandeau: '#efeeeb',

  /** Surlignage d'une valeur modifiable — le jaune de la maquette. */
  surlignage: '#f7f2dd',

  /** Bandeau d'import détecté. */
  importFond: '#fbf3cf',
  importBordure: '#f0e39d',
  importBouton: '#d8ca86',

  /** Pastilles de canal. */
  vert: 'oklch(0.62 0.13 150)',
  orange: 'oklch(0.72 0.13 65)',
} as const;

/**
 * Polices de la maquette. Chargées par un <link> dans les pages CX-2 plutôt que
 * par next/font : next/font télécharge à la COMPILATION, ce qui ferait dépendre
 * `npm run build` du réseau. Un build qui casse au moment du déploiement pour
 * une police, c'est un prix trop élevé.
 */
export const POLICE_TEXTE = "'Schibsted Grotesk', Helvetica, Arial, sans-serif";
export const POLICE_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
export const LIEN_POLICES =
  'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700'
  + '&family=JetBrains+Mono:wght@400;500&display=swap';

/**
 * Valeur modifiable dans une bulle : surlignée ET soulignée de pointillés.
 * Les deux ensemble — le surlignage seul ne dit pas que c'est cliquable, les
 * pointillés seuls se perdent dans le texte.
 */
export const STYLE_VALEUR: React.CSSProperties = {
  background: CX2.surlignage,
  borderBottom: `1px dashed ${CX2.texteDiscret}`,
  padding: '1px 3px',
  borderRadius: '3px',
  cursor: 'pointer',
  fontWeight: 500,
};

/** Idem, page « Mon Assistant » : le surlignage déborde d'un halo. */
export const STYLE_VALEUR_HALO: React.CSSProperties = {
  ...STYLE_VALEUR,
  boxShadow: `0 0 0 2px ${CX2.surlignage}`,
  padding: '1px 0',
  borderRadius: '2px',
};

/** Champ d'édition en ligne, à la place de la valeur. */
export const STYLE_CHAMP_LIGNE: React.CSSProperties = {
  background: CX2.surlignage,
  border: 'none',
  borderBottom: `1px solid ${CX2.encre}`,
  borderRadius: '3px',
  padding: '1px 3px',
  font: 'inherit',
  fontWeight: 500,
  color: CX2.encre,
  minWidth: '40px',
};

/** Carte blanche standard des deux pages. */
export const STYLE_CARTE: React.CSSProperties = {
  background: CX2.surface,
  border: `1px solid ${CX2.bordure}`,
  borderRadius: '14px',
};

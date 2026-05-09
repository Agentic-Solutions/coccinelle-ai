// ─── Types pour l'éditeur de séquences ───────────────────────────────────────

export type NodeType =
  | 'call' | 'sms' | 'email'
  | 'condition' | 'delay'
  | 'rdv' | 'knowledge' | 'products' | 'prospect' | 'transfer'
  | 'end';

export interface NodeData extends Record<string, unknown> {
  type: NodeType;
  label: string;
  content: string;
  delayDuration?: string;
  condition?: string;
  tool?: string;
}

export interface PaletteItem {
  type: NodeType;
  label: string;
  description: string;
  category: 'CONVERSATION' | 'LOGIQUE' | 'ACTIONS' | 'FIN';
  tool?: string;
}

// ─── Configuration des types de noeuds ───────────────────────────────────────

export const NODE_CONFIG: Record<NodeType, {
  label: string;
  color: string;       // Tailwind color pour la barre du haut
  bgHover: string;     // Palette hover
  iconColor: string;   // Couleur icone
}> = {
  call:      { label: 'Appel vocal',           color: 'bg-gray-900',  bgHover: 'hover:bg-gray-50',  iconColor: 'text-gray-700' },
  sms:       { label: 'SMS',                   color: 'bg-blue-600',  bgHover: 'hover:bg-blue-50',  iconColor: 'text-blue-600' },
  email:     { label: 'Email',                 color: 'bg-violet-600', bgHover: 'hover:bg-violet-50', iconColor: 'text-violet-600' },
  condition: { label: 'Condition',             color: 'bg-amber-500', bgHover: 'hover:bg-amber-50', iconColor: 'text-amber-600' },
  delay:     { label: 'Delai',                 color: 'bg-orange-500', bgHover: 'hover:bg-orange-50', iconColor: 'text-orange-600' },
  rdv:       { label: 'Prise de RDV',          color: 'bg-green-600', bgHover: 'hover:bg-green-50', iconColor: 'text-green-600' },
  knowledge: { label: 'Base de connaissances', color: 'bg-teal-600',  bgHover: 'hover:bg-teal-50',  iconColor: 'text-teal-600' },
  products:  { label: 'Produits & Services',   color: 'bg-indigo-600', bgHover: 'hover:bg-indigo-50', iconColor: 'text-indigo-600' },
  prospect:  { label: 'Creer contact',         color: 'bg-pink-600',  bgHover: 'hover:bg-pink-50',  iconColor: 'text-pink-600' },
  transfer:  { label: 'Transfert humain',      color: 'bg-red-600',   bgHover: 'hover:bg-red-50',   iconColor: 'text-red-600' },
  end:       { label: 'Fin de sequence',       color: 'bg-gray-400',  bgHover: 'hover:bg-gray-50',  iconColor: 'text-gray-400' },
};

export const NODE_PALETTE: PaletteItem[] = [
  { type: 'call',      label: 'Appel vocal',           description: "Script que l'agent prononce",          category: 'CONVERSATION' },
  { type: 'sms',       label: 'SMS',                   description: 'Envoyer un SMS au client',             category: 'CONVERSATION' },
  { type: 'email',     label: 'Email',                 description: 'Envoyer un email au client',           category: 'CONVERSATION' },
  { type: 'condition', label: 'Condition',              description: 'Brancher selon la reponse',            category: 'LOGIQUE' },
  { type: 'delay',     label: 'Delai',                 description: "Attendre avant l'etape suivante",      category: 'LOGIQUE' },
  { type: 'rdv',       label: 'Prise de RDV',          description: 'Verifier dispos et reserver',          category: 'ACTIONS', tool: 'check_availability + book_appointment' },
  { type: 'knowledge', label: 'Base de connaissances', description: 'Chercher dans la KB',                  category: 'ACTIONS', tool: 'search_knowledge' },
  { type: 'products',  label: 'Produits & Services',   description: 'Chercher dans les produits',           category: 'ACTIONS', tool: 'search_products' },
  { type: 'prospect',  label: 'Creer contact',         description: 'Enregistrer dans le CRM',              category: 'ACTIONS', tool: 'create_prospect' },
  { type: 'transfer',  label: 'Transfert humain',      description: 'Transferer vers un conseiller',        category: 'ACTIONS', tool: 'transfer_to_human' },
  { type: 'end',       label: 'Fin',                   description: 'Terminer la sequence',                 category: 'FIN' },
];

export const PALETTE_CATEGORIES = ['CONVERSATION', 'LOGIQUE', 'ACTIONS', 'FIN'] as const;

export const DELAY_OPTIONS = [
  { value: '30s', label: '30 secondes' },
  { value: '1m',  label: '1 minute' },
  { value: '5m',  label: '5 minutes' },
  { value: '1h',  label: '1 heure' },
  { value: '4h',  label: '4 heures' },
  { value: '1d',  label: '1 jour' },
  { value: '3d',  label: '3 jours' },
  { value: '1w',  label: '1 semaine' },
];

export const CONDITION_OPTIONS = [
  { value: 'answered',     label: 'A repondu' },
  { value: 'not_answered', label: "N'a pas repondu" },
  { value: 'interested',   label: 'A exprime un interet' },
  { value: 'said_yes',     label: 'A dit oui' },
  { value: 'said_no',      label: 'A dit non' },
];

// Secteurs, moteurs LLM et générateur de prompt de démarrage pour un agent VoixIA.
// Le prompt est substitué (nom agent / société) AVANT envoi au backend :
// aucune variable {} ne doit atterrir en base (règle prompt actif).

export interface SectorOption {
  key: string;
  label: string;
}

// Les clés correspondent aux `secteur` connus du backend (fallback template si besoin).
export const SECTORS: SectorOption[] = [
  { key: "generaliste", label: "Général / Accueil" },
  { key: "immobilier", label: "Immobilier" },
  { key: "syndic", label: "Syndic de copropriété" },
  { key: "sante", label: "Santé / Cabinet médical" },
  { key: "juridique", label: "Juridique / Notaire / Avocat" },
  { key: "restauration", label: "Restauration" },
  { key: "commerce", label: "Commerce / Retail" },
  { key: "services", label: "Services / Artisan" },
];

export interface LlmOption {
  provider: string;
  model: string;
  label: string;
}

// Mistral souverain par défaut (hébergement UE). Claude en option.
export const LLM_OPTIONS: LlmOption[] = [
  { provider: "mistral", model: "mistral-large-latest", label: "Mistral Large — souverain (UE)" },
  { provider: "mistral", model: "mistral-small-latest", label: "Mistral Small — rapide (UE)" },
  { provider: "claude", model: "claude-sonnet-4-6", label: "Claude Sonnet — premium" },
];

const SECTOR_MISSION: Record<string, string> = {
  generaliste: "accueillir les appelants, répondre à leurs questions et prendre les messages ou rendez-vous.",
  immobilier: "renseigner sur les biens, qualifier les projets d'achat ou de location et fixer des visites.",
  syndic: "répondre aux copropriétaires, orienter les demandes techniques et enregistrer les incidents.",
  sante: "renseigner les patients, gérer les demandes de rendez-vous et transmettre les messages urgents.",
  juridique: "accueillir les clients, expliquer le déroulement des démarches et planifier les rendez-vous.",
  restauration: "prendre les réservations, renseigner sur la carte et les horaires, gérer les demandes de groupe.",
  commerce: "renseigner sur les produits, la disponibilité et les horaires, et orienter vers le bon interlocuteur.",
  services: "qualifier les demandes d'intervention, renseigner sur les prestations et planifier les rendez-vous.",
};

/**
 * Construit un prompt système de démarrage conforme aux règles vocales :
 * - appelle TOUJOURS search_knowledge avant de répondre sur services/tarifs
 * - OUTIL SILENCIEUX (ne jamais annoncer une recherche)
 * - liste de MOTS INTERDITS
 * Les variables sont déjà remplacées : le texte retourné part tel quel en DB.
 */
export function buildStarterPrompt(
  sectorKey: string,
  agentName: string,
  companyName: string
): string {
  const name = (agentName || "Assistant").trim();
  const company = (companyName || "l'entreprise").trim();
  const mission = SECTOR_MISSION[sectorKey] || SECTOR_MISSION.generaliste;

  return `Tu es ${name}, l'assistant vocal de ${company}.

MISSION
Ta mission est d'${mission}
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l'outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de ${company}.
Ne réponds jamais de mémoire sur ces sujets : utilise l'outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N'emploie jamais : « sur devis », « je ne sais pas », « je n'ai pas l'information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l'appelant.`;
}

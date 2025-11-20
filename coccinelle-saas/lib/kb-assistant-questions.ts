/**
 * Questions contextuelles pour l'Assistant KB guidé
 * Adapté à chaque secteur d'activité
 */

export interface Question {
  id: string;
  text: string;
  placeholder: string;
  hint?: string;
  required: boolean;
}

export interface SectorQuestions {
  sector: string;
  questions: Question[];
}

// Questions par secteur d'activité
export const SECTOR_QUESTIONS: Record<string, SectorQuestions> = {
  real_estate: {
    sector: 'Immobilier',
    questions: [
      {
        id: 'services',
        text: 'Quels types de biens proposez-vous ?',
        placeholder: 'Ex: Vente d\'appartements, location de maisons, gestion locative...',
        hint: 'Décrivez les principales catégories de biens et services',
        required: true
      },
      {
        id: 'zone',
        text: 'Quelle est votre zone géographique d\'intervention ?',
        placeholder: 'Ex: Paris 15e, Lyon et environs, Côte d\'Azur...',
        hint: 'Ville(s), quartier(s), région(s) que vous couvrez',
        required: true
      },
      {
        id: 'hours',
        text: 'Quels sont vos horaires d\'ouverture ?',
        placeholder: 'Ex: Lundi-Vendredi 9h-19h, Samedi 10h-18h, Fermé dimanche',
        hint: 'Horaires d\'ouverture de votre agence',
        required: true
      },
      {
        id: 'process',
        text: 'Comment se déroule un premier contact avec un client ?',
        placeholder: 'Ex: Échange téléphonique, prise de RDV, visite gratuite...',
        hint: 'Décrivez les premières étapes avec un nouveau prospect',
        required: true
      },
      {
        id: 'specificities',
        text: 'Avez-vous des spécificités ou offres actuelles ?',
        placeholder: 'Ex: Spécialiste immobilier de prestige, offre promotionnelle...',
        hint: 'Ce qui vous différencie ou vos offres du moment',
        required: false
      }
    ]
  },

  beauty: {
    sector: 'Beauté & Bien-être',
    questions: [
      {
        id: 'services',
        text: 'Quels sont vos principaux soins et services ?',
        placeholder: 'Ex: Coiffure, soins visage, manucure, massage...',
        hint: 'Liste des prestations que vous proposez',
        required: true
      },
      {
        id: 'location',
        text: 'Où êtes-vous situé(e) ?',
        placeholder: 'Ex: 15 rue de la Paix, Paris 2e, proche métro Opéra',
        hint: 'Adresse complète et points de repère',
        required: true
      },
      {
        id: 'hours',
        text: 'Quels sont vos horaires d\'ouverture ?',
        placeholder: 'Ex: Mardi-Samedi 9h-19h, Fermé dimanche-lundi',
        hint: 'Horaires d\'ouverture du salon',
        required: true
      },
      {
        id: 'booking',
        text: 'Comment prendre rendez-vous ?',
        placeholder: 'Ex: Par téléphone, en ligne, sur place...',
        hint: 'Modalités de réservation',
        required: true
      },
      {
        id: 'pricing',
        text: 'Avez-vous des forfaits ou tarifs spéciaux ?',
        placeholder: 'Ex: Forfait mariée 150€, réduction -20% premier RDV...',
        hint: 'Offres, forfaits, tarifs à mettre en avant',
        required: false
      }
    ]
  },

  health: {
    sector: 'Santé',
    questions: [
      {
        id: 'specialties',
        text: 'Quelles sont vos spécialités médicales ?',
        placeholder: 'Ex: Médecine générale, ostéopathie, kinésithérapie...',
        hint: 'Disciplines et spécialisations',
        required: true
      },
      {
        id: 'location',
        text: 'Où exercez-vous ?',
        placeholder: 'Ex: Cabinet médical, 10 avenue Victor Hugo, Lyon 6e',
        hint: 'Adresse du cabinet/centre',
        required: true
      },
      {
        id: 'hours',
        text: 'Quels sont vos horaires de consultation ?',
        placeholder: 'Ex: Lundi-Vendredi 8h-18h, sur RDV uniquement',
        hint: 'Horaires et modalités de consultation',
        required: true
      },
      {
        id: 'insurance',
        text: 'Acceptez-vous la carte vitale et mutuelles ?',
        placeholder: 'Ex: Secteur 1, carte vitale acceptée, tiers payant possible',
        hint: 'Informations sur les remboursements',
        required: true
      },
      {
        id: 'urgencies',
        text: 'Gérez-vous les urgences ou consultations rapides ?',
        placeholder: 'Ex: Créneaux urgences le matin, consultations sans RDV...',
        hint: 'Procédure en cas d\'urgence',
        required: false
      }
    ]
  },

  fitness: {
    sector: 'Fitness & Sport',
    questions: [
      {
        id: 'activities',
        text: 'Quelles activités sportives proposez-vous ?',
        placeholder: 'Ex: Musculation, cours collectifs, yoga, crossfit...',
        hint: 'Liste des activités disponibles',
        required: true
      },
      {
        id: 'location',
        text: 'Où est située votre salle ?',
        placeholder: 'Ex: Zone commerciale des Lilas, accès parking gratuit',
        hint: 'Adresse et informations d\'accès',
        required: true
      },
      {
        id: 'hours',
        text: 'Quels sont vos horaires d\'ouverture ?',
        placeholder: 'Ex: 6h-23h 7j/7, accès 24h/24 pour abonnés premium',
        hint: 'Plages horaires d\'ouverture',
        required: true
      },
      {
        id: 'subscriptions',
        text: 'Quels types d\'abonnements proposez-vous ?',
        placeholder: 'Ex: Sans engagement 39€/mois, annuel 299€, séance unitaire 15€',
        hint: 'Formules d\'abonnement et tarifs',
        required: true
      },
      {
        id: 'trial',
        text: 'Proposez-vous une séance d\'essai gratuite ?',
        placeholder: 'Ex: Oui, 1 séance découverte offerte sans engagement',
        hint: 'Modalités d\'essai pour nouveaux clients',
        required: false
      }
    ]
  },

  education: {
    sector: 'Éducation & Formation',
    questions: [
      {
        id: 'programs',
        text: 'Quelles formations proposez-vous ?',
        placeholder: 'Ex: Cours particuliers maths, soutien scolaire, langues...',
        hint: 'Liste des programmes et matières',
        required: true
      },
      {
        id: 'levels',
        text: 'Quels niveaux accompagnez-vous ?',
        placeholder: 'Ex: Primaire, collège, lycée, études supérieures...',
        hint: 'Niveaux scolaires ou publics cibles',
        required: true
      },
      {
        id: 'format',
        text: 'Quel est le format des cours ?',
        placeholder: 'Ex: Cours en présentiel, en ligne, à domicile...',
        hint: 'Modalités de déroulement des cours',
        required: true
      },
      {
        id: 'schedule',
        text: 'Quand les cours ont-ils lieu ?',
        placeholder: 'Ex: Soirs de semaine 18h-20h, mercredis et samedis',
        hint: 'Créneaux horaires disponibles',
        required: true
      },
      {
        id: 'pricing',
        text: 'Quels sont vos tarifs ?',
        placeholder: 'Ex: 25€/heure, forfait 10 séances 220€, premier cours gratuit',
        hint: 'Grille tarifaire et offres',
        required: false
      }
    ]
  },

  restaurant: {
    sector: 'Restaurant & Hôtellerie',
    questions: [
      {
        id: 'cuisine',
        text: 'Quel type de cuisine proposez-vous ?',
        placeholder: 'Ex: Cuisine française traditionnelle, gastronomique, italienne...',
        hint: 'Spécialités culinaires',
        required: true
      },
      {
        id: 'location',
        text: 'Où êtes-vous situé ?',
        placeholder: 'Ex: Centre-ville historique, face au port, terrasse vue mer',
        hint: 'Adresse et atouts de l\'emplacement',
        required: true
      },
      {
        id: 'hours',
        text: 'Quels sont vos horaires de service ?',
        placeholder: 'Ex: Déjeuner 12h-14h, dîner 19h-22h30, fermé dimanche soir',
        hint: 'Services midi/soir et jours de fermeture',
        required: true
      },
      {
        id: 'booking',
        text: 'Comment réserver une table ?',
        placeholder: 'Ex: Par téléphone, en ligne sur notre site, TheFork...',
        hint: 'Modalités de réservation',
        required: true
      },
      {
        id: 'menu',
        text: 'Avez-vous des menus ou formules spéciales ?',
        placeholder: 'Ex: Menu du jour 18€, formule brunch dimanche 25€...',
        hint: 'Menus, formules, plats signatures',
        required: false
      }
    ]
  },

  // Secteur par défaut pour les autres secteurs
  default: {
    sector: 'Votre activité',
    questions: [
      {
        id: 'services',
        text: 'Quels produits ou services proposez-vous ?',
        placeholder: 'Ex: Conseil, vente, installation, maintenance...',
        hint: 'Décrivez vos principales offres',
        required: true
      },
      {
        id: 'location',
        text: 'Où êtes-vous situé ou quelle zone couvrez-vous ?',
        placeholder: 'Ex: Lyon et région Rhône-Alpes, intervention nationale...',
        hint: 'Zone géographique d\'intervention',
        required: true
      },
      {
        id: 'hours',
        text: 'Quels sont vos horaires ou disponibilités ?',
        placeholder: 'Ex: Lundi-Vendredi 9h-18h, astreinte 24/7...',
        hint: 'Horaires de disponibilité',
        required: true
      },
      {
        id: 'process',
        text: 'Comment se passe un premier contact ?',
        placeholder: 'Ex: Devis gratuit, diagnostic offert, RDV téléphonique...',
        hint: 'Première étape avec un nouveau client',
        required: true
      },
      {
        id: 'specificities',
        text: 'Qu\'est-ce qui vous différencie ?',
        placeholder: 'Ex: 20 ans d\'expérience, garantie satisfaction, tarifs compétitifs...',
        hint: 'Vos atouts et spécificités',
        required: false
      }
    ]
  }
};

/**
 * Récupère les questions pour un secteur donné
 */
export function getQuestionsForSector(sector: string): SectorQuestions {
  return SECTOR_QUESTIONS[sector] || SECTOR_QUESTIONS.default;
}

/**
 * Génère des documents de base à partir des réponses
 */
export function generateDocumentsFromAnswers(
  sector: string,
  companyName: string,
  answers: Record<string, string>
): Array<{ title: string; content: string }> {
  const documents = [];
  const sectorInfo = getQuestionsForSector(sector);

  // Document 1: Présentation générale
  const services = answers.services || answers.activities || answers.programs || answers.cuisine || '';
  if (services) {
    documents.push({
      title: `${companyName} - Présentation et services`,
      content: `# ${companyName}

## À propos de nous

${companyName} est spécialisé dans le secteur ${sectorInfo.sector.toLowerCase()}.

## Nos services

${services}

${answers.specificities ? `## Ce qui nous différencie\n\n${answers.specificities}\n` : ''}
## Questions fréquentes

**Puis-je vous contacter pour plus d'informations ?**
Bien sûr ! N'hésitez pas à nous contacter pour toute question sur nos services.

**Comment puis-je prendre rendez-vous ?**
${answers.booking || answers.process || 'Contactez-nous par téléphone ou consultez nos horaires ci-dessous.'}

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Document 2: Informations pratiques
  const location = answers.location || answers.zone || '';
  const hours = answers.hours || answers.schedule || '';

  if (location || hours) {
    documents.push({
      title: `${companyName} - Coordonnées et horaires`,
      content: `# ${companyName} - Nous trouver

${location ? `## 📍 Notre localisation\n\n${location}\n` : ''}
${hours ? `## ⏰ Nos horaires\n\n${hours}\n` : ''}
${answers.booking ? `## 📅 Prendre rendez-vous\n\n${answers.booking}\n` : ''}
${answers.process ? `## 🤝 Premier contact\n\n${answers.process}\n\nNous sommes à votre écoute pour répondre à toutes vos questions et vous accompagner dans votre démarche.\n` : ''}
## Questions pratiques

**Êtes-vous facilement accessible ?**
${location ? `Oui, nous sommes situés à ${location.split(',')[0] || 'une localisation pratique'}.` : 'Oui, nous sommes facilement accessibles.'}

**Puis-je venir sans rendez-vous ?**
${hours ? 'Consultez nos horaires ci-dessus. ' : ''}Nous recommandons de prendre rendez-vous pour un meilleur service.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Document 3: Tarifs et offres (si disponible)
  const pricing = answers.pricing || answers.subscriptions || answers.menu || '';
  if (pricing) {
    documents.push({
      title: `${companyName} - Tarifs et modalités`,
      content: `# ${companyName} - Tarifs

## 💰 Nos tarifs

${pricing}

${answers.trial ? `## 🎁 Offre spéciale\n\n${answers.trial}\n` : ''}
${answers.insurance ? `## 💳 Modalités de paiement et remboursement\n\n${answers.insurance}\n` : ''}
## Questions sur les tarifs

**Les tarifs sont-ils négociables ?**
Nos tarifs sont transparents et compétitifs. Contactez-nous pour discuter de vos besoins spécifiques.

**Proposez-vous des forfaits ou abonnements ?**
${answers.subscriptions || answers.pricing ? 'Consultez nos offres ci-dessus pour plus de détails.' : 'Contactez-nous pour découvrir nos formules adaptées à vos besoins.'}

**Puis-je obtenir un devis personnalisé ?**
Absolument ! N'hésitez pas à nous contacter pour une étude gratuite et sans engagement.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Document 4: Spécificités secteur

  // Immobilier
  if (sector === 'real_estate' && (answers.services || answers.zone)) {
    documents.push({
      title: `${companyName} - Guide acheteur et vendeur`,
      content: `# ${companyName} - Guide complet immobilier

## 🏡 Types de biens et services

${answers.services || 'Nous proposons une large gamme de biens immobiliers.'}

${answers.zone ? `## 📍 Zone d'intervention\n\n${answers.zone}\n` : ''}

## Questions fréquentes immobilier

**Comment organiser une visite ?**
${answers.process || 'Contactez-nous par téléphone ou via notre formulaire. Nous organiserons une visite selon vos disponibilités.'}

**Proposez-vous un accompagnement pour les démarches ?**
Oui, nous vous accompagnons de A à Z : recherche, visites, négociation, dossier de financement, signature chez le notaire.

**Puis-je vendre et acheter en même temps ?**
Absolument ! Nous coordonnons les deux opérations pour sécuriser votre projet immobilier.

**Vos biens sont-ils à jour ?**
${answers.specificities && answers.specificities.toLowerCase().includes('exclusivité') ? 'Nous disposons de biens en exclusivité, mis à jour quotidiennement.' : 'Notre catalogue est actualisé quotidiennement avec les dernières opportunités du marché.'}

**Faites-vous des estimations gratuites ?**
Oui, nous réalisons des estimations gratuites et sans engagement pour votre bien immobilier.

**Quels quartiers couvrez-vous ?**
${answers.zone ? `Nous intervenons principalement sur ${answers.zone.split(',')[0]}.` : 'Contactez-nous pour connaître notre zone d\'intervention précise.'}

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Santé
  if (sector === 'health' && answers.urgencies) {
    documents.push({
      title: `${companyName} - Urgences et consultations`,
      content: `# ${companyName} - Urgences et consultations rapides

## 🚨 Gestion des urgences

${answers.urgencies}

## Questions urgentes

**Comment contacter en cas d'urgence ?**
En cas d'urgence, veuillez nous contacter directement par téléphone. Un professionnel de santé vous répondra rapidement.

**Les urgences sont-elles prises en charge immédiatement ?**
${answers.urgencies.toLowerCase().includes('urgent') || answers.urgencies.toLowerCase().includes('rapide') ? 'Oui, nous disposons de créneaux réservés aux urgences.' : 'Nous faisons notre possible pour vous recevoir dans les meilleurs délais. Appelez-nous pour évaluer votre situation.'}

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Beauté & Bien-être
  if (sector === 'beauty' && answers.services) {
    documents.push({
      title: `${companyName} - Nos soins et prestations`,
      content: `# ${companyName} - Carte des soins

## 💅 Nos prestations

${answers.services}

${answers.pricing ? `## 💰 Forfaits et tarifs\n\n${answers.pricing}\n` : ''}

## Questions beauté

**Dois-je prendre rendez-vous obligatoirement ?**
${answers.booking || 'Nous recommandons de prendre rendez-vous pour garantir votre créneau, mais nous acceptons aussi les clients sans RDV selon nos disponibilités.'}

**Utilisez-vous des produits bio/naturels ?**
Nous sélectionnons des produits de qualité professionnelle. N'hésitez pas à nous faire part de vos préférences lors de la prise de RDV.

**Proposez-vous des forfaits ou cartes de fidélité ?**
${answers.pricing && answers.pricing.toLowerCase().includes('forfait') ? 'Oui, consultez nos forfaits ci-dessus.' : 'Contactez-nous pour découvrir nos offres et programmes de fidélité.'}

**Puis-je offrir un soin en carte cadeau ?**
Oui, nous proposons des cartes cadeaux pour tous nos soins, valables 1 an.

**Combien de temps dure un soin ?**
La durée varie selon la prestation (30min à 2h). Nous vous précisons la durée lors de la réservation.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Fitness & Sport
  if (sector === 'fitness' && answers.activities) {
    documents.push({
      title: `${companyName} - Activités et abonnements`,
      content: `# ${companyName} - Programme sportif

## 💪 Nos activités

${answers.activities}

${answers.subscriptions ? `## 🎟️ Formules d'abonnement\n\n${answers.subscriptions}\n` : ''}

## Questions fitness

**Proposez-vous un cours d'essai gratuit ?**
${answers.trial || 'Oui, venez tester nos installations et cours gratuitement lors d\'une séance découverte !'}

**Puis-je venir sans abonnement ?**
${answers.subscriptions && answers.subscriptions.toLowerCase().includes('carte') ? 'Oui, nous proposons des cartes à l\'unité en plus des abonnements.' : 'Nous proposons à la fois des abonnements et des entrées à l\'unité.'}

**Y a-t-il un coach pour m'accompagner ?**
Oui, nos coachs diplômés sont disponibles pour vous conseiller et créer des programmes personnalisés.

**Dois-je apporter mon matériel ?**
${answers.equipment || 'Non, tout le matériel nécessaire est fourni sur place. Prévoyez simplement votre tenue de sport et votre serviette.'}

**Quels sont les horaires d'affluence ?**
En général, 12h-14h et 18h-20h sont les créneaux les plus fréquentés. Pour plus de tranquillité, privilégiez les matinées ou milieu d'après-midi.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  // Education
  if (sector === 'education' && answers.levels) {
    documents.push({
      title: `${companyName} - Programmes et niveaux`,
      content: `# ${companyName} - Nos programmes de formation

## 📚 Niveaux proposés

${answers.levels}

${answers.format ? `## 🎓 Format des cours\n\n${answers.format}\n` : ''}
## Questions pédagogiques

**Quel niveau dois-je avoir pour commencer ?**
Nos formations s'adaptent à tous les niveaux mentionnés ci-dessus. Un test de positionnement peut être proposé.

**Les cours sont-ils personnalisés ?**
${answers.format && answers.format.toLowerCase().includes('personnalisé') ? 'Oui, nos cours sont personnalisés selon vos besoins.' : 'Nous adaptons notre pédagogie à chaque élève pour un apprentissage optimal.'}

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*`
    });
  }

  return documents;
}

/**
 * Calcule un score initial de KB basé sur les réponses
 */
export function calculateInitialScore(answers: Record<string, string>, questions: Question[]): number {
  const requiredAnswered = questions.filter(q => q.required).filter(q => answers[q.id]?.trim()).length;
  const requiredTotal = questions.filter(q => q.required).length;

  const optionalAnswered = questions.filter(q => !q.required).filter(q => answers[q.id]?.trim()).length;
  const optionalTotal = questions.filter(q => !q.required).length;

  // Score basé sur les questions obligatoires (80%) + optionnelles (20%)
  const requiredScore = (requiredAnswered / requiredTotal) * 80;
  const optionalScore = optionalTotal > 0 ? (optionalAnswered / optionalTotal) * 20 : 20;

  return Math.round(requiredScore + optionalScore);
}

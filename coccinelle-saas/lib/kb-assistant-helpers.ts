/**
 * Fonctions helpers pour la génération de documents KB par secteur
 */

const FOOTER = '\n---\n\n*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*';

export function createPresentationDocument(companyName: string, sector: string, services: string, specificities?: string, booking?: string, process?: string) {
  return {
    title: `${companyName} - Présentation et services`,
    content: `# ${companyName}

## À propos de nous

${companyName} est spécialisé dans le secteur ${sector.toLowerCase()}.

## Nos services

${services}

${specificities ? `## Ce qui nous différencie\n\n${specificities}\n` : ''}
## Questions fréquentes

**Puis-je vous contacter pour plus d'informations ?**
Bien sûr ! N'hésitez pas à nous contacter pour toute question sur nos services.

**Comment puis-je prendre rendez-vous ?**
${booking || process || 'Contactez-nous par téléphone ou consultez nos horaires ci-dessous.'}
${FOOTER}`
  };
}

export function createLocationDocument(companyName: string, location: string, hours: string, booking?: string, process?: string) {
  return {
    title: `${companyName} - Coordonnées et horaires`,
    content: `# ${companyName} - Nous trouver

${location ? `## 📍 Notre localisation\n\n${location}\n` : ''}
${hours ? `## ⏰ Nos horaires\n\n${hours}\n` : ''}
${booking ? `## 📅 Prendre rendez-vous\n\n${booking}\n` : ''}
${process ? `## 🤝 Premier contact\n\n${process}\n\nNous sommes à votre écoute pour répondre à toutes vos questions et vous accompagner dans votre démarche.\n` : ''}
## Questions pratiques

**Êtes-vous facilement accessible ?**
${location ? `Oui, nous sommes situés à ${location.split(',')[0] || 'une localisation pratique'}.` : 'Oui, nous sommes facilement accessibles.'}

**Puis-je venir sans rendez-vous ?**
${hours ? 'Consultez nos horaires ci-dessus. ' : ''}Nous recommandons de prendre rendez-vous pour un meilleur service.
${FOOTER}`
  };
}

export function createPricingDocument(companyName: string, pricing: string, trial?: string, insurance?: string, subscriptions?: string) {
  return {
    title: `${companyName} - Tarifs et modalités`,
    content: `# ${companyName} - Tarifs

## 💰 Nos tarifs

${pricing}

${trial ? `## 🎁 Offre spéciale\n\n${trial}\n` : ''}
${insurance ? `## 💳 Modalités de paiement et remboursement\n\n${insurance}\n` : ''}
## Questions sur les tarifs

**Les tarifs sont-ils négociables ?**
Nos tarifs sont transparents et compétitifs. Contactez-nous pour discuter de vos besoins spécifiques.

**Proposez-vous des forfaits ou abonnements ?**
${subscriptions || pricing ? 'Consultez nos offres ci-dessus pour plus de détails.' : 'Contactez-nous pour découvrir nos formules adaptées à vos besoins.'}

**Puis-je obtenir un devis personnalisé ?**
Absolument ! N'hésitez pas à nous contacter pour une étude gratuite et sans engagement.
${FOOTER}`
  };
}

export function createRealEstateDocument(companyName: string, services: string, zone: string, process?: string, specificities?: string) {
  return {
    title: `${companyName} - Guide acheteur et vendeur`,
    content: `# ${companyName} - Guide complet immobilier

## 🏡 Types de biens et services

${services || 'Nous proposons une large gamme de biens immobiliers.'}

${zone ? `## 📍 Zone d'intervention\n\n${zone}\n` : ''}

## Questions fréquentes immobilier

**Comment organiser une visite ?**
${process || 'Contactez-nous par téléphone ou via notre formulaire. Nous organiserons une visite selon vos disponibilités.'}

**Proposez-vous un accompagnement pour les démarches ?**
Oui, nous vous accompagnons de A à Z : recherche, visites, négociation, dossier de financement, signature chez le notaire.

**Puis-je vendre et acheter en même temps ?**
Absolument ! Nous coordonnons les deux opérations pour sécuriser votre projet immobilier.

**Vos biens sont-ils à jour ?**
${specificities && specificities.toLowerCase().includes('exclusivité') ? 'Nous disposons de biens en exclusivité, mis à jour quotidiennement.' : 'Notre catalogue est actualisé quotidiennement avec les dernières opportunités du marché.'}

**Faites-vous des estimations gratuites ?**
Oui, nous réalisons des estimations gratuites et sans engagement pour votre bien immobilier.

**Quels quartiers couvrez-vous ?**
${zone ? `Nous intervenons principalement sur ${zone.split(',')[0]}.` : 'Contactez-nous pour connaître notre zone d\'intervention précise.'}
${FOOTER}`
  };
}

export function createHealthDocument(companyName: string, urgencies: string) {
  return {
    title: `${companyName} - Urgences et consultations`,
    content: `# ${companyName} - Urgences et consultations rapides

## 🚨 Gestion des urgences

${urgencies}

## Questions urgentes

**Comment contacter en cas d'urgence ?**
En cas d'urgence, veuillez nous contacter directement par téléphone. Un professionnel de santé vous répondra rapidement.

**Les urgences sont-elles prises en charge immédiatement ?**
${urgencies.toLowerCase().includes('urgent') || urgencies.toLowerCase().includes('rapide') ? 'Oui, nous disposons de créneaux réservés aux urgences.' : 'Nous faisons notre possible pour vous recevoir dans les meilleurs délais. Appelez-nous pour évaluer votre situation.'}
${FOOTER}`
  };
}

export function createBeautyDocument(companyName: string, services: string, pricing?: string, booking?: string) {
  return {
    title: `${companyName} - Nos soins et prestations`,
    content: `# ${companyName} - Carte des soins

## 💅 Nos prestations

${services}

${pricing ? `## 💰 Forfaits et tarifs\n\n${pricing}\n` : ''}

## Questions beauté

**Dois-je prendre rendez-vous obligatoirement ?**
${booking || 'Nous recommandons de prendre rendez-vous pour garantir votre créneau, mais nous acceptons aussi les clients sans RDV selon nos disponibilités.'}

**Utilisez-vous des produits bio/naturels ?**
Nous sélectionnons des produits de qualité professionnelle. N'hésitez pas à nous faire part de vos préférences lors de la prise de RDV.

**Proposez-vous des forfaits ou cartes de fidélité ?**
${pricing && pricing.toLowerCase().includes('forfait') ? 'Oui, consultez nos forfaits ci-dessus.' : 'Contactez-nous pour découvrir nos offres et programmes de fidélité.'}

**Puis-je offrir un soin en carte cadeau ?**
Oui, nous proposons des cartes cadeaux pour tous nos soins, valables 1 an.

**Combien de temps dure un soin ?**
La durée varie selon la prestation (30min à 2h). Nous vous précisons la durée lors de la réservation.
${FOOTER}`
  };
}

export function createFitnessDocument(companyName: string, activities: string, subscriptions?: string, trial?: string) {
  return {
    title: `${companyName} - Activités et abonnements`,
    content: `# ${companyName} - Programme sportif

## 💪 Nos activités

${activities}

${subscriptions ? `## 🎟️ Formules d'abonnement\n\n${subscriptions}\n` : ''}

## Questions fitness

**Proposez-vous un cours d'essai gratuit ?**
${trial || 'Oui, venez tester nos installations et cours gratuitement lors d\'une séance découverte !'}

**Puis-je venir sans abonnement ?**
${subscriptions && subscriptions.toLowerCase().includes('carte') ? 'Oui, nous proposons des cartes à l\'unité en plus des abonnements.' : 'Nous proposons à la fois des abonnements et des entrées à l\'unité.'}

**Y a-t-il un coach pour m'accompagner ?**
Oui, nos coachs diplômés sont disponibles pour vous conseiller et créer des programmes personnalisés.

**Dois-je apporter mon matériel ?**
Non, tout le matériel nécessaire est fourni sur place. Prévoyez simplement votre tenue de sport et votre serviette.

**Quels sont les horaires d'affluence ?**
En général, 12h-14h et 18h-20h sont les créneaux les plus fréquentés. Pour plus de tranquillité, privilégiez les matinées ou milieu d'après-midi.
${FOOTER}`
  };
}

export function createEducationDocument(companyName: string, levels: string, format?: string) {
  return {
    title: `${companyName} - Programmes et niveaux`,
    content: `# ${companyName} - Nos programmes de formation

## 📚 Niveaux proposés

${levels}

${format ? `## 🎓 Format des cours\n\n${format}\n` : ''}
## Questions pédagogiques

**Quel niveau dois-je avoir pour commencer ?**
Nos formations s'adaptent à tous les niveaux mentionnés ci-dessus. Un test de positionnement peut être proposé.

**Les cours sont-ils personnalisés ?**
${format && format.toLowerCase().includes('personnalisé') ? 'Oui, nos cours sont personnalisés selon vos besoins.' : 'Nous adaptons notre pédagogie à chaque élève pour un apprentissage optimal.'}
${FOOTER}`
  };
}

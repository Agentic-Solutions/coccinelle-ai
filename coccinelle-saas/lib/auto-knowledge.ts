// Auto-Knowledge Builder - Analyse intelligente et suggestions automatiques
// Détecte les lacunes de contenu et propose des optimisations

export interface KnowledgeGap {
  id: string;
  type: 'missing_content' | 'outdated_content' | 'low_quality' | 'frequent_question';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction: string;
  affectedQueries?: string[];
  estimatedImpact: 'high' | 'medium' | 'low';
  metadata?: {
    questionCount?: number;
    successRate?: number;
    lastUpdated?: string;
  };
}

export interface ContentSuggestion {
  id: string;
  type: 'new_document' | 'update_document' | 'merge_documents' | 'delete_document';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetDocument?: string;
  suggestedContent?: string;
  reason: string;
  impact: number; // 0-100
}

export interface KBHealthScore {
  overall: number; // 0-100
  coverage: number; // % de questions couvertes
  quality: number; // Qualité moyenne des documents
  freshness: number; // % de documents récents
  usage: number; // Taux d'utilisation
  breakdown: {
    totalDocuments: number;
    activeDocuments: number;
    outdatedDocuments: number;
    unusedDocuments: number;
    gapCount: number;
  };
}

export interface AutoKnowledgeAnalysis {
  healthScore: KBHealthScore;
  gaps: KnowledgeGap[];
  suggestions: ContentSuggestion[];
  topQuestions: Array<{
    question: string;
    count: number;
    covered: boolean;
    documentId?: string;
  }>;
  insights: string[];
}

// Analyser les questions fréquentes non couvertes
function analyzeQuestionCoverage(
  calls: any[],
  appointments: any[],
  documents: any[]
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Simuler l'extraction de questions depuis les transcriptions
  // Dans un vrai système, on analyserait les transcripts avec NLP
  const frequentQuestions = extractFrequentQuestions(calls, appointments);

  frequentQuestions.forEach((q) => {
    // Vérifier si la question est couverte par un document
    const isCovered = documents.some((doc) =>
      isQuestionCoveredByDocument(q.question, doc)
    );

    if (!isCovered && q.count > 5) {
      gaps.push({
        id: `gap-question-${q.question.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'frequent_question',
        title: `Question fréquente non documentée`,
        description: `"${q.question}" a été posée ${q.count} fois mais n'est pas couverte par la KB.`,
        priority: q.count > 20 ? 'critical' : q.count > 10 ? 'high' : 'medium',
        suggestedAction: 'Créer un document dédié',
        affectedQueries: [q.question],
        estimatedImpact: q.count > 20 ? 'high' : q.count > 10 ? 'medium' : 'low',
        metadata: {
          questionCount: q.count
        }
      });
    }
  });

  return gaps;
}

// Détecter les documents obsolètes
function detectOutdatedContent(documents: any[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];
  const now = new Date();

  documents.forEach((doc) => {
    const lastUpdate = new Date(doc.updated_at || doc.created_at);
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Alerte si document non mis à jour depuis plus de 90 jours
    if (daysSinceUpdate > 90) {
      gaps.push({
        id: `gap-outdated-${doc.id}`,
        type: 'outdated_content',
        title: `Document potentiellement obsolète`,
        description: `"${doc.title}" n'a pas été mis à jour depuis ${daysSinceUpdate} jours.`,
        priority: daysSinceUpdate > 180 ? 'high' : 'medium',
        suggestedAction: 'Vérifier et mettre à jour le contenu',
        estimatedImpact: 'medium',
        metadata: {
          lastUpdated: lastUpdate.toISOString()
        }
      });
    }
  });

  return gaps;
}

// Détecter les documents peu utilisés
function detectUnusedContent(documents: any[], calls: any[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Simuler le tracking d'utilisation des documents
  // Dans un vrai système, on trackait l'utilisation réelle
  const documentUsage = calculateDocumentUsage(documents, calls);

  documents.forEach((doc) => {
    const usage = documentUsage[doc.id] || 0;

    if (documents.length > 5 && usage < 2 && isOlderThan30Days(doc)) {
      gaps.push({
        id: `gap-unused-${doc.id}`,
        type: 'low_quality',
        title: `Document peu utilisé`,
        description: `"${doc.title}" n'a été utilisé que ${usage} fois. Envisagez de le supprimer ou de le fusionner.`,
        priority: 'low',
        suggestedAction: 'Archiver ou fusionner',
        estimatedImpact: 'low',
        metadata: {
          questionCount: usage
        }
      });
    }
  });

  return gaps;
}

// Détecter les lacunes de contenu par catégorie
function detectContentGaps(documents: any[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Catégories essentielles pour un business immobilier
  const essentialCategories = [
    { name: 'Horaires', keywords: ['horaire', 'ouverture', 'fermeture', 'disponibilité'] },
    { name: 'Tarifs', keywords: ['prix', 'tarif', 'coût', 'honoraire'] },
    { name: 'Services', keywords: ['service', 'prestation', 'offre'] },
    { name: 'Localisation', keywords: ['adresse', 'lieu', 'situé', 'localisation'] },
    { name: 'Contact', keywords: ['contact', 'téléphone', 'email', 'joindre'] },
    { name: 'Biens', keywords: ['appartement', 'maison', 'bien', 'propriété', 'logement'] }
  ];

  essentialCategories.forEach((category) => {
    const hasCoverage = documents.some((doc) =>
      category.keywords.some((keyword) =>
        doc.title.toLowerCase().includes(keyword) ||
        (doc.content && doc.content.toLowerCase().includes(keyword))
      )
    );

    if (!hasCoverage) {
      gaps.push({
        id: `gap-category-${category.name.toLowerCase()}`,
        type: 'missing_content',
        title: `Contenu manquant : ${category.name}`,
        description: `Aucun document ne couvre la catégorie "${category.name}". Cela pourrait limiter la capacité de Assistant à répondre.`,
        priority: 'high',
        suggestedAction: `Créer un document sur ${category.name}`,
        estimatedImpact: 'high'
      });
    }
  });

  return gaps;
}

// Générer des suggestions de contenu
function generateContentSuggestions(
  gaps: KnowledgeGap[],
  documents: any[]
): ContentSuggestion[] {
  const suggestions: ContentSuggestion[] = [];

  // Suggestions basées sur les gaps
  gaps.forEach((gap) => {
    if (gap.type === 'frequent_question') {
      suggestions.push({
        id: `suggest-new-${gap.id}`,
        type: 'new_document',
        title: `Créer un document FAQ`,
        description: `Créer un nouveau document pour répondre à "${gap.affectedQueries?.[0]}"`,
        priority: gap.priority === 'critical' ? 'high' : 'medium',
        suggestedContent: generateFAQTemplate(gap.affectedQueries?.[0] || ''),
        reason: `Question posée ${gap.metadata?.questionCount || 0} fois`,
        impact: gap.metadata?.questionCount || 0
      });
    }

    if (gap.type === 'outdated_content') {
      suggestions.push({
        id: `suggest-update-${gap.id}`,
        type: 'update_document',
        title: `Mettre à jour le document`,
        description: gap.description,
        priority: 'medium',
        reason: 'Contenu potentiellement obsolète',
        impact: 50
      });
    }

    if (gap.type === 'low_quality') {
      suggestions.push({
        id: `suggest-delete-${gap.id}`,
        type: 'delete_document',
        title: `Archiver le document`,
        description: gap.description,
        priority: 'low',
        reason: 'Document peu utilisé',
        impact: 20
      });
    }
  });

  // Détecter les documents qui pourraient être fusionnés
  const mergeSuggestions = detectMergeCandidates(documents);
  suggestions.push(...mergeSuggestions);

  // Trier par impact décroissant
  return suggestions.sort((a, b) => b.impact - a.impact);
}

// Détecter les documents candidats à la fusion
function detectMergeCandidates(documents: any[]): ContentSuggestion[] {
  const suggestions: ContentSuggestion[] = [];

  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      const doc1 = documents[i];
      const doc2 = documents[j];

      // Calculer similarité (simplifiée)
      const similarity = calculateTitleSimilarity(doc1.title, doc2.title);

      if (similarity > 0.7) {
        suggestions.push({
          id: `suggest-merge-${doc1.id}-${doc2.id}`,
          type: 'merge_documents',
          title: `Fusionner documents similaires`,
          description: `"${doc1.title}" et "${doc2.title}" semblent traiter du même sujet.`,
          priority: 'low',
          targetDocument: doc1.id,
          reason: 'Documents redondants détectés',
          impact: 30
        });
      }
    }
  }

  return suggestions;
}

// Calculer le score de santé de la KB
function calculateHealthScore(
  documents: any[],
  gaps: KnowledgeGap[],
  calls: any[]
): KBHealthScore {
  const now = new Date();

  // Coverage: % de questions fréquentes couvertes
  const frequentQuestions = extractFrequentQuestions(calls, []);
  const coveredQuestions = frequentQuestions.filter((q) =>
    documents.some((doc) => isQuestionCoveredByDocument(q.question, doc))
  );
  const coverage = frequentQuestions.length > 0
    ? (coveredQuestions.length / frequentQuestions.length) * 100
    : 50;

  // Quality: basé sur le nombre de gaps critiques
  const criticalGaps = gaps.filter((g) => g.priority === 'critical').length;
  const quality = Math.max(0, 100 - criticalGaps * 20);

  // Freshness: % de documents mis à jour récemment (< 90 jours)
  const recentDocs = documents.filter((doc) => {
    const lastUpdate = new Date(doc.updated_at || doc.created_at);
    const daysSince = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 90;
  });
  const freshness = documents.length > 0 ? (recentDocs.length / documents.length) * 100 : 0;

  // Usage: basé sur la présence de documents inutilisés
  const unusedGaps = gaps.filter((g) => g.type === 'low_quality').length;
  const usage = documents.length > 0 ? Math.max(0, 100 - (unusedGaps / documents.length) * 100) : 0;

  // Score global (moyenne pondérée)
  const overall = Math.round(
    coverage * 0.35 +
    quality * 0.30 +
    freshness * 0.20 +
    usage * 0.15
  );

  return {
    overall,
    coverage: Math.round(coverage),
    quality: Math.round(quality),
    freshness: Math.round(freshness),
    usage: Math.round(usage),
    breakdown: {
      totalDocuments: documents.length,
      activeDocuments: recentDocs.length,
      outdatedDocuments: gaps.filter((g) => g.type === 'outdated_content').length,
      unusedDocuments: unusedGaps,
      gapCount: gaps.filter((g) => g.priority === 'critical' || g.priority === 'high').length
    }
  };
}

// Fonction principale d'analyse
export function analyzeKnowledgeBase(data: {
  documents: any[];
  calls: any[];
  appointments: any[];
}): AutoKnowledgeAnalysis {
  const { documents, calls, appointments } = data;

  // Détecter tous les gaps
  const allGaps = [
    ...analyzeQuestionCoverage(calls, appointments, documents),
    ...detectOutdatedContent(documents),
    ...detectUnusedContent(documents, calls),
    ...detectContentGaps(documents)
  ];

  // Trier par priorité
  const sortedGaps = allGaps.sort((a, b) => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  // Générer suggestions
  const suggestions = generateContentSuggestions(sortedGaps, documents);

  // Calculer score de santé
  const healthScore = calculateHealthScore(documents, sortedGaps, calls);

  // Top questions
  const topQuestions = extractFrequentQuestions(calls, appointments)
    .slice(0, 10)
    .map((q) => ({
      question: q.question,
      count: q.count,
      covered: documents.some((doc) => isQuestionCoveredByDocument(q.question, doc)),
      documentId: documents.find((doc) => isQuestionCoveredByDocument(q.question, doc))?.id
    }));

  // Insights généraux
  const insights = generateInsights(healthScore, sortedGaps, documents);

  return {
    healthScore,
    gaps: sortedGaps.slice(0, 15), // Top 15 gaps
    suggestions: suggestions.slice(0, 10), // Top 10 suggestions
    topQuestions,
    insights
  };
}

// Fonctions utilitaires

function extractFrequentQuestions(calls: any[], appointments: any[]) {
  // Simuler l'extraction de questions
  // Dans un vrai système, on utiliserait NLP sur les transcripts
  const questions = [
    { question: "Quels sont vos horaires d'ouverture ?", count: 45 },
    { question: "Comment prendre rendez-vous ?", count: 38 },
    { question: "Quels types de biens proposez-vous ?", count: 32 },
    { question: "Où êtes-vous situés ?", count: 28 },
    { question: "Quels sont vos tarifs ?", count: 24 },
    { question: "Proposez-vous des visites virtuelles ?", count: 18 },
    { question: "Travaillez-vous le weekend ?", count: 15 },
    { question: "Puis-je annuler mon rendez-vous ?", count: 12 },
    { question: "Combien coûte une estimation ?", count: 10 },
    { question: "Acceptez-vous les paiements en ligne ?", count: 8 }
  ];

  return questions;
}

function isQuestionCoveredByDocument(question: string, document: any): boolean {
  // Simplification: vérifier si des mots-clés de la question sont dans le doc
  const questionWords = question.toLowerCase().split(/\s+/);
  const docText = `${document.title} ${document.content || ''}`.toLowerCase();

  // Considérer couvert si au moins 40% des mots clés sont présents
  const matchCount = questionWords.filter((word) =>
    word.length > 3 && docText.includes(word)
  ).length;

  return matchCount / questionWords.length > 0.4;
}

function calculateDocumentUsage(documents: any[], calls: any[]): Record<string, number> {
  // Simuler l'utilisation basée sur le nombre d'appels
  const usage: Record<string, number> = {};

  documents.forEach((doc, index) => {
    // Simuler usage variable
    usage[doc.id] = Math.floor(Math.random() * calls.length * 0.3);
  });

  return usage;
}

function isOlderThan30Days(doc: any): boolean {
  const created = new Date(doc.created_at);
  const now = new Date();
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff > 30;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  // Similarité basique (Jaccard)
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function generateFAQTemplate(question: string): string {
  return `# ${question}

## Réponse courte
[Insérer une réponse concise ici]

## Détails complémentaires
[Ajouter plus d'informations si nécessaire]

## Liens utiles
- [Lien 1]
- [Lien 2]

---
*Document généré automatiquement par Coccinelle AI*`;
}

function generateInsights(
  healthScore: KBHealthScore,
  gaps: KnowledgeGap[],
  documents: any[]
): string[] {
  const insights: string[] = [];

  if (healthScore.overall >= 80) {
    insights.push("✅ Excellente santé de votre KB ! Continuez à maintenir ce niveau.");
  } else if (healthScore.overall >= 60) {
    insights.push("⚠️ KB en bonne santé, mais des améliorations sont possibles.");
  } else {
    insights.push("🔴 Votre KB nécessite une attention urgente pour améliorer les performances.");
  }

  if (healthScore.coverage < 70) {
    const missingCoverage = 100 - healthScore.coverage;
    insights.push(
      `📊 ${missingCoverage}% des questions fréquentes ne sont pas couvertes. Priorisez l'ajout de contenu.`
    );
  }

  if (healthScore.freshness < 50) {
    insights.push(
      "📅 Plus de la moitié de vos documents n'ont pas été mis à jour récemment. Planifiez une revue."
    );
  }

  const criticalGaps = gaps.filter((g) => g.priority === 'critical').length;
  if (criticalGaps > 0) {
    insights.push(
      `🚨 ${criticalGaps} lacune(s) critique(s) détectée(s). Agissez rapidement pour éviter l'impact sur les utilisateurs.`
    );
  }

  if (documents.length < 5) {
    insights.push(
      "📝 Votre KB contient peu de documents. Enrichissez-la pour améliorer la qualité des réponses."
    );
  } else if (documents.length > 50) {
    insights.push(
      "📚 KB volumineuse détectée. Envisagez de consolider et nettoyer les documents inutilisés."
    );
  }

  return insights;
}

// Export de fonctions utilitaires
export function getHealthScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Très Bon';
  if (score >= 70) return 'Bon';
  if (score >= 60) return 'Moyen';
  if (score >= 50) return 'Faible';
  return 'Critique';
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100';
  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
  if (score >= 40) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

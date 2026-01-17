// Assistant Call Analytics Engine - Analyse des performances des appels entrants
// Optimisation de l'agent vocal Assistant qui reçoit les appels

export interface CallEvent {
  id: string;
  type: 'received' | 'handled' | 'qualified' | 'rdv_created' | 'rejected' | 'missed' | 'abandoned';
  timestamp: Date;
  callId: string;
  duration?: number;
  data?: any;
}

export interface CallFunnel {
  received: number;         // Appels reçus
  handled: number;          // Traités par Assistant
  qualified: number;        // Leads qualifiés
  rdvCreated: number;       // RDV pris

  rates: {
    handleRate: number;        // % prise en charge
    qualificationRate: number; // % qualification (parmi traités)
    conversionRate: number;    // % RDV (parmi qualifiés)
    overallConversion: number; // % RDV (parmi reçus)
  };
}

export interface CallPerformance {
  totalCalls: number;
  totalHandled: number;
  totalRdv: number;
  handleRate: number;
  conversionRate: number;
  avgCallDuration: number; // en secondes
  avgRdvCallDuration: number;

  callsByTimeSlot: Array<{
    hour: number;
    calls: number;
    handleRate: number;
    rdvRate: number;
  }>;

  callsByDay: Array<{
    day: string;
    calls: number;
    rdv: number;
  }>;
}

export interface OptimizationInsight {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'capacity' | 'script' | 'qualification' | 'performance';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  estimatedImprovement: number;
}

export interface AssistantAnalytics {
  funnel: CallFunnel;
  performance: CallPerformance;
  insights: OptimizationInsight[];
  score: number; // 0-100
}

// Calculer le funnel d'appels entrants
export function calculateCallFunnel(events: CallEvent[]): CallFunnel {
  const received = events.filter(e => e.type === 'received').length;
  const handled = events.filter(e => e.type === 'handled').length;
  const qualified = events.filter(e => e.type === 'qualified').length;
  const rdvCreated = events.filter(e => e.type === 'rdv_created').length;

  return {
    received,
    handled,
    qualified,
    rdvCreated,
    rates: {
      handleRate: received > 0 ? (handled / received) * 100 : 0,
      qualificationRate: handled > 0 ? (qualified / handled) * 100 : 0,
      conversionRate: qualified > 0 ? (rdvCreated / qualified) * 100 : 0,
      overallConversion: received > 0 ? (rdvCreated / received) * 100 : 0
    }
  };
}

// Analyser les performances d'appels entrants
export function analyzeCallPerformance(
  events: CallEvent[],
  calls: any[]
): CallPerformance {
  const totalCalls = calls.length;
  const handledCalls = calls.filter(c => c.status === 'completed');
  const totalHandled = handledCalls.length;
  const totalRdv = calls.filter(c => c.appointment_created === 1).length;

  // Durées moyennes
  let totalDuration = 0;
  let rdvTotalDuration = 0;
  let rdvCount = 0;

  handledCalls.forEach(call => {
    totalDuration += call.duration_seconds || 0;
    if (call.appointment_created === 1) {
      rdvTotalDuration += call.duration_seconds || 0;
      rdvCount++;
    }
  });

  const avgCallDuration = totalHandled > 0 ? totalDuration / totalHandled : 0;
  const avgRdvCallDuration = rdvCount > 0 ? rdvTotalDuration / rdvCount : 0;

  // Analyse par créneaux horaires (quand reçoit-on le plus d'appels)
  const timeSlotStats: Record<number, { calls: number; handled: number; rdv: number }> = {};

  calls.forEach(call => {
    const date = new Date(call.created_at);
    const hour = date.getHours();

    if (!timeSlotStats[hour]) {
      timeSlotStats[hour] = { calls: 0, handled: 0, rdv: 0 };
    }

    timeSlotStats[hour].calls++;
    if (call.status === 'completed') timeSlotStats[hour].handled++;
    if (call.appointment_created === 1) timeSlotStats[hour].rdv++;
  });

  const callsByTimeSlot = Object.entries(timeSlotStats).map(([hour, stats]) => ({
    hour: parseInt(hour),
    calls: stats.calls,
    handleRate: stats.calls > 0 ? (stats.handled / stats.calls) * 100 : 0,
    rdvRate: stats.handled > 0 ? (stats.rdv / stats.handled) * 100 : 0
  })).sort((a, b) => a.hour - b.hour);

  // Analyse par jour de la semaine
  const dayStats: Record<string, { calls: number; rdv: number }> = {
    'Lundi': { calls: 0, rdv: 0 },
    'Mardi': { calls: 0, rdv: 0 },
    'Mercredi': { calls: 0, rdv: 0 },
    'Jeudi': { calls: 0, rdv: 0 },
    'Vendredi': { calls: 0, rdv: 0 },
    'Samedi': { calls: 0, rdv: 0 },
    'Dimanche': { calls: 0, rdv: 0 }
  };

  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  calls.forEach(call => {
    const date = new Date(call.created_at);
    const dayName = dayNames[date.getDay()];
    dayStats[dayName].calls++;
    if (call.appointment_created === 1) dayStats[dayName].rdv++;
  });

  const callsByDay = Object.entries(dayStats).map(([day, stats]) => ({
    day,
    calls: stats.calls,
    rdv: stats.rdv
  }));

  return {
    totalCalls,
    totalHandled,
    totalRdv,
    handleRate: totalCalls > 0 ? (totalHandled / totalCalls) * 100 : 0,
    conversionRate: totalHandled > 0 ? (totalRdv / totalHandled) * 100 : 0,
    avgCallDuration,
    avgRdvCallDuration,
    callsByTimeSlot,
    callsByDay
  };
}

// Générer des insights d'optimisation pour appels entrants
export function generateOptimizationInsights(
  funnel: CallFunnel,
  performance: CallPerformance
): OptimizationInsight[] {
  const insights: OptimizationInsight[] = [];

  // 1. Taux de prise en charge faible
  if (funnel.rates.handleRate < 85) {
    insights.push({
      id: 'low-handle-rate',
      priority: 'critical',
      category: 'capacity',
      title: 'Taux de prise en charge faible',
      description: `Seulement ${funnel.rates.handleRate.toFixed(1)}% des appels sont traités par Assistant. Des appels sont perdus.`,
      impact: 'Perte de leads et mauvaise expérience client',
      actionItems: [
        'Augmenter la capacité de Assistant (gestion simultanée)',
        'Vérifier la configuration technique (files d\'attente)',
        'Ajouter une messagerie vocale pour rappeler',
        'Analyser les heures de pic pour anticiper'
      ],
      estimatedImprovement: 50
    });
  } else if (funnel.rates.handleRate < 95) {
    insights.push({
      id: 'medium-handle-rate',
      priority: 'high',
      category: 'capacity',
      title: 'Quelques appels non traités',
      description: `${(100 - funnel.rates.handleRate).toFixed(1)}% d'appels ne sont pas pris en charge.`,
      impact: 'Opportunités manquées',
      actionItems: [
        'Optimiser les temps de réponse',
        'Vérifier les créneaux de forte affluence',
        'Mettre en place une file d\'attente'
      ],
      estimatedImprovement: 20
    });
  }

  // 2. Taux de qualification faible
  if (funnel.rates.qualificationRate < 50) {
    insights.push({
      id: 'low-qualification',
      priority: 'high',
      category: 'script',
      title: 'Faible taux de qualification',
      description: `${funnel.rates.qualificationRate.toFixed(1)}% des appels traités sont qualifiés. Beaucoup de temps perdu.`,
      impact: 'Assistant traite trop de prospects non qualifiés',
      actionItems: [
        'Améliorer le script de qualification',
        'Poser les questions de qualification plus tôt',
        'Mieux filtrer en amont (campagnes marketing)',
        'Revoir les critères de qualification'
      ],
      estimatedImprovement: 40
    });
  }

  // 3. Taux de conversion en RDV faible
  if (funnel.rates.conversionRate < 30) {
    insights.push({
      id: 'low-rdv-conversion',
      priority: 'critical',
      category: 'script',
      title: 'Faible conversion en RDV',
      description: `Seulement ${funnel.rates.conversionRate.toFixed(1)}% des leads qualifiés prennent RDV.`,
      impact: 'Perte majeure de prospects pourtant intéressés',
      actionItems: [
        'Renforcer la proposition de valeur dans le script',
        'Simplifier le processus de prise de RDV',
        'Former Assistant à gérer les objections',
        'Créer plus d\'urgence (disponibilités limitées)',
        'Proposer plusieurs créneaux immédiatement'
      ],
      estimatedImprovement: 80
    });
  } else if (funnel.rates.conversionRate < 50) {
    insights.push({
      id: 'medium-rdv-conversion',
      priority: 'high',
      category: 'script',
      title: 'Conversion RDV à optimiser',
      description: `${funnel.rates.conversionRate.toFixed(1)}% de conversion. Potentiel d'amélioration.`,
      impact: 'Gagner 20-30% de RDV supplémentaires',
      actionItems: [
        'A/B tester différentes approches',
        'Proposer plus de flexibilité horaire',
        'Rassurer sur la valeur de l\'entretien'
      ],
      estimatedImprovement: 35
    });
  }

  // 4. Volume d'appels faible
  if (performance.totalCalls < 50) {
    insights.push({
      id: 'low-volume',
      priority: 'medium',
      category: 'performance',
      title: 'Volume d\'appels faible',
      description: `${performance.totalCalls} appels seulement. Volume insuffisant pour générer des résultats.`,
      impact: 'Peu de RDV générés malgré une bonne performance',
      actionItems: [
        'Augmenter la visibilité du numéro (site, réseaux sociaux)',
        'Lancer des campagnes marketing (Google Ads, Facebook)',
        'Optimiser le référencement local',
        'Ajouter le numéro sur tous les supports de communication'
      ],
      estimatedImprovement: 100
    });
  }

  // 5. Durée d'appel trop courte
  if (performance.avgCallDuration < 120 && performance.conversionRate < 40) {
    insights.push({
      id: 'short-calls',
      priority: 'medium',
      category: 'script',
      title: 'Conversations trop courtes',
      description: `Durée moyenne de ${Math.round(performance.avgCallDuration)}s. Les appels réussis durent généralement 3-5 minutes.`,
      impact: 'Pas assez de temps pour créer la relation et convaincre',
      actionItems: [
        'Enrichir le script avec plus de découverte',
        'Poser des questions ouvertes',
        'Raconter des success stories',
        'Laisser plus de temps au prospect pour s\'exprimer',
        'Ne pas précipiter vers la prise de RDV'
      ],
      estimatedImprovement: 30
    });
  }

  // 6. Pics d'affluence identifiés
  const peakSlot = performance.callsByTimeSlot.reduce((max, slot) =>
    slot.calls > max.calls ? slot : max
  , { hour: 0, calls: 0, handleRate: 0, rdvRate: 0 });

  if (peakSlot.calls >= 10 && peakSlot.calls > performance.totalCalls * 0.2) {
    const isHandlingWell = peakSlot.handleRate >= 90;

    insights.push({
      id: 'peak-hours',
      priority: isHandlingWell ? 'low' : 'high',
      category: 'capacity',
      title: isHandlingWell ? 'Pic d\'affluence bien géré' : 'Pic d\'affluence problématique',
      description: `${peakSlot.hour}h-${peakSlot.hour + 1}h concentre ${((peakSlot.calls / performance.totalCalls) * 100).toFixed(0)}% des appels${!isHandlingWell ? ` avec seulement ${peakSlot.handleRate.toFixed(0)}% traités` : ''}.`,
      impact: isHandlingWell ? 'Bonne anticipation des heures de pointe' : 'Beaucoup d\'appels perdus sur ce créneau',
      actionItems: isHandlingWell ? [
        'Maintenir la capacité sur ce créneau',
        'Documenter les bonnes pratiques',
        'Surveiller l\'évolution du volume'
      ] : [
        'Augmenter la capacité de ${peakSlot.hour}h à ${peakSlot.hour + 2}h',
        'Prévoir une file d\'attente intelligente',
        'Envoyer un SMS automatique aux non-répondus',
        'Analyser si certains appels peuvent être décalés'
      ],
      estimatedImprovement: isHandlingWell ? 5 : 40
    });
  }

  // 7. Excellente performance
  if (funnel.rates.overallConversion >= 25) {
    insights.push({
      id: 'excellent-performance',
      priority: 'low',
      category: 'performance',
      title: 'Performance exceptionnelle !',
      description: `${funnel.rates.overallConversion.toFixed(1)}% de conversion globale. Assistant est excellente.`,
      impact: 'Maintenez et amplifiez cette performance',
      actionItems: [
        'Documenter ce qui fonctionne',
        'Augmenter le volume d\'appels entrants',
        'Partager les best practices',
        'Tester des optimisations incrémentales'
      ],
      estimatedImprovement: 10
    });
  }

  // Trier par priorité
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  return insights.sort((a, b) =>
    priorityWeight[b.priority] - priorityWeight[a.priority]
  );
}

// Calculer le score global de Assistant pour appels entrants
export function calculateAssistantScore(
  funnel: CallFunnel,
  performance: CallPerformance
): number {
  let score = 100;

  // Pénalités
  if (funnel.rates.handleRate < 85) score -= 30;
  else if (funnel.rates.handleRate < 95) score -= 10;

  if (funnel.rates.conversionRate < 30) score -= 25;
  else if (funnel.rates.conversionRate < 50) score -= 10;

  if (funnel.rates.qualificationRate < 50) score -= 15;

  if (performance.avgCallDuration < 90) score -= 10;

  // Bonus
  if (funnel.rates.overallConversion >= 25) score += 15;
  if (funnel.rates.handleRate >= 95) score += 10;
  if (funnel.rates.conversionRate >= 60) score += 10;

  return Math.max(0, Math.min(100, score));
}

// Fonction principale d'analyse
export function analyzeAssistant(data: {
  events: CallEvent[];
  calls: any[];
}): AssistantAnalytics {
  const { events, calls } = data;

  const funnel = calculateCallFunnel(events);
  const performance = analyzeCallPerformance(events, calls);
  const insights = generateOptimizationInsights(funnel, performance);
  const score = calculateAssistantScore(funnel, performance);

  return {
    funnel,
    performance,
    insights,
    score
  };
}

// Générer des événements de démo pour appels entrants
export function generateDemoCallEvents(callsCount: number): CallEvent[] {
  const events: CallEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < callsCount; i++) {
    const callId = `call-${i}`;
    const timestamp = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);

    // Appel reçu
    events.push({
      id: `event-${events.length}`,
      type: 'received',
      timestamp,
      callId
    });

    // 95% sont traités (Assistant répond bien)
    if (Math.random() < 0.95) {
      events.push({
        id: `event-${events.length}`,
        type: 'handled',
        timestamp: new Date(timestamp.getTime() + 2000),
        callId,
        duration: 120 + Math.random() * 180
      });

      // 60% des appels traités sont qualifiés
      if (Math.random() < 0.6) {
        events.push({
          id: `event-${events.length}`,
          type: 'qualified',
          timestamp: new Date(timestamp.getTime() + 60000),
          callId
        });

        // 50% des qualifiés prennent RDV
        if (Math.random() < 0.5) {
          events.push({
            id: `event-${events.length}`,
            type: 'rdv_created',
            timestamp: new Date(timestamp.getTime() + 120000),
            callId
          });
        }
      }
    } else {
      // 5% sont manqués
      events.push({
        id: `event-${events.length}`,
        type: 'missed',
        timestamp: new Date(timestamp.getTime() + 25000),
        callId
      });
    }
  }

  return events;
}

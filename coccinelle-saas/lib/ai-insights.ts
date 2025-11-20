// AI Insights Engine - Analyse intelligente des données Widget/Réservations
// Génère automatiquement des insights et recommandations pour optimiser les réservations

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  category: 'performance' | 'revenue' | 'quality' | 'efficiency' | 'prediction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action?: string;
  actionUrl?: string;
  metrics?: {
    current: number;
    previous?: number;
    change?: number;
    target?: number;
  };
  timestamp: string;
}

export interface AIAnalysis {
  insights: Insight[];
  score: number; // Score global de performance (0-100)
  trends: {
    calls: 'up' | 'down' | 'stable'; // Maintenu pour compatibilité, mais moins important
    appointments: 'up' | 'down' | 'stable';
    conversion: 'up' | 'down' | 'stable'; // Widget views → RDV
    revenue: 'up' | 'down' | 'stable';
  };
  predictions: {
    nextWeekAppointments: number;
    expectedRevenue: number;
    noShowRisk: number; // Pourcentage
  };
}

// Analyse les patterns de réservations via widget
function analyzeBookingPatterns(appointments: any[]): Insight[] {
  const insights: Insight[] = [];

  if (appointments.length === 0) {
    insights.push({
      id: 'no-bookings',
      type: 'warning',
      category: 'performance',
      title: 'Aucune réservation détectée',
      description: 'Votre widget n\'a pas encore reçu de réservations. Vérifiez qu\'il est bien intégré et visible.',
      impact: 'high',
      action: 'Vérifier intégration widget',
      actionUrl: '/dashboard/settings',
      timestamp: new Date().toISOString()
    });
    return insights;
  }

  const now = new Date();

  // Analyse du taux de réservations récentes (7 derniers jours)
  const last7DaysBookings = appointments.filter(a => {
    const date = new Date(a.created_at);
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  const bookingRate = last7DaysBookings.length;

  if (bookingRate < 2) {
    insights.push({
      id: 'low-booking-rate',
      type: 'warning',
      category: 'performance',
      title: 'Faible taux de réservations',
      description: `Seulement ${bookingRate} réservation(s) cette semaine. Augmentez la visibilité de votre widget.`,
      impact: 'high',
      action: 'Optimiser visibilité widget',
      actionUrl: '/dashboard/settings',
      metrics: {
        current: bookingRate,
        target: 10
      },
      timestamp: new Date().toISOString()
    });
  } else if (bookingRate > 15) {
    insights.push({
      id: 'excellent-booking-rate',
      type: 'success',
      category: 'performance',
      title: '🚀 Excellent taux de réservations',
      description: `${bookingRate} réservations cette semaine ! Votre widget performe très bien.`,
      impact: 'high',
      metrics: {
        current: bookingRate
      },
      timestamp: new Date().toISOString()
    });
  }

  // Détection de pics de réservations (24h)
  const last24hBookings = appointments.filter(a => {
    const date = new Date(a.created_at);
    const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });

  if (last24hBookings.length > 5) {
    insights.push({
      id: 'booking-spike',
      type: 'success',
      category: 'performance',
      title: '📈 Pic de réservations détecté',
      description: `${last24hBookings.length} réservations dans les dernières 24h. Préparez votre équipe !`,
      impact: 'medium',
      metrics: {
        current: last24hBookings.length
      },
      timestamp: new Date().toISOString()
    });
  }

  return insights;
}

// Analyse les RDV et détecte les patterns
function analyzeAppointments(appointments: any[]): Insight[] {
  const insights: Insight[] = [];

  if (appointments.length === 0) return insights;

  // Taux de no-show
  const noShows = appointments.filter(a => a.status === 'no_show');
  const noShowRate = (noShows.length / appointments.length) * 100;

  if (noShowRate > 20) {
    insights.push({
      id: 'high-noshow',
      type: 'warning',
      category: 'efficiency',
      title: 'Taux d\'absence élevé',
      description: `${noShowRate.toFixed(1)}% de no-shows. Activez les rappels SMS automatiques.`,
      impact: 'high',
      action: 'Configurer rappels SMS',
      actionUrl: '/dashboard/settings',
      metrics: {
        current: noShowRate,
        target: 10
      },
      timestamp: new Date().toISOString()
    });
  } else if (noShowRate < 5) {
    insights.push({
      id: 'excellent-attendance',
      type: 'success',
      category: 'efficiency',
      title: '✨ Excellent taux de présence',
      description: `Seulement ${noShowRate.toFixed(1)}% de no-shows ! Continuez comme ça.`,
      impact: 'low',
      metrics: {
        current: noShowRate
      },
      timestamp: new Date().toISOString()
    });
  }

  // Analyse des annulations
  const cancelled = appointments.filter(a => a.status === 'cancelled');
  const cancelRate = (cancelled.length / appointments.length) * 100;

  if (cancelRate > 15) {
    insights.push({
      id: 'high-cancellation',
      type: 'warning',
      category: 'efficiency',
      title: 'Taux d\'annulation important',
      description: `${cancelRate.toFixed(1)}% de RDV annulés. Analysez les raisons avec vos clients.`,
      impact: 'medium',
      metrics: {
        current: cancelRate,
        target: 10
      },
      timestamp: new Date().toISOString()
    });
  }

  // Prédiction des créneaux optimaux
  const appointmentsByDay = appointments.reduce((acc: any, a) => {
    const day = new Date(a.scheduled_at).getDay();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const bestDay = Object.entries(appointmentsByDay).sort((a: any, b: any) => b[1] - a[1])[0];
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  if (bestDay) {
    insights.push({
      id: 'optimal-day',
      type: 'info',
      category: 'efficiency',
      title: 'Jour optimal identifié',
      description: `${dayNames[parseInt(bestDay[0])]} est votre meilleur jour (${bestDay[1]} RDV). Concentrez vos efforts.`,
      impact: 'medium',
      timestamp: new Date().toISOString()
    });
  }

  return insights;
}

// Analyse des créneaux horaires populaires
function analyzeTimeSlots(appointments: any[]): Insight[] {
  const insights: Insight[] = [];

  if (appointments.length < 5) return insights;

  // Analyser les heures préférées
  const hourCounts: Record<number, number> = {};
  appointments.forEach(a => {
    const hour = new Date(a.scheduled_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (sortedHours.length > 0) {
    const topHour = sortedHours[0];
    insights.push({
      id: 'peak-hours',
      type: 'info',
      category: 'efficiency',
      title: 'Créneau optimal identifié',
      description: `${topHour[0]}h est votre créneau le plus populaire (${topHour[1]} RDV). Maximisez vos disponibilités.`,
      impact: 'medium',
      action: 'Ajuster disponibilités',
      actionUrl: '/dashboard/settings',
      timestamp: new Date().toISOString()
    });
  }

  return insights;
}

// Analyse du revenue potentiel
function analyzeRevenuePotential(appointments: any[]): Insight[] {
  const insights: Insight[] = [];

  if (appointments.length === 0) return insights;

  const now = new Date();
  const upcomingAppts = appointments.filter(a => new Date(a.scheduled_at) > now && a.status === 'scheduled');
  const completedAppts = appointments.filter(a => a.status === 'completed');

  // Estimation revenue (moyenne $50 par RDV)
  const avgRevenuePerAppt = 50;
  const potentialRevenue = upcomingAppts.length * avgRevenuePerAppt;
  const realizedRevenue = completedAppts.length * avgRevenuePerAppt;

  if (potentialRevenue > 500) {
    insights.push({
      id: 'high-revenue-potential',
      type: 'success',
      category: 'revenue',
      title: '💰 Fort potentiel de revenue',
      description: `${upcomingAppts.length} RDV planifiés = $${potentialRevenue} de revenue potentiel. Minimisez les no-shows !`,
      impact: 'high',
      action: 'Activer rappels automatiques',
      actionUrl: '/dashboard/settings',
      metrics: {
        current: potentialRevenue
      },
      timestamp: new Date().toISOString()
    });
  }

  if (realizedRevenue > 1000) {
    insights.push({
      id: 'excellent-realized-revenue',
      type: 'success',
      category: 'revenue',
      title: '🎉 Excellent revenue réalisé',
      description: `$${realizedRevenue} générés via ${completedAppts.length} RDV complétés. Continuez !`,
      impact: 'medium',
      metrics: {
        current: realizedRevenue
      },
      timestamp: new Date().toISOString()
    });
  }

  return insights;
}

// Prédictions ML simplifiées (basées sur réservations widget)
function generatePredictions(calls: any[], appointments: any[]): AIAnalysis['predictions'] {
  const now = new Date();

  // Analyser les réservations des 7 derniers jours vs 7 jours précédents
  const last7DaysBookings = appointments.filter(a => {
    const date = new Date(a.created_at);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const previous7DaysBookings = appointments.filter(a => {
    const date = new Date(a.created_at);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7 && diffDays <= 14;
  });

  // Calcul du taux de croissance
  const growthRate = previous7DaysBookings.length > 0
    ? (last7DaysBookings.length - previous7DaysBookings.length) / previous7DaysBookings.length
    : 0.1; // 10% par défaut si pas d'historique

  // Prédiction pour la semaine prochaine
  const avgBookingsPerWeek = last7DaysBookings.length > 0 ? last7DaysBookings.length : 3;
  const nextWeekPrediction = Math.max(0, Math.round(avgBookingsPerWeek * (1 + growthRate)));

  // Calcul du risque de no-show (basé sur historique)
  const pastAppts = appointments.filter(a => {
    const apptDate = new Date(a.scheduled_at);
    return apptDate < now;
  });
  const noShowCount = pastAppts.filter(a => a.status === 'no_show').length;
  const noShowRisk = pastAppts.length > 0 ? (noShowCount / pastAppts.length) * 100 : 15; // 15% par défaut

  // Prédiction revenue (si prix moyen par RDV = $50)
  const avgRevenuePerAppt = 50;
  const expectedRevenue = nextWeekPrediction * avgRevenuePerAppt * (1 - noShowRisk / 100);

  return {
    nextWeekAppointments: Math.max(1, nextWeekPrediction),
    expectedRevenue: Math.round(expectedRevenue),
    noShowRisk: Math.min(100, Math.max(0, Math.round(noShowRisk)))
  };
}

// Fonction principale d'analyse (modèle widget/réservations)
export function analyzeData(data: {
  calls: any[];
  appointments: any[];
  documents?: any[];
}): AIAnalysis {
  const { calls, appointments } = data;

  // Collecte de tous les insights (focus widget/réservations)
  const allInsights = [
    ...analyzeBookingPatterns(appointments),
    ...analyzeAppointments(appointments),
    ...analyzeTimeSlots(appointments),
    ...analyzeRevenuePotential(appointments)
  ];

  // Tri par impact et type
  const sortedInsights = allInsights.sort((a, b) => {
    const impactWeight = { high: 3, medium: 2, low: 1 };
    const typeWeight = { critical: 4, warning: 3, info: 2, success: 1 };

    const scoreA = impactWeight[a.impact] + typeWeight[a.type];
    const scoreB = impactWeight[b.impact] + typeWeight[b.type];

    return scoreB - scoreA;
  });

  // Calcul du score global (0-100)
  const score = calculateOverallScore(calls, appointments);

  // Analyse des tendances
  const trends = analyzeTrends(calls, appointments);

  // Prédictions
  const predictions = generatePredictions(calls, appointments);

  return {
    insights: sortedInsights.slice(0, 10), // Top 10 insights
    score,
    trends,
    predictions
  };
}

// Calcul du score global de performance (modèle widget/réservations)
function calculateOverallScore(calls: any[], appointments: any[]): number {
  let score = 100;

  if (appointments.length === 0) return 50; // Score moyen si pas de données

  const now = new Date();

  // Taux de réservations hebdomadaire
  const last7DaysBookings = appointments.filter(a => {
    const date = new Date(a.created_at);
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  if (last7DaysBookings < 2) score -= 20;
  else if (last7DaysBookings < 5) score -= 10;
  else if (last7DaysBookings > 15) score += 10;

  // Taux de no-show
  const pastAppts = appointments.filter(a => new Date(a.scheduled_at) < now);
  const noShowRate = pastAppts.length > 0
    ? (pastAppts.filter(a => a.status === 'no_show').length / pastAppts.length) * 100
    : 0;

  if (noShowRate > 20) score -= 20;
  else if (noShowRate > 10) score -= 10;
  else if (noShowRate < 5) score += 15;

  // Taux de complétion
  const completionRate = pastAppts.length > 0
    ? (pastAppts.filter(a => a.status === 'completed').length / pastAppts.length) * 100
    : 0;

  if (completionRate > 80) score += 10;
  else if (completionRate < 50) score -= 15;

  // Taux d'annulation
  const cancelRate = appointments.length > 0
    ? (appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100
    : 0;

  if (cancelRate > 15) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// Analyse des tendances (focus réservations widget)
function analyzeTrends(calls: any[], appointments: any[]): AIAnalysis['trends'] {
  const now = new Date();

  // Derniers 7 jours vs 7 jours précédents pour les réservations
  const getLast7Days = (items: any[]) => items.filter(i => {
    const date = new Date(i.created_at);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;

  const getPrevious7Days = (items: any[]) => items.filter(i => {
    const date = new Date(i.created_at);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7 && diffDays <= 14;
  }).length;

  const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    if (previous === 0) return current > 0 ? 'up' : 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 15) return 'up';
    if (change < -15) return 'down';
    return 'stable';
  };

  const callsCurrent = getLast7Days(calls);
  const callsPrevious = getPrevious7Days(calls);

  const bookingsCurrent = getLast7Days(appointments);
  const bookingsPrevious = getPrevious7Days(appointments);

  // Trend basé sur croissance des réservations
  const bookingGrowth = bookingsPrevious > 0
    ? ((bookingsCurrent - bookingsPrevious) / bookingsPrevious) * 100
    : 0;

  return {
    calls: getTrend(callsCurrent, callsPrevious), // Maintenu pour compatibilité
    appointments: getTrend(bookingsCurrent, bookingsPrevious),
    conversion: bookingGrowth > 10 ? 'up' : bookingGrowth < -10 ? 'down' : 'stable',
    revenue: getTrend(bookingsCurrent * 50, bookingsPrevious * 50) // Revenue estimation
  };
}

// Export d'insights formatés pour affichage
export function formatInsightForDisplay(insight: Insight): string {
  const emoji = {
    critical: '🔴',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  };

  return `${emoji[insight.type]} ${insight.title}: ${insight.description}`;
}

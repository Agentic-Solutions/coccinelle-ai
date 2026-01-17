'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  X,
  Bell,
  Clock,
  Target,
  Zap
} from 'lucide-react';

export interface Alert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'trend';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface SmartAlertsProps {
  calls: any[];
  appointments: any[];
  documents?: any[];
}

export default function SmartAlerts({ calls, appointments, documents = [] }: SmartAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Génère les alertes intelligentes
    const generatedAlerts = generateSmartAlerts(calls, appointments, documents);
    setAlerts(generatedAlerts);
  }, [calls, appointments, documents]);

  const dismissAlert = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    // Persister dans localStorage
    const dismissedIds = Array.from(dismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify([...dismissedIds, id]));
  };

  // Filtrer les alertes non-dismissed
  const visibleAlerts = alerts.filter(alert => !dismissed.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDismiss={() => dismissAlert(alert.id)}
        />
      ))}
    </div>
  );
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const getAlertStyles = () => {
    switch (alert.type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          text: 'text-green-900',
          badge: 'bg-green-100 text-green-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          text: 'text-yellow-900',
          badge: 'bg-yellow-100 text-yellow-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          text: 'text-red-900',
          badge: 'bg-red-100 text-red-700'
        };
      case 'trend':
        return {
          bg: 'bg-purple-50 border-purple-200',
          icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
          text: 'text-purple-900',
          badge: 'bg-purple-100 text-purple-700'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <Info className="w-5 h-5 text-blue-600" />,
          text: 'text-blue-900',
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  const styles = getAlertStyles();
  const priorityLabel = {
    high: 'Urgent',
    medium: 'Moyen',
    low: 'Info'
  };

  return (
    <div className={`relative rounded-lg border ${styles.bg} p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {styles.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${styles.text}`}>{alert.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                {priorityLabel[alert.priority]}
              </span>
            </div>

            {alert.dismissible !== false && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className={`text-sm ${styles.text} mb-2`}>{alert.message}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatTimestamp(alert.timestamp)}
            </div>

            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className="text-sm font-medium text-gray-900 hover:text-gray-700 underline"
              >
                {alert.action.label} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Génération des alertes intelligentes (Modèle Widget/Réservation)
function generateSmartAlerts(calls: any[], appointments: any[], documents: any[] = []): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  // 0. ALERTE CRITIQUE: Knowledge Base vide
  if (documents.length === 0) {
    alerts.push({
      id: 'kb-empty',
      type: 'error',
      title: '⚠️ Knowledge Base vide - Assistant ne peut pas fonctionner',
      message: 'Sans documents, Assistant ne pourra pas répondre aux questions de vos clients. Configurez votre KB maintenant pour rendre Assistant opérationnelle.',
      timestamp: now,
      priority: 'high',
      action: {
        label: 'Configurer ma KB en 3 minutes',
        onClick: () => {
          window.location.href = '/dashboard/knowledge?tab=builder';
        }
      },
      dismissible: false // Ne peut pas être fermée
    });
  }

  // 0b. ALERTE: KB insuffisante (moins de 3 documents)
  if (documents.length > 0 && documents.length < 3) {
    alerts.push({
      id: 'kb-insufficient',
      type: 'warning',
      title: `Knowledge Base incomplète (${documents.length}/3 minimum)`,
      message: 'Pour que Assistant soit vraiment efficace, nous recommandons au moins 3 documents couvrant vos services, horaires et tarifs.',
      timestamp: now,
      priority: 'high',
      action: {
        label: 'Enrichir ma KB',
        onClick: () => {
          window.location.href = '/dashboard/knowledge?tab=builder';
        }
      }
    });
  }

  // 1. Alerte: RDV dans les prochaines heures
  const upcomingAppointments = appointments.filter(a => {
    const apptDate = new Date(a.scheduled_at);
    const hoursUntil = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil < 2 && a.status === 'scheduled';
  });

  if (upcomingAppointments.length > 0) {
    alerts.push({
      id: 'upcoming-rdv',
      type: 'info',
      title: `${upcomingAppointments.length} RDV dans les 2 prochaines heures`,
      message: `Préparez-vous ! ${upcomingAppointments.map(a => a.prospect_name).join(', ')}`,
      timestamp: now,
      priority: 'high',
      dismissible: false
    });
  }

  // 2. Détection de pic de réservations (via widget)
  const last24hAppts = appointments.filter(a => {
    const apptDate = new Date(a.created_at);
    const hoursDiff = (now.getTime() - apptDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });

  if (last24hAppts.length > 5) {
    alerts.push({
      id: 'high-bookings',
      type: 'success',
      title: 'Pic de réservations détecté !',
      message: `${last24hAppts.length} nouveaux RDV dans les dernières 24h. Votre widget fonctionne bien !`,
      timestamp: now,
      priority: 'medium'
    });
  }

  // 3. Alerte: Peu de réservations cette semaine
  const last7DaysAppts = appointments.filter(a => {
    const apptDate = new Date(a.created_at);
    const daysDiff = (now.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  if (last7DaysAppts.length < 3 && appointments.length > 0) {
    alerts.push({
      id: 'low-bookings',
      type: 'warning',
      title: 'Peu de réservations cette semaine',
      message: `Seulement ${last7DaysAppts.length} RDV créés. Vérifiez la visibilité de votre widget ou lancez une campagne.`,
      timestamp: now,
      priority: 'high',
      action: {
        label: 'Voir le widget',
        onClick: () => {
          window.location.href = '/book/tenant_demo_001';
        }
      }
    });
  }

  // 4. Alerte objectif atteint
  if (appointments.length >= 10) {
    alerts.push({
      id: 'goal-reached',
      type: 'success',
      title: '🎯 Objectif atteint !',
      message: `Félicitations ! Vous avez créé ${appointments.length} rendez-vous. Continuez sur cette lancée !`,
      timestamp: now,
      priority: 'low'
    });
  }

  // 5. Rappel RDV non confirmés
  const unconfirmedAppts = appointments.filter(a =>
    a.status === 'scheduled' &&
    new Date(a.scheduled_at) > now
  );

  if (unconfirmedAppts.length > 5) {
    alerts.push({
      id: 'unconfirmed-appts',
      type: 'warning',
      title: `${unconfirmedAppts.length} RDV non confirmés`,
      message: 'Envoyez des rappels SMS pour confirmer les rendez-vous et réduire les no-shows.',
      timestamp: now,
      priority: 'medium',
      action: {
        label: 'Activer rappels auto',
        onClick: () => {
          window.location.href = '/dashboard/settings';
        }
      }
    });
  }

  // 6. Tendance réservations (croissance ou décroissance)
  const previous7DaysAppts = appointments.filter(a => {
    const apptDate = new Date(a.created_at);
    const daysDiff = (now.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 7 && daysDiff <= 14;
  });

  const growthRate = previous7DaysAppts.length > 0
    ? ((last7DaysAppts.length - previous7DaysAppts.length) / previous7DaysAppts.length) * 100
    : 0;

  if (growthRate > 50 && last7DaysAppts.length > 0) {
    alerts.push({
      id: 'growth-trend',
      type: 'success',
      title: '📈 Croissance exceptionnelle !',
      message: `+${growthRate.toFixed(0)}% de réservations cette semaine vs la semaine dernière !`,
      timestamp: now,
      priority: 'low'
    });
  } else if (growthRate < -30 && previous7DaysAppts.length > 0) {
    alerts.push({
      id: 'decline-trend',
      type: 'error',
      title: '📉 Baisse de réservations détectée',
      message: `${Math.abs(growthRate).toFixed(0)}% de RDV en moins. Vérifiez la visibilité de votre widget.`,
      timestamp: now,
      priority: 'high',
      action: {
        label: 'Analyser les données',
        onClick: () => {
          window.location.href = '/dashboard/analytics';
        }
      }
    });
  }

  // 7. Alerte créneaux populaires complets
  const upcomingAppts = appointments.filter(a => new Date(a.scheduled_at) > now);
  const nextWeekAppts = upcomingAppts.filter(a => {
    const apptDate = new Date(a.scheduled_at);
    const daysUntil = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 7;
  });

  if (nextWeekAppts.length > 10) {
    alerts.push({
      id: 'busy-week',
      type: 'trend',
      title: '📅 Semaine prochaine bien remplie',
      message: `${nextWeekAppts.length} RDV planifiés. Assurez-vous d'avoir assez de disponibilités.`,
      timestamp: now,
      priority: 'medium',
      action: {
        label: 'Voir le calendrier',
        onClick: () => {
          window.location.href = '/dashboard/rdv';
        }
      }
    });
  }

  // Trier par priorité
  return alerts.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

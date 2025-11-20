// Live Updates Engine - Système de notifications et mises à jour temps réel
// Polling intelligent et gestion des événements

export type NotificationType = 'new_booking' | 'appointment_confirmed' | 'appointment_cancelled' | 'milestone' | 'alert';

export interface LiveNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface LiveStats {
  totalAppointments: number;
  totalCalls: number;
  totalDocuments: number;
  recentBookings: number; // Dernières 24h
  pendingAppointments: number;
  lastUpdate: Date;
}

export interface PollingConfig {
  interval: number; // en ms
  enabled: boolean;
  onUpdate?: (stats: LiveStats) => void;
  onNotification?: (notification: LiveNotification) => void;
}

// État global des notifications
let globalNotifications: LiveNotification[] = [];
let lastKnownStats: LiveStats | null = null;

// Générer une notification de nouvelle réservation
export function createBookingNotification(booking: any): LiveNotification {
  return {
    id: `notif-${Date.now()}-${Math.random()}`,
    type: 'new_booking',
    title: '🎉 Nouvelle réservation !',
    message: `${booking.prospect_name || 'Un client'} a réservé un RDV pour le ${formatDate(booking.scheduled_at)}`,
    timestamp: new Date(),
    data: booking,
    read: false,
    priority: 'high'
  };
}

// Générer une notification de confirmation
export function createConfirmationNotification(appointment: any): LiveNotification {
  return {
    id: `notif-${Date.now()}-${Math.random()}`,
    type: 'appointment_confirmed',
    title: '✅ RDV confirmé',
    message: `${appointment.prospect_name} a confirmé son RDV`,
    timestamp: new Date(),
    data: appointment,
    read: false,
    priority: 'medium'
  };
}

// Générer une notification d'annulation
export function createCancellationNotification(appointment: any): LiveNotification {
  return {
    id: `notif-${Date.now()}-${Math.random()}`,
    type: 'appointment_cancelled',
    title: '⚠️ RDV annulé',
    message: `${appointment.prospect_name} a annulé son RDV`,
    timestamp: new Date(),
    data: appointment,
    read: false,
    priority: 'high'
  };
}

// Générer une notification de milestone
export function createMilestoneNotification(milestone: string, count: number): LiveNotification {
  const milestones: Record<string, string> = {
    '10_bookings': '🎯 10 réservations atteintes !',
    '50_bookings': '🚀 50 réservations ! Vous êtes en feu !',
    '100_bookings': '💯 100 réservations ! Incroyable performance !',
    'first_booking': '🎊 Première réservation reçue !'
  };

  return {
    id: `notif-${Date.now()}-${Math.random()}`,
    type: 'milestone',
    title: milestones[milestone] || '🎉 Milestone atteint !',
    message: `Vous avez maintenant ${count} réservations au total`,
    timestamp: new Date(),
    data: { milestone, count },
    read: false,
    priority: 'medium'
  };
}

// Comparer les stats et détecter les changements
export function detectChanges(oldStats: LiveStats, newStats: LiveStats): LiveNotification[] {
  const notifications: LiveNotification[] = [];

  // Nouvelle réservation détectée
  if (newStats.totalAppointments > oldStats.totalAppointments) {
    const diff = newStats.totalAppointments - oldStats.totalAppointments;

    // Créer une notification pour chaque nouvelle réservation
    for (let i = 0; i < diff; i++) {
      notifications.push({
        id: `notif-booking-${Date.now()}-${i}`,
        type: 'new_booking',
        title: '🎉 Nouvelle réservation !',
        message: `Un nouveau RDV vient d'être créé via votre widget`,
        timestamp: new Date(),
        data: { newTotal: newStats.totalAppointments },
        read: false,
        priority: 'high'
      });
    }

    // Vérifier les milestones
    if (oldStats.totalAppointments < 10 && newStats.totalAppointments >= 10) {
      notifications.push(createMilestoneNotification('10_bookings', newStats.totalAppointments));
    }
    if (oldStats.totalAppointments < 50 && newStats.totalAppointments >= 50) {
      notifications.push(createMilestoneNotification('50_bookings', newStats.totalAppointments));
    }
    if (oldStats.totalAppointments < 100 && newStats.totalAppointments >= 100) {
      notifications.push(createMilestoneNotification('100_bookings', newStats.totalAppointments));
    }
  }

  // Nouveau document ajouté
  if (newStats.totalDocuments > oldStats.totalDocuments) {
    notifications.push({
      id: `notif-doc-${Date.now()}`,
      type: 'alert',
      title: '📄 Nouveau document',
      message: `Un document a été ajouté à votre Knowledge Base`,
      timestamp: new Date(),
      data: { newTotal: newStats.totalDocuments },
      read: false,
      priority: 'low'
    });
  }

  // Pic de réservations récentes
  if (newStats.recentBookings >= 5 && oldStats.recentBookings < 5) {
    notifications.push({
      id: `notif-spike-${Date.now()}`,
      type: 'alert',
      title: '📈 Pic de réservations !',
      message: `${newStats.recentBookings} réservations dans les dernières 24h`,
      timestamp: new Date(),
      data: { count: newStats.recentBookings },
      read: false,
      priority: 'medium'
    });
  }

  return notifications;
}

// Simuler des mises à jour en mode démo
export function simulateLiveUpdate(currentStats: LiveStats): LiveStats {
  // 40% de chance d'avoir une nouvelle réservation (augmenté pour démo)
  const hasNewBooking = Math.random() < 0.4;

  // 20% de chance d'avoir un nouveau document (augmenté pour démo)
  const hasNewDocument = Math.random() < 0.2;

  return {
    ...currentStats,
    totalAppointments: hasNewBooking ? currentStats.totalAppointments + 1 : currentStats.totalAppointments,
    totalDocuments: hasNewDocument ? currentStats.totalDocuments + 1 : currentStats.totalDocuments,
    recentBookings: hasNewBooking ? currentStats.recentBookings + 1 : currentStats.recentBookings,
    lastUpdate: new Date()
  };
}

// Hook pour le polling intelligent
export class LiveUpdatesManager {
  private config: PollingConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private currentStats: LiveStats | null = null;

  constructor(config: PollingConfig) {
    this.config = config;
  }

  start(initialStats: LiveStats) {
    this.currentStats = initialStats;
    lastKnownStats = initialStats;

    if (!this.config.enabled) return;

    this.intervalId = setInterval(() => {
      this.poll();
    }, this.config.interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll() {
    if (!this.currentStats) return;

    try {
      // En mode démo, simuler des changements
      const newStats = simulateLiveUpdate(this.currentStats);

      // Détecter les changements
      const notifications = detectChanges(this.currentStats, newStats);

      // Mettre à jour l'état
      this.currentStats = newStats;
      lastKnownStats = newStats;

      // Notifier les callbacks
      if (this.config.onUpdate) {
        this.config.onUpdate(newStats);
      }

      // Envoyer les notifications
      if (notifications.length > 0 && this.config.onNotification) {
        notifications.forEach(notif => {
          globalNotifications.unshift(notif);
          if (this.config.onNotification) {
            this.config.onNotification(notif);
          }
        });

        // Limiter à 50 notifications max
        if (globalNotifications.length > 50) {
          globalNotifications = globalNotifications.slice(0, 50);
        }
      }
    } catch (error) {
      console.error('Erreur polling:', error);
    }
  }

  updateConfig(config: Partial<PollingConfig>) {
    this.config = { ...this.config, ...config };

    if (config.enabled !== undefined) {
      if (config.enabled && !this.intervalId && this.currentStats) {
        this.start(this.currentStats);
      } else if (!config.enabled && this.intervalId) {
        this.stop();
      }
    }
  }

  getCurrentStats(): LiveStats | null {
    return this.currentStats;
  }
}

// Récupérer toutes les notifications
export function getAllNotifications(): LiveNotification[] {
  return [...globalNotifications];
}

// Marquer une notification comme lue
export function markAsRead(notificationId: string) {
  const notif = globalNotifications.find(n => n.id === notificationId);
  if (notif) {
    notif.read = true;
  }
}

// Marquer toutes les notifications comme lues
export function markAllAsRead() {
  globalNotifications.forEach(n => n.read = true);
}

// Supprimer une notification
export function deleteNotification(notificationId: string) {
  globalNotifications = globalNotifications.filter(n => n.id !== notificationId);
}

// Supprimer toutes les notifications lues
export function clearReadNotifications() {
  globalNotifications = globalNotifications.filter(n => !n.read);
}

// Compter les notifications non lues
export function getUnreadCount(): number {
  return globalNotifications.filter(n => !n.read).length;
}

// Formater une date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Obtenir l'icône selon le type
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'new_booking':
      return '🎉';
    case 'appointment_confirmed':
      return '✅';
    case 'appointment_cancelled':
      return '⚠️';
    case 'milestone':
      return '🎯';
    case 'alert':
      return '📢';
    default:
      return '📬';
  }
}

// Obtenir la couleur selon le type
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'new_booking':
      return 'green';
    case 'appointment_confirmed':
      return 'blue';
    case 'appointment_cancelled':
      return 'red';
    case 'milestone':
      return 'purple';
    case 'alert':
      return 'yellow';
    default:
      return 'gray';
  }
}

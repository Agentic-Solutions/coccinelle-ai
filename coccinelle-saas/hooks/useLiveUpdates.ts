// Hook React pour le système de Live Updates
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  LiveUpdatesManager,
  LiveStats,
  LiveNotification,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications
} from '../lib/live-updates';

export interface UseLiveUpdatesOptions {
  enabled?: boolean;
  interval?: number; // en ms
  onNewNotification?: (notification: LiveNotification) => void;
}

export interface UseLiveUpdatesReturn {
  stats: LiveStats | null;
  notifications: LiveNotification[];
  unreadCount: number;
  isPolling: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearRead: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

export function useLiveUpdates(
  initialStats: LiveStats,
  options: UseLiveUpdatesOptions = {}
): UseLiveUpdatesReturn {
  const {
    enabled = true,
    interval = 10000, // 10 secondes par défaut
    onNewNotification
  } = options;

  const [stats, setStats] = useState<LiveStats | null>(initialStats);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const managerRef = useRef<LiveUpdatesManager | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);

  // Garder la référence à jour
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // Initialiser le manager
  useEffect(() => {
    const manager = new LiveUpdatesManager({
      interval,
      enabled,
      onUpdate: (newStats) => {
        setStats(newStats);
      },
      onNotification: (notification) => {
        setNotifications(getAllNotifications());
        setUnreadCount(getUnreadCount());

        // Callback externe
        if (onNewNotificationRef.current) {
          onNewNotificationRef.current(notification);
        }
      }
    });

    managerRef.current = manager;

    if (enabled) {
      manager.start(initialStats);
      setIsPolling(true);
    }

    return () => {
      manager.stop();
    };
  }, []); // Seulement au mount

  // Mettre à jour la config si les options changent
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateConfig({ enabled, interval });
      setIsPolling(enabled);
    }
  }, [enabled, interval]);

  // Handlers
  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
    setNotifications(getAllNotifications());
    setUnreadCount(getUnreadCount());
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
    setNotifications(getAllNotifications());
    setUnreadCount(0);
  }, []);

  const handleDeleteNotification = useCallback((id: string) => {
    deleteNotification(id);
    setNotifications(getAllNotifications());
    setUnreadCount(getUnreadCount());
  }, []);

  const handleClearRead = useCallback(() => {
    clearReadNotifications();
    setNotifications(getAllNotifications());
    setUnreadCount(getUnreadCount());
  }, []);

  const startPolling = useCallback(() => {
    if (managerRef.current && stats) {
      managerRef.current.updateConfig({ enabled: true });
      setIsPolling(true);
    }
  }, [stats]);

  const stopPolling = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.updateConfig({ enabled: false });
      setIsPolling(false);
    }
  }, []);

  return {
    stats,
    notifications,
    unreadCount,
    isPolling,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    clearRead: handleClearRead,
    startPolling,
    stopPolling
  };
}

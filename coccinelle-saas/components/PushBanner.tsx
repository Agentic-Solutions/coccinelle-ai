'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushBanner() {
  const { permission, isSubscribed, isSupported, subscribe, loading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem('push_banner_dismissed');
      setDismissed(!!wasDismissed);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push_banner_dismissed', 'true');
  };

  const handleEnable = async () => {
    await subscribe();
    handleDismiss();
  };

  // Don't show if not supported, already subscribed, denied, or dismissed
  if (!isSupported || isSubscribed || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <div className="mx-4 lg:mx-6 mb-4 bg-gray-900 text-white rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">
          Activez les notifications pour être prévenu des nouveaux appels, rendez-vous et messages.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="px-4 py-1.5 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
        >
          {loading ? '...' : 'Activer'}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-gray-800 rounded transition"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

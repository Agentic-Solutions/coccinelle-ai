'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, TrendingUp, Bell } from 'lucide-react';
import { LiveNotification, getNotificationColor } from '../../../lib/live-updates';

interface ToastNotificationProps {
  notification: LiveNotification;
  onClose: () => void;
  duration?: number; // ms avant auto-close (0 = pas d'auto-close)
}

export default function ToastNotification({
  notification,
  onClose,
  duration = 5000
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    setTimeout(() => setIsVisible(true), 10);

    // Auto-close après duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Durée de l'animation
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'new_booking':
        return <CheckCircle className="w-6 h-6" />;
      case 'appointment_confirmed':
        return <CheckCircle className="w-6 h-6" />;
      case 'appointment_cancelled':
        return <AlertCircle className="w-6 h-6" />;
      case 'milestone':
        return <TrendingUp className="w-6 h-6" />;
      case 'alert':
        return <Bell className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const getColorClasses = () => {
    const color = getNotificationColor(notification.type);

    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          text: 'text-green-900'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-900'
        };
      case 'red':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-900'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50 border-purple-200',
          icon: 'text-purple-600',
          text: 'text-purple-900'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-900'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          text: 'text-gray-900'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div
      className={`
        max-w-md w-full ${colors.bg} border rounded-lg shadow-lg p-4
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${colors.text} mb-1`}>
            {notification.title}
          </p>
          <p className={`text-sm ${colors.text} opacity-90`}>
            {notification.message}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar pour l'auto-close */}
      {duration > 0 && (
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-current opacity-40"
            style={{
              animation: `shrink ${duration}ms linear`
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Container pour gérer plusieurs toasts
interface ToastContainerProps {
  notifications: LiveNotification[];
  onClose: (id: string) => void;
}

export function ToastContainer({ notifications, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={() => onClose(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}

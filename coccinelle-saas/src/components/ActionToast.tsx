'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Toast } from '../hooks/useToast';

interface ActionToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ActionToastItem({ toast, onClose }: ActionToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50 border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      className={`max-w-sm w-full ${config.bg} border rounded-lg shadow-lg p-3 sm:p-4 transition-all duration-200 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
        <p className={`text-sm font-medium flex-1 ${config.textColor}`}>{toast.message}</p>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ActionToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ActionToastContainer({ toasts, onRemove }: ActionToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ActionToastItem
            key={toast.id}
            toast={toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

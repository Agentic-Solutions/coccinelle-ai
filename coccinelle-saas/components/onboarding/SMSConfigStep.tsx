'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface SMSConfigStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

export default function SMSConfigStep({ onNext, onBack, loading }: SMSConfigStepProps) {
  const [enableReminders, setEnableReminders] = useState(true);
  const [enableConfirmations, setEnableConfirmations] = useState(true);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-8 h-8 text-black" />
        <h2 className="text-2xl font-bold text-gray-900">Configuration SMS</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Configurez les SMS automatiques envoyés à vos clients.
      </p>

      <div className="space-y-4 mb-6">
        <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={enableConfirmations}
            onChange={(e) => setEnableConfirmations(e.target.checked)}
            className="w-5 h-5"
          />
          <div>
            <div className="font-medium">Confirmations de RDV</div>
            <div className="text-sm text-gray-500">Envoyer un SMS après chaque réservation</div>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={enableReminders}
            onChange={(e) => setEnableReminders(e.target.checked)}
            className="w-5 h-5"
          />
          <div>
            <div className="font-medium">Rappels automatiques</div>
            <div className="text-sm text-gray-500">Rappel 24h avant le rendez-vous</div>
          </div>
        </label>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-2 text-gray-600 hover:text-gray-900">
          Retour
        </button>
        <button
          onClick={() => onNext({ sms: { enableReminders, enableConfirmations } })}
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

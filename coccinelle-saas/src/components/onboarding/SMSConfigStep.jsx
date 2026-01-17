'use client';

import React, { useState } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';

export default function SMSConfigStep({ onNext, onBack, loading }) {
  const [skipConfig, setSkipConfig] = useState(true);

  const handleSubmit = () => {
    if (skipConfig) {
      onNext({
        sms: {
          configured: false,
          message: 'Configuration SMS à faire plus tard dans Paramètres > Canaux'
        }
      });
    } else {
      // Pour l'instant, on skip toujours
      onNext({
        sms: {
          configured: false
        }
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Configuration du canal SMS
      </h2>
      <p className="text-gray-600 mb-8">
        Envoyez des SMS personnalisés à vos clients.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Configuration disponible après l'onboarding
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              La configuration complète du SMS (numéro d'envoi, messages automatiques, etc.)
              sera disponible dans <strong>Paramètres &gt; Canaux &gt; SMS</strong>.
            </p>
            <p className="text-sm text-blue-800">
              Nous activons simplement ce canal pour que vous puissiez le configurer plus tard.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <div className="font-medium text-black">Canal SMS activé</div>
            <div className="text-sm text-gray-600">
              À configurer dans Paramètres &gt; Canaux
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Chargement...' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Phone } from 'lucide-react';

export default function VapiStep({ sessionId, onNext, onBack, loading }) {
  const [configuring, setConfiguring] = useState(false);
  const [configured, setConfigured] = useState(false);

  const handleConfigure = async () => {
    setConfiguring(true);
    
    // Simuler la configuration VAPI
    setTimeout(() => {
      setConfigured(true);
      setConfiguring(false);
    }, 2000);
  };

  const handleContinue = () => {
    onNext({ vapi_configured: configured });
  };

  const handleSkip = () => {
    onNext({ vapi_configured: false });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Configuration de l'assistant vocal
      </h2>
      <p className="text-gray-600 mb-8">
        Configurez Sara, votre assistante vocale IA qui répondra à vos clients 24/7.
      </p>

      {!configured ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Phone className="w-16 h-16 text-black mx-auto mb-4" />
          
          <h3 className="text-xl font-semibold text-black mb-4">
            Configuration automatique VAPI
          </h3>
          
          <p className="text-gray-600 mb-6">
            Nous allons configurer Sara avec :
          </p>
          
          <ul className="text-left max-w-md mx-auto space-y-2 mb-8">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700">Voix naturelle en français</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700">Numéro de téléphone dédié</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700">Scénarios de conversation personnalisés</span>
            </li>
          </ul>

          <button
            onClick={handleConfigure}
            disabled={configuring}
            className="px-8 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {configuring ? 'Configuration en cours...' : 'Configurer Sara automatiquement'}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-green-800 font-medium mb-2">
            ✓ Sara est configurée avec succès !
          </p>
          <p className="text-green-700 text-sm">
            Votre assistante vocale est prête à recevoir des appels.
          </p>
        </div>
      )}

      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        
        {!configured ? (
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
          >
            Passer cette étape →
          </button>
        ) : (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Chargement...' : 'Continuer →'}
          </button>
        )}
      </div>
    </div>
  );
}

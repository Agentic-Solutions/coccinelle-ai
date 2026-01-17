'use client';

import React, { useState } from 'react';
import { Phone, Info } from 'lucide-react';

const TWILIO_SHARED_NUMBER = '+33 9 39 03 57 61';

export default function PhoneConfigStepOnboarding({ onNext, onBack, loading, initialData }) {
  const [phoneConfig, setPhoneConfig] = useState({
    enabled: initialData?.enabled || false,
    clientPhoneNumber: initialData?.clientPhoneNumber || ''
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    // Validation du numéro si le canal est activé
    if (phoneConfig.enabled && !phoneConfig.clientPhoneNumber) {
      setError('Veuillez saisir votre numéro de téléphone professionnel.');
      return;
    }

    if (phoneConfig.enabled && phoneConfig.clientPhoneNumber) {
      const phoneRegex = /^\+?\d{10,15}$/;
      if (!phoneRegex.test(phoneConfig.clientPhoneNumber.replace(/\s/g, ''))) {
        setError('Format de numéro invalide. Utilisez le format international (+33...)');
        return;
      }
    }

    onNext(phoneConfig);
  };

  const handleSkip = () => {
    onNext({ enabled: false, clientPhoneNumber: '' });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Canal Téléphone (Voix)
      </h2>
      <p className="text-gray-600 mb-6">
        Configurez votre assistant vocal pour gérer les appels entrants.
      </p>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Comment ça marche ?</p>
            <p>
              Nous mettons à votre disposition un numéro Twilio mutualisé.
              Transférez vos appels depuis votre numéro professionnel vers ce numéro,
              et votre assistant vocal répondra automatiquement.
            </p>
          </div>
        </div>
      </div>

      {/* Activation du canal */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={phoneConfig.enabled}
            onChange={(e) => setPhoneConfig({ ...phoneConfig, enabled: e.target.checked })}
            className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
          />
          <span className="text-base font-medium text-black">
            Activer le canal téléphone
          </span>
        </label>
      </div>

      {phoneConfig.enabled && (
        <>
          {/* Numéro Twilio mutualisé */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro Twilio (à utiliser pour le transfert)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-md font-mono text-lg">
                {TWILIO_SHARED_NUMBER}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(TWILIO_SHARED_NUMBER);
                }}
                className="px-4 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Copier
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Copiez ce numéro et configurez le transfert d'appel depuis votre opérateur.
            </p>
          </div>

          {/* Numéro client */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre numéro professionnel *
            </label>
            <input
              type="tel"
              value={phoneConfig.clientPhoneNumber}
              onChange={(e) => setPhoneConfig({ ...phoneConfig, clientPhoneNumber: e.target.value })}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="text-sm text-gray-600 mt-2">
              Le numéro depuis lequel vous transférerez les appels.
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Info sur configuration ultérieure */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-700">
          💡 <strong>Vous pourrez configurer les détails plus tard :</strong> Vous pourrez affiner la configuration
          de votre assistant vocal (transfert d'appels, horaires, etc.) depuis les paramètres après l'onboarding.
        </p>
      </div>

      {/* Boutons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        {!phoneConfig.enabled && (
          <button
            onClick={handleSkip}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            disabled={loading}
          >
            Passer cette étape
          </button>
        )}
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

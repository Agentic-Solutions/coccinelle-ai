'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppConfigStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

export default function WhatsAppConfigStep({ onNext, onBack, loading }: WhatsAppConfigStepProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-8 h-8 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">Configuration WhatsApp</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Connectez votre compte WhatsApp Business pour permettre à Sara de communiquer via WhatsApp.
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          ⚠️ L'intégration WhatsApp Business nécessite une configuration avancée.
          Vous pourrez la configurer plus tard dans les paramètres.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-2">Prérequis :</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Compte Meta Business vérifié</li>
          <li>• Numéro WhatsApp Business</li>
          <li>• Access Token API</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-2 text-gray-600 hover:text-gray-900">
          Retour
        </button>
        <button
          onClick={() => onNext({ whatsapp: { configured: false } })}
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Passer pour l\'instant'}
        </button>
      </div>
    </div>
  );
}

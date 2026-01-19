'use client';

import React, { useState } from 'react';
import { Mail } from 'lucide-react';

interface EmailConfigStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

export default function EmailConfigStep({ onNext, onBack, loading }: EmailConfigStepProps) {
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-8 h-8 text-black" />
        <h2 className="text-2xl font-bold text-gray-900">Configuration Email</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Configurez l'expéditeur des emails automatiques.
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom de l'expéditeur
          </label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Mon Entreprise"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email de réponse (optionnel)
          </label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="contact@monentreprise.fr"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-2 text-gray-600 hover:text-gray-900">
          Retour
        </button>
        <button
          onClick={() => onNext({ email: { fromEmail, fromName } })}
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

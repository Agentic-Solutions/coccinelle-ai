'use client';

import React, { useState } from 'react';
import { Phone } from 'lucide-react';

interface PhoneConfigStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

export default function PhoneConfigStep({ onNext, onBack, loading }: PhoneConfigStepProps) {
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Phone className="w-8 h-8 text-black" />
        <h2 className="text-2xl font-bold text-gray-900">Configuration Téléphone</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Sara répondra aux appels sur ce numéro. Vous pouvez utiliser votre numéro existant ou obtenir un nouveau numéro.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Numéro de téléphone (optionnel)
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+33 6 12 34 56 78"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <p className="text-sm text-gray-500 mt-1">
          Laissez vide pour obtenir un nouveau numéro Coccinelle
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-green-800 text-sm">
          ✅ Numéro de test disponible : <strong>+33 9 39 03 57 60</strong>
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-2 text-gray-600 hover:text-gray-900">
          Retour
        </button>
        <button
          onClick={() => onNext({ phone: { number: phoneNumber || '+33939035760' } })}
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

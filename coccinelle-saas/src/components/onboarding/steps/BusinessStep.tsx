'use client';

import React, { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface BusinessStepProps {
  sessionId: string;
  sector: string;
  businessData: { company_name: string; phone: string };
  onBusinessChange: (data: { company_name: string; phone: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function BusinessStep({ sessionId, sector, businessData, onBusinessChange, onNext, onBack }: BusinessStepProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!businessData.company_name.trim()) {
      setError('Le nom de l\'entreprise est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        buildApiUrl(`/api/v1/onboarding/session/${sessionId}/business`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            company_name: businessData.company_name.trim(),
            industry: sector,
            phone: businessData.phone.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      onNext();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#D85A30] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Votre entreprise</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Ces informations nous permettent de personnaliser votre assistant
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l&apos;entreprise <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={businessData.company_name}
            onChange={e => onBusinessChange({ ...businessData, company_name: e.target.value })}
            placeholder="Ex: Mon Salon de Beaute"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telephone (optionnel)
          </label>
          <input
            type="tel"
            value={businessData.phone}
            onChange={e => onBusinessChange({ ...businessData, phone: e.target.value })}
            placeholder="Ex: +33 1 23 45 67 89"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !businessData.company_name.trim()}
          className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface SummaryStepProps {
  sessionId: string;
  sector: string;
  businessData: { company_name: string; phone: string };
  productsData: { count: number } | null;
  kbData: { method: string; documentsCount: number } | null;
  channelsData: string[];
  assistantData: { agent_name: string; voice: string; agent_type: string } | null;
  completedSteps: Set<number>;
  onBack: () => void;
  onComplete: () => void;
}

const SECTOR_LABELS: Record<string, string> = {
  beaute: 'Beaute',
  sante: 'Sante',
  immobilier: 'Immobilier',
  restauration: 'Restauration',
  fitness: 'Fitness',
  services: 'Services',
};

const CHANNEL_LABELS: Record<string, string> = {
  phone: 'Telephone',
  sms: 'SMS',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

export default function SummaryStep({
  sessionId,
  sector,
  businessData,
  productsData,
  kbData,
  channelsData,
  assistantData,
  completedSteps,
  onBack,
  onComplete,
}: SummaryStepProps) {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    setCompleting(true);
    setError('');

    try {
      if (sessionId) {
        const response = await fetch(
          buildApiUrl(`/api/v1/onboarding/session/${sessionId}/complete`),
          {
            method: 'POST',
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          // Log but don't block
          console.warn('Onboarding complete API returned error, proceeding locally');
        }
      }

      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    } catch {
      // Proceed even if API fails
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  };

  // Steps 0-5 map to the 7-step flow (step 6 = summary = current)
  const items = [
    {
      label: 'Secteur',
      value: SECTOR_LABELS[sector] || sector,
      completed: completedSteps.has(0),
    },
    {
      label: 'Entreprise',
      value: businessData.company_name,
      completed: completedSteps.has(1),
    },
    {
      label: 'Base de connaissances',
      value: kbData ? `${kbData.documentsCount} document${kbData.documentsCount > 1 ? 's' : ''}` : null,
      completed: completedSteps.has(2),
      skipped: !kbData,
    },
    {
      label: 'Produits et services',
      value: productsData ? `${productsData.count} produit${productsData.count > 1 ? 's' : ''}` : null,
      completed: completedSteps.has(3),
      skipped: !productsData,
    },
    {
      label: 'Canaux',
      value: channelsData.length > 0 ? channelsData.map(c => CHANNEL_LABELS[c] || c).join(', ') : null,
      completed: completedSteps.has(4),
      skipped: channelsData.length === 0,
    },
    {
      label: 'Assistant vocal',
      value: assistantData ? `${assistantData.agent_name} (${assistantData.voice === 'female' ? 'voix feminine' : 'voix masculine'})` : null,
      completed: completedSteps.has(5),
      skipped: !assistantData,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#0F6E56] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Recapitulatif</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Votre configuration est prete
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="max-w-lg mx-auto space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-4 rounded-lg border ${
              item.skipped ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
            }`}
          >
            {item.completed && !item.skipped ? (
              <div className="w-8 h-8 rounded-full bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-400">—</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${item.skipped ? 'text-gray-400' : 'text-gray-700'}`}>
                {item.label}
              </span>
              {item.value && !item.skipped && (
                <p className="text-sm text-gray-500 truncate">{item.value}</p>
              )}
              {item.skipped && (
                <p className="text-xs text-gray-400">Passe</p>
              )}
            </div>
          </div>
        ))}
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
          onClick={handleComplete}
          disabled={completing}
          className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {completing ? 'Finalisation...' : 'Acceder au tableau de bord'}
        </button>
      </div>
    </div>
  );
}

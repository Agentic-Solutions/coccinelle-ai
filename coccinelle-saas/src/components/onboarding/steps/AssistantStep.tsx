'use client';

import React, { useState, useEffect } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface AssistantStepProps {
  sessionId: string;
  assistantData: { agent_name: string; voice: string; agent_type: string } | null;
  onAssistantChange: (data: { agent_name: string; voice: string; agent_type: string } | null) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface AgentType {
  id: string;
  name: string;
  description: string;
}

export default function AssistantStep({ sessionId, assistantData, onAssistantChange, onNext, onBack, onSkip }: AssistantStepProps) {
  const [agentName, setAgentName] = useState(assistantData?.agent_name || 'Sara');
  const [voice, setVoice] = useState(assistantData?.voice || 'female');
  const [agentType, setAgentType] = useState(assistantData?.agent_type || '');
  const [agentTypes, setAgentTypes] = useState<AgentType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAgentTypes() {
      try {
        const response = await fetch(
          buildApiUrl('/api/v1/onboarding/agent-types'),
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          const types = data.agentTypes || data.agent_types || data || [];
          if (Array.isArray(types) && types.length > 0) {
            setAgentTypes(types);
            if (!agentType) setAgentType(types[0].id);
          }
        }
      } catch {
        // Fallback agent types
      }
    }
    fetchAgentTypes();

    // Always set fallback agent types
    setAgentTypes(prev => {
      if (prev.length > 0) return prev;
      const fallback = [
        { id: 'receptionist', name: 'Receptionniste', description: 'Gere les appels entrants et la prise de rendez-vous' },
        { id: 'sales', name: 'Commercial', description: 'Qualifie les prospects et propose vos services' },
        { id: 'support', name: 'Support client', description: 'Repond aux questions et resout les problemes' },
      ];
      if (!agentType) setAgentType(fallback[0].id);
      return fallback;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    setSaving(true);
    setError('');

    const finalData = {
      agent_name: agentName.trim() || 'Sara',
      voice,
      agent_type: agentType,
    };

    // Only call backend if we have a valid session ID
    if (sessionId) {
      try {
        const response = await fetch(
          buildApiUrl(`/api/v1/onboarding/session/${sessionId}/assistant`),
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(finalData),
          }
        );

        if (!response.ok) {
          // Log but don't block — save locally and proceed
          console.warn('Assistant config API returned error, saving locally');
        }
      } catch {
        // Network error — save locally and proceed
        console.warn('Assistant config API unreachable, saving locally');
      }
    }

    onAssistantChange(finalData);
    setSaving(false);
    onNext();
  };

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#D85A30] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Votre assistant vocal</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Personnalisez votre assistant IA
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Agent name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l&apos;assistant
          </label>
          <input
            type="text"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            placeholder="Sara"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none"
          />
        </div>

        {/* Voice toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Voix</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVoice('female')}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                voice === 'female'
                  ? 'bg-[#D85A30] text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Feminine
            </button>
            <button
              type="button"
              onClick={() => setVoice('male')}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                voice === 'male'
                  ? 'bg-[#D85A30] text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Masculine
            </button>
          </div>
        </div>

        {/* Agent type */}
        {agentTypes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d&apos;agent</label>
            <div className="space-y-2">
              {agentTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAgentType(type.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    agentType === type.id
                      ? 'border-[#D85A30] bg-orange-50'
                      : 'border-gray-200 hover:border-[#D85A30]'
                  }`}
                >
                  <span className={`font-medium ${agentType === type.id ? 'text-[#D85A30]' : 'text-gray-700'}`}>
                    {type.name}
                  </span>
                  <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Retour
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
          >
            Passer cette etape
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Configuration...' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}

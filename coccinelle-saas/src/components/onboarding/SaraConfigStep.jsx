'use client';

import React, { useState } from 'react';
import { Bot, Phone, User } from 'lucide-react';

const AGENT_TYPES = [
  {
    value: 'reception',
    label: 'Accueil téléphonique',
    description: 'Répond aux appels, oriente les clients',
    icon: Phone
  },
  {
    value: 'qualification',
    label: 'Qualification de leads',
    description: 'Qualifie les prospects et leurs besoins',
    icon: User
  },
  {
    value: 'appointment',
    label: 'Prise de rendez-vous',
    description: 'Gère et planifie les rendez-vous',
    icon: Bot
  },
  {
    value: 'support',
    label: 'Support client',
    description: 'Assistance et réponses aux questions',
    icon: Phone
  }
];

const VOICES = [
  { value: 'female', label: 'Féminine', description: 'Voix féminine naturelle' },
  { value: 'male', label: 'Masculine', description: 'Voix masculine naturelle' }
];

export default function SaraConfigStep({ sessionId, onNext, onBack, loading }) {
  const [agentType, setAgentType] = useState('');
  const [voice, setVoice] = useState('female');
  const [assistantName, setAssistantName] = useState('Sara');

  const handleSubmit = () => {
    if (!agentType) return;
    
    onNext({
      agent_type: agentType,
      voice: voice,
      assistant_name: assistantName
    });
  };

  const isFormValid = agentType !== '';

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Configuration de votre assistant vocal
      </h2>
      <p className="text-gray-600 mb-8">
        Choisissez le type d'assistant et sa voix.
      </p>

      <div className="space-y-8">
        {/* Type d'agent */}
        <div>
          <label className="block text-sm font-medium text-black mb-4">
            Type d'assistant *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AGENT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAgentType(type.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    agentType === type.value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-1 ${
                      agentType === type.value ? 'text-black' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-black mb-1">
                        {type.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {type.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voix */}
        <div>
          <label className="block text-sm font-medium text-black mb-4">
            Voix de l'assistant *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {VOICES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVoice(v.value)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  voice === v.value
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-black mb-1">
                  {v.label}
                </div>
                <div className="text-sm text-gray-600">
                  {v.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nom de l'assistant */}
        <div>
          <label htmlFor="assistantName" className="block text-sm font-medium text-black mb-2">
            Nom de l'assistant (optionnel)
          </label>
          <input
            id="assistantName"
            type="text"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            placeholder="Sara"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            Le nom utilisé pour présenter l'assistant aux clients
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Chargement...' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}

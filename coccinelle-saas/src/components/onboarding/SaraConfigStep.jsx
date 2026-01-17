'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Phone, User, Headphones, MessageCircle, Settings, Sparkles, Calendar, Package } from 'lucide-react';

// Mapping des IDs d'agent types vers des icônes
const ICON_MAP = {
  'real_estate_reception': Phone,
  'real_estate_callback': Phone,
  'appointment_booking': Bot,
  'phone_reception': Headphones,
  'customer_support': MessageCircle,
  'multi_purpose': Sparkles,
  'custom': Settings
};

const VOICES = [
  { value: 'female', label: 'Féminine', description: 'Voix féminine naturelle' },
  { value: 'male', label: 'Masculine', description: 'Voix masculine naturelle' }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function AssistantConfigStep({ sessionId, onNext, onBack, loading }) {
  const [agentTypes, setAgentTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [agentType, setAgentType] = useState('');
  const [voice, setVoice] = useState('female');
  const [assistantName, setAssistantName] = useState('Assistant');
  const [enableAppointments, setEnableAppointments] = useState(true);
  const [enableProducts, setEnableProducts] = useState(false);

  // Charger les types d'agents depuis l'API
  useEffect(() => {
    const fetchAgentTypes = async () => {
      try {
        setLoadingTypes(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/onboarding/agent-types`);
        const data = await response.json();

        if (data.success && data.agent_types) {
          // Transformer pour ajouter les icônes
          const typesWithIcons = data.agent_types.map(type => ({
            ...type,
            value: type.id,
            label: type.name,
            icon: ICON_MAP[type.id] || Bot
          }));
          setAgentTypes(typesWithIcons);
        }
      } catch (error) {
        console.error('Error fetching agent types:', error);
        // Fallback sur des types par défaut en cas d'erreur
        setAgentTypes([
          {
            id: 'real_estate_reception',
            value: 'real_estate_reception',
            label: 'Réception d\'appels immobiliers',
            description: 'Accueille les appels entrants, recherche des biens et prend des rendez-vous',
            icon: Phone
          },
          {
            id: 'appointment_booking',
            value: 'appointment_booking',
            label: 'Prise de rendez-vous générique',
            description: 'Prend des rendez-vous pour tout type de service',
            icon: Bot
          }
        ]);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchAgentTypes();
  }, []);

  const handleSubmit = () => {
    if (!agentType) return;

    // Sauvegarder temporairement dans sessionStorage pour l'onboarding
    sessionStorage.setItem('onboarding_assistant_config', JSON.stringify({
      agent_type: agentType,
      voice: voice,
      assistant_name: assistantName,
      enable_appointments: enableAppointments,
      enable_products: enableProducts
    }));

    onNext({
      agent_type: agentType,
      voice: voice,
      assistant_name: assistantName,
      enable_appointments: enableAppointments,
      enable_products: enableProducts
    });
  };

  const isFormValid = agentType !== '';

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Configuration de Assistant
      </h2>
      <p className="text-gray-600 mb-4">
        Choisissez le rôle principal de votre assistant IA et sa voix.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>À propos de Assistant:</strong> Assistant est votre assistante IA qui communiquera avec vos clients sur les canaux que vous avez activés.
        </p>
      </div>

      <div className="space-y-8">
        {/* Type d'agent */}
        <div>
          <label className="block text-sm font-medium text-black mb-4">
            Rôle principal de Assistant *
          </label>

          {loadingTypes ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              <span className="ml-3 text-gray-600">Chargement des types d'agents...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agentTypes.map((type) => {
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
          )}
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
            placeholder="Assistant"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            Le nom utilisé pour présenter l'assistant aux clients
          </p>
        </div>

        {/* Modules */}
        <div>
          <label className="block text-sm font-medium text-black mb-4">
            Modules à activer
          </label>
          <div className="space-y-3">
            {/* Module Rendez-vous */}
            <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAppointments}
                  onChange={(e) => setEnableAppointments(e.target.checked)}
                  className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-black" />
                    <span className="font-medium text-black">Prise de rendez-vous</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Permettre à l'assistant de prendre des rendez-vous avec vos clients
                  </p>
                </div>
              </label>
            </div>

            {/* Module Produits */}
            <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableProducts}
                  onChange={(e) => setEnableProducts(e.target.checked)}
                  className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-5 h-5 text-black" />
                    <span className="font-medium text-black">Catalogue produits</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Permettre à l'assistant de présenter et rechercher vos produits/biens
                  </p>
                </div>
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Vous pourrez configurer ces modules en détail après l'onboarding
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

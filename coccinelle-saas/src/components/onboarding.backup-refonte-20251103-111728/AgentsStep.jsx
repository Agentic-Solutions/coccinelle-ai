'use client';

import React, { useState } from 'react';
import { Users } from 'lucide-react';

export default function AgentsStep({ businessData, sessionId, onNext, onBack, loading }) {
  const [generating, setGenerating] = useState(false);
  const [agents, setAgents] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    
    // Simuler la génération d'agents
    setTimeout(() => {
      const generatedAgents = [
        {
          name: 'Sophie Dubois',
          email: 'sophie.dubois@' + (businessData?.companyName || 'entreprise').toLowerCase().replace(/\s+/g, '') + '.fr',
          availability: '9h-18h, Lun-Ven'
        },
        {
          name: 'Marc Lefebvre',
          email: 'marc.lefebvre@' + (businessData?.companyName || 'entreprise').toLowerCase().replace(/\s+/g, '') + '.fr',
          availability: '9h-18h, Lun-Ven'
        }
      ];
      
      setAgents(generatedAgents);
      setGenerating(false);
    }, 2000);
  };

  const handleContinue = () => {
    onNext({ agents: agents || [] });
  };

  const handleSkip = () => {
    onNext({ agents: [] });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Configuration de vos agents
      </h2>
      <p className="text-gray-600 mb-8">
        Créez automatiquement vos agents commerciaux avec des disponibilités par défaut.
      </p>

      {!agents ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Users className="w-16 h-16 text-black mx-auto mb-4" />
          
          <h3 className="text-xl font-semibold text-black mb-4">
            Génération automatique d'agents
          </h3>
          
          <p className="text-gray-600 mb-6">
            Nous allons créer pour vous 2 agents avec :
          </p>
          
          <ul className="text-left max-w-md mx-auto space-y-2 mb-8">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700">Noms et emails professionnels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700">Disponibilités 9h-18h, Lun-Ven</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700">Spécialités selon votre secteur</span>
            </li>
          </ul>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-8 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? 'Génération en cours...' : 'Générer automatiquement mes agents'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              ✓ {agents.length} agents créés avec succès !
            </p>
          </div>

          {agents.map((agent, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-black mb-2">{agent.name}</h4>
              <p className="text-sm text-gray-600">Email : {agent.email}</p>
              <p className="text-sm text-gray-600">Disponibilité : {agent.availability}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        
        {!agents ? (
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

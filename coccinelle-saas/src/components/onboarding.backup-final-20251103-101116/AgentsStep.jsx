'use client';

import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function AgentsStep({ sessionId, businessData, onNext, loading }) {
  const [agents, setAgents] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const autoGenerateAgents = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/onboarding/${sessionId}/agents/auto-generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setAgents(data.agents);
        setGenerated(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error generating agents:', err);
      alert('Erreur lors de la génération des agents');
    } finally {
      setGenerating(false);
    }
  };

  const handleNext = () => {
    onNext({ agents, auto_generated: generated });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Configuration de vos agents
      </h2>
      <p className="text-gray-600 mb-8">
        Créez automatiquement vos agents commerciaux avec des disponibilités par défaut.
      </p>

      {!generated ? (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">🤖✨</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Génération automatique d'agents
          </h3>
          <p className="text-gray-600 mb-6">
            Nous allons créer pour vous 2 agents avec :
          </p>
          <ul className="text-left max-w-md mx-auto mb-8 space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Noms et emails professionnels</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Disponibilités 9h-18h, Lun-Ven</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Spécialités selon votre secteur</span>
            </li>
          </ul>
          
          <button
            onClick={autoGenerateAgents}
            disabled={generating}
            className="px-8 py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg"
          >
            {generating ? (
              <>
                <span className="animate-spin inline-block mr-2">⚙️</span>
                Génération en cours...
              </>
            ) : (
              'Générer automatiquement mes agents'
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-white border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">
              ✅ {agents.length} agent(s) créé(s) avec succès !
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {agents.map((agent) => (
              <div key={agent.id} className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <p className="text-sm text-gray-600">{agent.email}</p>
                      </div>
                    </div>
                    <div className="ml-15">
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                        {agent.speciality}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full py-4 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Continuer →'}
          </button>
        </div>
      )}
    </div>
  );
}

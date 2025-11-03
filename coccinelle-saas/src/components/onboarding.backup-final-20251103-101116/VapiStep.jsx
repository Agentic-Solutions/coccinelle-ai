'use client';

import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function VapiStep({ sessionId, businessData, onNext, loading }) {
  const [configuring, setConfiguring] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [vapiData, setVapiData] = useState(null);

  const autoConfigureVapi = async () => {
    setConfiguring(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/onboarding/${sessionId}/vapi/auto-configure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setVapiData(data.vapi);
        setConfigured(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error configuring VAPI:', err);
      alert('Erreur lors de la configuration');
    } finally {
      setConfiguring(false);
    }
  };

  const handleNext = () => {
    onNext({ vapi: vapiData, auto_configured: configured });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Configuration de Sara (Assistant vocal)
      </h2>
      <p className="text-gray-600 mb-8">
        Votre assistant IA personnalisé qui répond à vos clients 24/7.
      </p>

      {!configured ? (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">🎙️✨</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Configuration automatique de Sara
          </h3>
          <p className="text-gray-600 mb-6">
            Nous allons configurer :
          </p>
          <ul className="text-left max-w-md mx-auto mb-8 space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Voix française professionnelle</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Prompt personnalisé selon votre secteur</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Numéro de téléphone ({businessData.phone})</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Connexion avec votre calendrier</span>
            </li>
          </ul>
          
          <button
            onClick={autoConfigureVapi}
            disabled={configuring}
            className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg"
          >
            {configuring ? (
              <>
                <span className="animate-spin inline-block mr-2">⚙️</span>
                Configuration en cours...
              </>
            ) : (
              'Configurer Sara automatiquement'
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-white border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">
              ✅ Sara est configurée et prête à répondre !
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">📞 Numéro de téléphone</h3>
            <p className="text-lg font-mono text-indigo-600">
              {vapiData?.phone_number || businessData.phone}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Les clients peuvent appeler ce numéro pour parler à Sara
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">💬 Message d'accueil</h3>
            <p className="text-gray-700 italic">
              "{vapiData?.first_message}"
            </p>
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

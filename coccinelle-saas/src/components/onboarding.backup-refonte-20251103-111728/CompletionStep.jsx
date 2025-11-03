'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CompletionStep({ businessData, agentsData, vapiData, kbData }) {
  const router = useRouter();

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-6 animate-bounce"></div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Félicitations !
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Votre plateforme Coccinelle.AI est prête à l'emploi !
      </p>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 mb-8 max-w-2xl mx-auto">
        <h3 className="font-bold text-gray-900 mb-6">Ce qui a été configuré :</h3>
        
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2"></div>
            <div className="font-semibold text-gray-900">Agents</div>
            <div className="text-sm text-gray-600">
              {agentsData?.agents?.length || 0} agents créés
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">🎙</div>
            <div className="font-semibold text-gray-900">Sara</div>
            <div className="text-sm text-gray-600">
              Assistant vocal actif
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2"></div>
            <div className="font-semibold text-gray-900">Knowledge Base</div>
            <div className="text-sm text-gray-600">
              {kbData?.kb?.documents_created || 0} documents
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">📞</div>
            <div className="font-semibold text-gray-900">Téléphonie</div>
            <div className="text-sm text-gray-600">
              {businessData?.phone}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 max-w-2xl mx-auto">
        <h3 className="font-bold text-gray-900 mb-4">🎯 Prochaines étapes :</h3>
        <ol className="text-left space-y-3">
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3">1.</span>
            <span>Testez Sara en appelant : <strong>{businessData?.phone}</strong></span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3">2.</span>
            <span>Explorez votre dashboard et personnalisez vos paramètres</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3">3.</span>
            <span>Ajoutez plus de contenu à votre base de connaissances</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3">4.</span>
            <span>Invitez vos agents à rejoindre la plateforme</span>
          </li>
        </ol>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="px-8 py-4 bg-black text-white text-lg font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        Accéder au Dashboard →
      </button>
      
      <p className="mt-6 text-sm text-gray-500">
        Besoin d'aide ? <a href="mailto:support@coccinelle.ai" className="text-indigo-600 hover:underline">Contactez le support</a>
      </p>
    </div>
  );
}

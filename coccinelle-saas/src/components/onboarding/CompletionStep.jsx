'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDemoMode } from '../../../lib/mockData';
import { getTenantStorageKey } from '../../../lib/config';

export default function CompletionStep({ kbData, saraConfig }) {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState('+33 9 39 03 57 61');

  // Charger documents et user data depuis localStorage
  useEffect(() => {
    if (isDemoMode()) {
      const docs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
      console.log('📚 Documents en localStorage:', docs.length);
    }

    // Charger le téléphone depuis user/tenant
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    const phone = user.phone || tenant.phone || '+33 9 39 03 57 61';
    setUserPhone(phone);
  }, []);

  // Récupérer le nombre de documents
  const documentsCount = kbData?.documents_generated ||
                         (isDemoMode() ? JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]').length : 0);

  return (
    <div className="text-center py-12">
      <h2 className="text-3xl font-bold text-black mb-2">
        Félicitations !
      </h2>
      <p className="text-gray-600 mb-8">
        Votre plateforme Coccinelle.AI est prête à l'emploi !
      </p>

      <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-8 max-w-2xl mx-auto">
        <h3 className="font-bold text-black mb-6">Ce qui a été configuré :</h3>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-black">Agents</div>
            <div className="text-sm text-gray-600">
              0 agents créés
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-black">Sara</div>
            <div className="text-sm text-gray-600">
              Assistant vocal actif
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-black">Knowledge Base</div>
            <div className="text-sm text-gray-600">
              {documentsCount} document{documentsCount > 1 ? 's' : ''}
              {kbData?.method === 'assistant' && documentsCount > 0 && (
                <span className="text-green-600 ml-1">✓</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-black">Téléphonie</div>
            <div className="text-sm text-gray-600">
              {userPhone}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 max-w-2xl mx-auto">
        <h3 className="font-bold text-black mb-4">Prochaines étapes :</h3>
        <ol className="text-left space-y-3">
          <li className="flex items-start">
            <span className="font-bold text-black mr-3">1.</span>
            <span className="text-gray-700">
              <strong className="text-black">Testez Sara</strong> en appelant : <strong>{userPhone}</strong>
            </span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-black mr-3">2.</span>
            <span className="text-gray-700">
              <strong className="text-black">Explorez votre dashboard</strong> et personnalisez vos paramètres
            </span>
          </li>
          {documentsCount > 0 && (
            <li className="flex items-start">
              <span className="font-bold text-black mr-3">3.</span>
              <span className="text-gray-700">
                <strong className="text-black">Enrichissez votre KB</strong> - Sara a généré {documentsCount} documents, ajoutez-en plus !
              </span>
            </li>
          )}
          {documentsCount === 0 && (
            <li className="flex items-start">
              <span className="font-bold text-black mr-3">3.</span>
              <span className="text-gray-700">
                <strong className="text-black">Configurez votre Knowledge Base</strong> pour que Sara puisse répondre aux questions
              </span>
            </li>
          )}
          <li className="flex items-start">
            <span className="font-bold text-black mr-3">4.</span>
            <span className="text-gray-700">
              <strong className="text-black">Invitez vos agents</strong> à rejoindre la plateforme
            </span>
          </li>
        </ol>
      </div>

      <button
        onClick={() => {
          localStorage.setItem('onboarding_completed', 'true');
          // Sauvegarder la méthode KB pour le welcome banner
          if (kbData?.method) {
            localStorage.setItem('kb_method', kbData.method);
          }
          router.push('/dashboard');
        }}
        className="px-8 py-4 bg-black text-white text-lg font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        Accéder au Dashboard →
      </button>

      <p className="mt-6 text-sm text-gray-500">
        Besoin d'aide ? <a href="mailto:support@coccinelle.ai" className="text-black hover:underline font-medium">Contactez le support</a>
      </p>
    </div>
  );
}

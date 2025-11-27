'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDemoMode } from '../../../lib/mockData';
import { getTenantStorageKey } from '../../../lib/config';

export default function CompletionStep({ kbData, saraConfig, onComplete, loading }) {
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

  // Mapper les noms de canaux
  const channelLabels = {
    phone: 'Téléphone (Voix)',
    sms: 'SMS',
    email: 'Email',
    whatsapp: 'WhatsApp'
  };

  // Mapper les rôles d'agent
  const agentTypeLabels = {
    reception: 'Accueil téléphonique',
    qualification: 'Qualification de leads',
    appointment: 'Prise de rendez-vous',
    support: 'Support client'
  };

  // Récupérer les canaux configurés depuis localStorage
  const [configuredChannels, setConfiguredChannels] = useState([]);

  useEffect(() => {
    const channels = JSON.parse(localStorage.getItem('onboarding_channels') || '[]');
    setConfiguredChannels(channels);
  }, []);

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

        <div className="space-y-4 text-left">
          {/* Canaux activés */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-black mb-2">Canaux de communication</div>
            <div className="text-sm text-gray-600">
              {configuredChannels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {configuredChannels.map(channelId => (
                    <span key={channelId} className="inline-flex items-center px-3 py-1 bg-black text-white rounded-full text-xs">
                      ✓ {channelLabels[channelId] || channelId}
                    </span>
                  ))}
                </div>
              ) : (
                <span>Aucun canal configuré</span>
              )}
            </div>
          </div>

          {/* Configuration Sara (si Phone est configuré) */}
          {saraConfig?.phone && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="font-semibold text-black mb-2">Configuration Sara (Téléphone)</div>
              <div className="text-sm space-y-1">
                <div className="text-gray-600">
                  <span className="font-medium text-black">Rôle:</span> {agentTypeLabels[saraConfig.phone.agent_type] || saraConfig.phone.agent_type}
                </div>
                <div className="text-gray-600">
                  <span className="font-medium text-black">Voix:</span> {saraConfig.phone.voice === 'female' ? 'Féminine' : 'Masculine'}
                </div>
                {saraConfig.phone.assistant_name && (
                  <div className="text-gray-600">
                    <span className="font-medium text-black">Nom:</span> {saraConfig.phone.assistant_name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Knowledge Base */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-semibold text-black mb-2">Base de connaissances</div>
            <div className="text-sm text-gray-600">
              {documentsCount > 0 ? (
                <>
                  {documentsCount} document{documentsCount > 1 ? 's' : ''}
                  {kbData?.method === 'assistant' && (
                    <span className="text-green-600 ml-1">✓</span>
                  )}
                  {kbData?.method === 'website' && (
                    <span className="text-xs text-gray-500 ml-2">(crawl website)</span>
                  )}
                  {kbData?.method === 'upload' && (
                    <span className="text-xs text-gray-500 ml-2">(fichiers uploadés)</span>
                  )}
                </>
              ) : (
                <span>À configurer plus tard</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {(configuredChannels.includes('sms') || configuredChannels.includes('email') || configuredChannels.includes('whatsapp')) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
          <p className="text-sm text-blue-900">
            💡 <strong>Rappel:</strong> Les canaux{' '}
            {[
              configuredChannels.includes('sms') && 'SMS',
              configuredChannels.includes('email') && 'Email',
              configuredChannels.includes('whatsapp') && 'WhatsApp'
            ].filter(Boolean).join(', ')}{' '}
            sont activés mais nécessitent une configuration détaillée dans <strong>Paramètres {'>'} Canaux</strong>.
          </p>
        </div>
      )}

      <div className="mb-8 max-w-2xl mx-auto">
        <h3 className="font-bold text-black mb-4">Prochaines étapes :</h3>
        <ul className="text-left space-y-3">
          {configuredChannels.includes('phone') && (
            <li className="flex items-start">
              <span className="text-black mr-3">•</span>
              <span className="text-gray-700">
                <strong className="text-black">Testez Sara au téléphone</strong> en appelant : <strong>{userPhone}</strong>
              </span>
            </li>
          )}

          <li className="flex items-start">
            <span className="text-black mr-3">•</span>
            <span className="text-gray-700">
              <strong className="text-black">Explorez votre dashboard</strong> et consultez vos analytics
            </span>
          </li>

          {(configuredChannels.includes('sms') || configuredChannels.includes('email') || configuredChannels.includes('whatsapp')) && (
            <li className="flex items-start">
              <span className="text-black mr-3">•</span>
              <span className="text-gray-700">
                <strong className="text-black">Finalisez la config des canaux</strong> (
                {[
                  configuredChannels.includes('sms') && 'SMS',
                  configuredChannels.includes('email') && 'Email',
                  configuredChannels.includes('whatsapp') && 'WhatsApp'
                ].filter(Boolean).join(', ')}
                ) dans Paramètres
              </span>
            </li>
          )}

          {documentsCount > 0 ? (
            <li className="flex items-start">
              <span className="text-black mr-3">•</span>
              <span className="text-gray-700">
                <strong className="text-black">Enrichissez votre KB</strong> - Sara a {documentsCount} documents, ajoutez-en plus !
              </span>
            </li>
          ) : (
            <li className="flex items-start">
              <span className="text-black mr-3">•</span>
              <span className="text-gray-700">
                <strong className="text-black">Configurez votre Knowledge Base</strong> pour que Sara puisse répondre aux questions
              </span>
            </li>
          )}
        </ul>
      </div>

      <button
        onClick={() => {
          localStorage.setItem('onboarding_completed', 'true');

          // Sauvegarder la méthode KB pour le welcome banner
          if (kbData?.method) {
            localStorage.setItem('kb_method', kbData.method);
          }

          // Initialiser les configurations des canaux au bon format
          if (configuredChannels.includes('phone')) {
            const phoneConfig = {
              enabled: true,
              configured: true // Phone est géré par l'admin, donc toujours configuré
            };
            localStorage.setItem('phone_client_config', JSON.stringify(phoneConfig));
          }

          if (configuredChannels.includes('sms')) {
            const smsConfig = {
              enabled: false, // Désactivé par défaut, à activer dans les settings
              configured: false, // Doit être configuré par l'admin
              templates: {
                rdvConfirmation: true,
                rdvRappel: true,
                promotions: false
              }
            };
            localStorage.setItem('sms_client_config', JSON.stringify(smsConfig));
          }

          if (configuredChannels.includes('email')) {
            const emailConfig = {
              enabled: false,
              configured: false, // Doit être configuré par le client (SMTP)
              smtp: {
                host: '',
                port: 587,
                secure: true,
                user: '',
                password: '',
                fromEmail: '',
                fromName: ''
              },
              templates: {
                rdvConfirmation: true,
                rdvRappel: true,
                newsletter: false,
                promotions: false
              }
            };
            localStorage.setItem('email_client_config', JSON.stringify(emailConfig));
          }

          if (configuredChannels.includes('whatsapp')) {
            const whatsappConfig = {
              enabled: false,
              configured: false, // Doit être configuré par le client (WhatsApp Business)
              connectionMethod: '',
              whatsappNumber: '',
              templates: {
                rdvConfirmation: true,
                rdvRappel: true,
                promotions: false,
                reponseAuto: true
              }
            };
            localStorage.setItem('whatsapp_client_config', JSON.stringify(whatsappConfig));
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

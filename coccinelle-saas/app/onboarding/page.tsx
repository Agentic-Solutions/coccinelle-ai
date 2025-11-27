'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/onboarding/ProgressBar';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import ChannelSelectionStep from '@/components/onboarding/ChannelSelectionStep';
import PhoneConfigStep from '@/components/onboarding/PhoneConfigStep';
import SMSConfigStep from '@/components/onboarding/SMSConfigStep';
import EmailConfigStep from '@/components/onboarding/EmailConfigStep';
import WhatsAppConfigStep from '@/components/onboarding/WhatsAppConfigStep';
import KnowledgeBaseStep from '@/components/onboarding/KnowledgeBaseStep';
import CompletionStep from '@/components/onboarding/CompletionStep';

export default function Onboarding() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Données de configuration
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [channelConfigs, setChannelConfigs] = useState({});
  const [kbData, setKbData] = useState(null);

  // Construire dynamiquement la liste des étapes
  const steps = useMemo(() => {
    const baseSteps = [
      { id: 'welcome', label: 'Bienvenue' },
      { id: 'channel-selection', label: 'Canaux' }
    ];

    // Ajouter les étapes de configuration par canal sélectionné
    const channelSteps = selectedChannels.map(channelId => ({
      id: `config-${channelId}`,
      label: `Config ${channelId}`,
      channelId
    }));

    const endSteps = [
      { id: 'knowledge-base', label: 'Base de connaissances' },
      { id: 'completion', label: 'Terminé' }
    ];

    return [...baseSteps, ...channelSteps, ...endSteps];
  }, [selectedChannels]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  const handleNext = async (stepData) => {
    try {
      setLoading(true);
      setError(null);

      // Sauvegarder les données selon l'étape actuelle
      if (currentStep.id === 'channel-selection') {
        setSelectedChannels(stepData.selectedChannels);
      } else if (currentStep.id.startsWith('config-')) {
        // Fusionner la config du canal avec les configs existantes
        setChannelConfigs(prev => ({ ...prev, ...stepData }));
      } else if (currentStep.id === 'knowledge-base') {
        setKbData(stepData);
      }

      // Passer à l'étape suivante
      setCurrentStepIndex(currentStepIndex + 1);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error('Error saving step:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = async () => {
    // Sauvegarder toute la configuration dans localStorage
    try {
      localStorage.setItem('onboarding_channels', JSON.stringify(selectedChannels));
      localStorage.setItem('onboarding_channel_configs', JSON.stringify(channelConfigs));
      localStorage.setItem('onboarding_kb', JSON.stringify(kbData));
      localStorage.setItem('onboarding_completed', 'true');
    } catch (e) {
      console.error('Error saving onboarding data:', e);
    }

    router.push('/dashboard');
  };

  // Render le composant correspondant à l'étape actuelle
  const renderStep = () => {
    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep onNext={() => setCurrentStepIndex(1)} />;

      case 'channel-selection':
        return (
          <ChannelSelectionStep
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 'config-phone':
        return (
          <PhoneConfigStep
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 'config-sms':
        return (
          <SMSConfigStep
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 'config-email':
        return (
          <EmailConfigStep
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 'config-whatsapp':
        return (
          <WhatsAppConfigStep
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 'knowledge-base':
        return (
          <KnowledgeBaseStep
            sessionId={null}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 'completion':
        return (
          <CompletionStep
            kbData={kbData}
            saraConfig={channelConfigs}
            onComplete={handleComplete}
            loading={loading}
          />
        );

      default:
        return <div>Étape inconnue</div>;
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ProgressBar currentStep={currentStepIndex + 1} totalSteps={totalSteps} />

        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {renderStep()}
        </div>
      </div>
    </div>
  );
}

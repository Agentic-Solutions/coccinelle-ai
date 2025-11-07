'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/onboarding/ProgressBar';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import BusinessInfoStep from '@/components/onboarding/BusinessInfoStep';
import SaraConfigStep from '@/components/onboarding/SaraConfigStep';
import KnowledgeBaseStep from '@/components/onboarding/KnowledgeBaseStep';
import CompletionStep from '@/components/onboarding/CompletionStep';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [businessData, setBusinessData] = useState(null);
  const [saraConfig, setSaraConfig] = useState(null);
  const [kbData, setKbData] = useState(null);

  const handleNext = async (stepData) => {
    try {
      setLoading(true);

      if (currentStep === 2) setBusinessData(stepData);
      if (currentStep === 3) setSaraConfig(stepData);
      if (currentStep === 4) setKbData(stepData);

      setCurrentStep(currentStep + 1);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error('Error saving step:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ProgressBar currentStep={currentStep} totalSteps={5} />

        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <WelcomeStep onNext={() => setCurrentStep(2)} />
          )}

          {currentStep === 2 && (
            <BusinessInfoStep
              onNext={handleNext}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {currentStep === 3 && (
            <SaraConfigStep
              sessionId={sessionId}
              onNext={handleNext}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {currentStep === 4 && (
            <KnowledgeBaseStep
              sessionId={sessionId}
              onNext={handleNext}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {currentStep === 5 && (
            <CompletionStep
              onComplete={handleComplete}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

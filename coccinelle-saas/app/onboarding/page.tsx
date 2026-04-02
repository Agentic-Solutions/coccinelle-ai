'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import StepperProgress from '@/components/onboarding/StepperProgress';
import SectorStep from '@/components/onboarding/steps/SectorStep';
import BusinessStep from '@/components/onboarding/steps/BusinessStep';
import PhoneVerificationStep from '@/components/onboarding/steps/PhoneVerificationStep';
import KnowledgeStep from '@/components/onboarding/steps/KnowledgeStep';
import ProductsStep from '@/components/onboarding/steps/ProductsStep';
import ChannelsStep from '@/components/onboarding/steps/ChannelsStep';
import AssistantStep from '@/components/onboarding/steps/AssistantStep';
import SummaryStep from '@/components/onboarding/steps/SummaryStep';

const TOTAL_STEPS = 8; // 0-7

interface OnboardingState {
  sessionId: string | null;
  currentStep: number;
  loading: boolean;
  sector: string;
  businessData: { company_name: string; phone: string };
  productsData: { count: number } | null;
  kbData: { method: string; documentsCount: number } | null;
  channelsData: string[];
  assistantData: { agent_name: string; voice: string; agent_type: string } | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({
    sessionId: null,
    currentStep: 0,
    loading: true,
    sector: '',
    businessData: { company_name: '', phone: '' },
    productsData: null,
    kbData: null,
    channelsData: ['phone'],
    assistantData: null,
  });
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  // Initialiser depuis l'API — JAMAIS localStorage pour les données utilisateur
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        // Vérifier état onboarding via API
        const stateRes = await fetch(buildApiUrl('/api/v1/onboarding/state'), {
          headers: getAuthHeaders(),
        });

        if (stateRes.ok) {
          const stateData = await stateRes.json();

          // Déjà terminé → dashboard
          if (stateData.tenant?.onboarding_completed === 1) {
            router.replace('/dashboard');
            return;
          }

          // Pré-remplir depuis la DB
          const resumeStep = stateData.session?.current_step || 0;
          setState(prev => ({
            ...prev,
            currentStep: Math.min(resumeStep, TOTAL_STEPS - 1),
            sector: stateData.tenant?.sector || '',
            businessData: {
              company_name: stateData.tenant?.name || '',
              phone: stateData.tenant?.phone || '',
            },
            loading: false,
          }));
        } else {
          // Fallback: vérifier via /me
          const meRes = await fetch(buildApiUrl('/api/v1/auth/me'), {
            headers: getAuthHeaders(),
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.tenant?.onboarding_completed === 1) {
              router.replace('/dashboard');
              return;
            }
            setState(prev => ({
              ...prev,
              sector: meData.tenant?.sector || '',
              businessData: {
                company_name: meData.tenant?.name || '',
                phone: meData.tenant?.phone || '',
              },
              loading: false,
            }));
          } else {
            setState(prev => ({ ...prev, loading: false }));
          }
        }

        // Créer ou récupérer session
        const existingSessionId = localStorage.getItem('onboarding_session_id');
        if (existingSessionId) {
          setState(prev => ({ ...prev, sessionId: existingSessionId }));
        } else {
          const startRes = await fetch(buildApiUrl('/api/v1/onboarding/start'), {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          if (startRes.ok) {
            const startData = await startRes.json();
            const newId = startData.session_id || startData.sessionId || startData.id;
            if (newId) {
              localStorage.setItem('onboarding_session_id', newId);
              setState(prev => ({ ...prev, sessionId: newId }));
            }
          }
        }
      } catch {
        setState(prev => ({ ...prev, loading: false }));
      }
    }

    init();
  }, [router]);

  // Sauvegarder la progression via API (pas localStorage)
  const saveStepProgress = useCallback(async (stepName: string, data?: Record<string, unknown>) => {
    try {
      await fetch(buildApiUrl('/api/v1/onboarding/step'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ step: stepName, data }),
      });
    } catch {
      // Continuer même si la sauvegarde échoue
    }
  }, []);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const markCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  }, []);

  const nextStep = useCallback(() => {
    markCompleted(state.currentStep);
    setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1) }));
  }, [state.currentStep, markCompleted]);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 0) }));
  }, []);

  const skipStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1) }));
  }, []);

  const handleSectorNext = useCallback(() => {
    saveStepProgress('sector', { sector: state.sector });
    nextStep();
  }, [state.sector, saveStepProgress, nextStep]);

  const handleComplete = useCallback(async () => {
    markCompleted(TOTAL_STEPS - 1);
    await saveStepProgress('complete');
    localStorage.removeItem('onboarding_session_id');
    router.push('/dashboard');
  }, [router, markCompleted, saveStepProgress]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <SectorStep
            sector={state.sector}
            onSectorChange={s => setState(prev => ({ ...prev, sector: s }))}
            onNext={handleSectorNext}
          />
        );
      case 1:
        return (
          <BusinessStep
            sessionId={state.sessionId || ''}
            sector={state.sector}
            businessData={state.businessData}
            onBusinessChange={d => setState(prev => ({ ...prev, businessData: d }))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <PhoneVerificationStep
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 3:
        return (
          <KnowledgeStep
            sessionId={state.sessionId || ''}
            kbData={state.kbData}
            onKbChange={d => setState(prev => ({ ...prev, kbData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 4:
        return (
          <ProductsStep
            productsData={state.productsData}
            onProductsChange={d => setState(prev => ({ ...prev, productsData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 5:
        return (
          <ChannelsStep
            channelsData={state.channelsData}
            onChannelsChange={d => setState(prev => ({ ...prev, channelsData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 6:
        return (
          <AssistantStep
            sessionId={state.sessionId || ''}
            assistantData={state.assistantData}
            onAssistantChange={d => setState(prev => ({ ...prev, assistantData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 7:
        return (
          <SummaryStep
            sessionId={state.sessionId || ''}
            sector={state.sector}
            businessData={state.businessData}
            productsData={state.productsData}
            kbData={state.kbData}
            channelsData={state.channelsData}
            assistantData={state.assistantData}
            completedSteps={completedSteps}
            onBack={prevStep}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <StepperProgress
          currentStep={state.currentStep}
          completedSteps={completedSteps}
          onGotoStep={goToStep}
        />

        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {renderStep()}
        </div>
      </div>
    </div>
  );
}

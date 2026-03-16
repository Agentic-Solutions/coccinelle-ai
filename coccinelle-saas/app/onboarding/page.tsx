'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import StepperProgress from '@/components/onboarding/StepperProgress';
import SectorStep from '@/components/onboarding/steps/SectorStep';
import BusinessStep from '@/components/onboarding/steps/BusinessStep';
import KnowledgeStep from '@/components/onboarding/steps/KnowledgeStep';
import ProductsStep from '@/components/onboarding/steps/ProductsStep';
import ChannelsStep from '@/components/onboarding/steps/ChannelsStep';
import AssistantStep from '@/components/onboarding/steps/AssistantStep';
import SummaryStep from '@/components/onboarding/steps/SummaryStep';

const TOTAL_STEPS = 7; // 0-6

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

  // Initialize onboarding session
  useEffect(() => {
    async function init() {
      // 1. Check auth
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.replace('/login');
        return;
      }

      // 2. Check if onboarding already completed
      try {
        const meResponse = await fetch(buildApiUrl('/api/v1/auth/me'), {
          headers: getAuthHeaders(),
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (meData.tenant?.onboarding_completed || localStorage.getItem('onboarding_completed') === 'true') {
            router.replace('/dashboard');
            return;
          }
        }
      } catch {
        // Continue with onboarding setup
      }

      // Pre-fill sector from signup
      let preSector = '';
      try {
        const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        preSector = tenant.industry || user.industry || '';
      } catch {
        // ignore
      }

      // 3. Check for existing session
      const existingSessionId = localStorage.getItem('onboarding_session_id');
      if (existingSessionId) {
        try {
          const statusResponse = await fetch(
            buildApiUrl(`/api/v1/onboarding/session/${existingSessionId}/status`),
            { headers: getAuthHeaders() }
          );
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.status === 'completed') {
              localStorage.setItem('onboarding_completed', 'true');
              router.replace('/dashboard');
              return;
            }
            // Resume at saved step
            const savedStep = parseInt(localStorage.getItem('onboarding_current_step') || '0', 10);
            setState(prev => ({
              ...prev,
              sessionId: existingSessionId,
              currentStep: Math.min(savedStep, TOTAL_STEPS - 1),
              loading: false,
              sector: preSector || prev.sector,
            }));
            return;
          }
        } catch {
          // Session invalid, create new one
          localStorage.removeItem('onboarding_session_id');
        }
      }

      // 4. Create new session
      try {
        const startResponse = await fetch(buildApiUrl('/api/v1/onboarding/start'), {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        if (startResponse.ok) {
          const startData = await startResponse.json();
          const newSessionId = startData.session_id || startData.sessionId || startData.id;
          if (newSessionId) {
            localStorage.setItem('onboarding_session_id', newSessionId);
            if (startData.tenant_id) {
              sessionStorage.setItem('onboarding_session', JSON.stringify({ tenant_id: startData.tenant_id }));
            }
            setState(prev => ({
              ...prev,
              sessionId: newSessionId,
              loading: false,
              sector: preSector || prev.sector,
            }));
          } else {
            setState(prev => ({ ...prev, loading: false, sector: preSector || prev.sector }));
          }
        } else {
          setState(prev => ({ ...prev, loading: false, sector: preSector || prev.sector }));
        }
      } catch {
        setState(prev => ({ ...prev, loading: false, sector: preSector || prev.sector }));
      }
    }

    init();
  }, [router]);

  // Persist current step
  useEffect(() => {
    if (!state.loading) {
      localStorage.setItem('onboarding_current_step', String(state.currentStep));
    }
  }, [state.currentStep, state.loading]);

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

  const handleComplete = useCallback(() => {
    markCompleted(TOTAL_STEPS - 1);
    localStorage.removeItem('onboarding_session_id');
    localStorage.removeItem('onboarding_current_step');
    router.push('/dashboard');
  }, [router, markCompleted]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#D85A30] border-t-transparent rounded-full animate-spin mx-auto" />
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
            onNext={nextStep}
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
          <KnowledgeStep
            sessionId={state.sessionId || ''}
            kbData={state.kbData}
            onKbChange={d => setState(prev => ({ ...prev, kbData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 3:
        return (
          <ProductsStep
            productsData={state.productsData}
            onProductsChange={d => setState(prev => ({ ...prev, productsData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 4:
        return (
          <ChannelsStep
            channelsData={state.channelsData}
            onChannelsChange={d => setState(prev => ({ ...prev, channelsData: d }))}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 5:
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
      case 6:
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

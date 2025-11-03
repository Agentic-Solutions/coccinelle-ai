/**
 * =====================================================
 * COCCINELLE.AI - PAGE ONBOARDING PRINCIPALE
 * Version : v2.8.0
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/onboarding/ProgressBar';
import WelcomeStep from '../components/onboarding/WelcomeStep';
import BusinessInfoStep from '../components/onboarding/BusinessInfoStep';
import AgentsStep from '../components/onboarding/AgentsStep';
import VapiStep from '../components/onboarding/VapiStep';
import KnowledgeBaseStep from '../components/onboarding/KnowledgeBaseStep';
import CompletionStep from '../components/onboarding/CompletionStep';

const API_BASE = import.meta.env.VITE_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Données collectées par étape
  const [businessData, setBusinessData] = useState(null);
  const [agentsData, setAgentsData] = useState(null);
  const [vapiData, setVapiData] = useState(null);
  const [kbData, setKbData] = useState(null);

  /**
   * Initialiser l'onboarding au chargement
   */
  useEffect(() => {
    startOnboardingSession();
  }, []);

  /**
   * Démarre une nouvelle session d'onboarding
   */
  const startOnboardingSession = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/onboarding/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.session.id);
        setCurrentStep(data.session.current_step);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Error starting onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Met à jour une étape
   */
  const updateStep = async (step, data, moveNext = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/onboarding/${sessionId}/step`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          step,
          data,
          moveToNext: moveNext
        })
      });

      const result = await response.json();
      
      if (result.success) {
        if (moveNext) {
          setCurrentStep(result.session.current_step);
        }
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Error updating step:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Passe à l'étape suivante
   */
  const nextStep = async (data) => {
    // Sauvegarder les données de l'étape actuelle
    switch (currentStep) {
      case 1:
        // Step 1 = Welcome, pas de données à sauver
        setCurrentStep(2);
        break;
      case 2:
        setBusinessData(data);
        const success = await updateStep(2, data);
        if (!success) return;
        break;
      case 3:
        setAgentsData(data);
        await updateStep(3, data);
        break;
      case 4:
        setVapiData(data);
        await updateStep(4, data);
        break;
      case 5:
        setKbData(data);
        await updateStep(5, data);
        break;
      case 6:
        // Compléter l'onboarding
        await completeOnboarding();
        break;
    }
  };

  /**
   * Revient à l'étape précédente
   */
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Complète l'onboarding
   */
  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/onboarding/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Rediriger vers le dashboard après 2 secondes
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render du contenu selon l'étape
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={() => nextStep()} />;
      case 2:
        return (
          <BusinessInfoStep
            initialData={businessData}
            onNext={nextStep}
            loading={loading}
          />
        );
      case 3:
        return (
          <AgentsStep
            sessionId={sessionId}
            businessData={businessData}
            onNext={nextStep}
            loading={loading}
          />
        );
      case 4:
        return (
          <VapiStep
            sessionId={sessionId}
            businessData={businessData}
            onNext={nextStep}
            loading={loading}
          />
        );
      case 5:
        return (
          <KnowledgeBaseStep
            sessionId={sessionId}
            businessData={businessData}
            onNext={nextStep}
            loading={loading}
          />
        );
      case 6:
        return (
          <CompletionStep
            businessData={businessData}
            agentsData={agentsData}
            vapiData={vapiData}
            kbData={kbData}
          />
        );
      default:
        return <WelcomeStep onNext={() => nextStep()} />;
    }
  };

  if (!sessionId && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation de l'onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🐞 Coccinelle.AI
          </h1>
          <p className="text-gray-600">
            Configuration de votre plateforme en quelques minutes
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          currentStep={currentStep}
          totalSteps={6}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep > 1 && currentStep < 6 && (
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              ← Précédent
            </button>
            
            <div className="text-sm text-gray-500 self-center">
              Étape {currentStep} sur 6
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Besoin d'aide ? <a href="mailto:support@coccinelle.ai" className="text-indigo-600 hover:underline">Contactez le support</a>
        </div>
      </div>
    </div>
  );
}

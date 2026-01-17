'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Calendar, Users, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';

// Définition du parcours en 6 étapes
const journeySteps = [
  {
    id: 1,
    title: "Appel entrant",
    subtitle: "Sophie cherche des informations",
    icon: Phone,
    notification: "Appel de Sophie Martin",
    color: "from-gray-700 to-gray-900",
    description: "L'IA décroche instantanément",
    duration: "< 1s",
    automation: "Automatique",
    modules: ['calls']
  },
  {
    id: 2,
    title: "Conversation IA",
    subtitle: "L'agent virtuel comprend la demande",
    icon: MessageSquare,
    notification: "Conversation en cours...",
    color: "from-gray-700 to-gray-900",
    description: "Qualification automatique des besoins",
    duration: "12s",
    automation: "Zéro effort",
    modules: ['calls', 'messages']
  },
  {
    id: 3,
    title: "Prospect qualifié",
    subtitle: "Ajout automatique au CRM",
    icon: Users,
    notification: "Prospect ajouté : Sophie Martin",
    color: "from-gray-700 to-gray-900",
    description: "Score : 85/100 - Chaud",
    duration: "< 1s",
    automation: "Automatique",
    modules: ['calls', 'messages', 'prospects']
  },
  {
    id: 4,
    title: "RDV planifié",
    subtitle: "Créneau trouvé et réservé",
    icon: Calendar,
    notification: "RDV : Demain 14h30",
    color: "from-gray-700 to-gray-900",
    description: "Calendrier synchronisé",
    duration: "3s",
    automation: "Automatique",
    modules: ['calls', 'messages', 'prospects', 'appointments']
  },
  {
    id: 5,
    title: "Confirmation SMS",
    subtitle: "Rappel automatique envoyé",
    icon: MessageSquare,
    notification: "SMS envoyé à Sophie",
    color: "from-gray-700 to-gray-900",
    description: "Rappel 24h avant le RDV",
    duration: "< 1s",
    automation: "Automatique",
    modules: ['calls', 'messages', 'prospects', 'appointments', 'messages']
  },
  {
    id: 6,
    title: "Analytics mis à jour",
    subtitle: "Tableaux de bord actualisés",
    icon: BarChart3,
    notification: "+1 RDV qualifié",
    color: "from-gray-700 to-gray-900",
    description: "Taux de conversion : +5%",
    duration: "< 1s",
    automation: "Temps réel",
    modules: ['calls', 'messages', 'prospects', 'appointments', 'messages', 'analytics']
  }
];

export default function UserJourneyAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Boucle infinie du parcours
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = (prev + 1) % journeySteps.length;

        // Reset à l'étape 1
        if (nextStep === 0) {
          setCompletedSteps([]);
          setElapsedTime(0);
        } else {
          setCompletedSteps((completed) => [...completed, prev]);
        }

        return nextStep;
      });
    }, 4000); // 4 secondes par étape

    return () => clearInterval(stepInterval);
  }, []);

  // Timer qui compte les secondes
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    // Animation de notification à chaque nouvelle étape
    setShowNotification(false);
    const notifTimeout = setTimeout(() => setShowNotification(true), 300);
    return () => clearTimeout(notifTimeout);
  }, [currentStep]);

  const current = journeySteps[currentStep];
  const Icon = current.icon;

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Notification flottante */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
        <div
          className={`bg-white rounded-lg shadow-2xl px-6 py-3 border-2 border-gray-200 transition-all duration-500 ${
            showNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <p className="text-sm font-semibold text-gray-900">{current.notification}</p>
        </div>
      </div>

      {/* Container principal */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header navigateur avec timer */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-md text-sm text-gray-600">
              app.coccinelle.ai
            </div>
          </div>
          {/* Chronomètre */}
          <div className="bg-gray-900 text-white px-4 py-1.5 rounded-md flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono font-bold">{elapsedTime}s</span>
          </div>
        </div>

        {/* Contenu */}
        <div className="relative h-[550px] bg-gray-50">
          {/* Timeline en haut */}
          <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {journeySteps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;

                return (
                  <div key={step.id} className="flex items-center">
                    {/* Étape */}
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isCurrent
                            ? 'bg-gray-900 text-white scale-110 shadow-lg'
                            : isCompleted
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <StepIcon className="w-6 h-6" />
                        )}
                      </div>
                      <div className={`text-xs font-medium transition-colors ${
                        isCurrent ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        Étape {index + 1}
                      </div>
                    </div>

                    {/* Ligne de connexion */}
                    {index < journeySteps.length - 1 && (
                      <div className="w-16 h-1 mx-2 relative">
                        <div className="absolute inset-0 bg-gray-200" />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 transition-all duration-1000 ${
                            isCompleted ? 'w-full' : 'w-0'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contenu de l'étape actuelle */}
          <div className="absolute top-32 left-0 right-0 bottom-0 flex items-center justify-center p-8">
            <div
              key={currentStep}
              className="w-full max-w-2xl text-center animate-fadeIn"
            >
              {/* Icône principale avec gradient */}
              <div className="mb-8 flex justify-center">
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-2xl animate-scaleIn`}>
                  <Icon className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Titre et description */}
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {current.title}
              </h2>
              <p className="text-xl text-gray-600 mb-2">
                {current.subtitle}
              </p>
              <p className="text-lg text-gray-500">
                {current.description}
              </p>

              {/* Badges Rapidité et Automation */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                  <span className="font-mono">{current.duration}</span>
                </div>
                <div className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                  {current.automation}
                </div>
              </div>

              {/* Modules actifs */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="text-sm text-gray-500">Modules actifs:</span>
                <div className="flex gap-2">
                  {current.modules.map((module) => (
                    <div
                      key={module}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium animate-slideInUp"
                    >
                      {module}
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicateur de progression */}
              <div className="mt-12">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm">Automatisation en cours...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Légende avec métriques clés */}
      <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">
            <strong className="text-gray-900">Parcours automatisé</strong> - De l'appel au RDV confirmé en moins de 20 secondes
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-1">15h</p>
            <p className="text-xs text-gray-600">Gain de temps / semaine</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-1">0</p>
            <p className="text-xs text-gray-600">Effort manuel requis</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-1">&lt; 2s</p>
            <p className="text-xs text-gray-600">Temps de réponse moyen</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-1">100%</p>
            <p className="text-xs text-gray-600">Automatisation</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }

        .animate-slideInUp {
          animation: slideInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

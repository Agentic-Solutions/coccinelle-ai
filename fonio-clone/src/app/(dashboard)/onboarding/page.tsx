'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Phone, Bot, Users, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE ONBOARDING - Configuration initiale
// ═══════════════════════════════════════

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  completed: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const steps: OnboardingStep[] = [
    { id: 0, title: 'Profil de l\'organisation', description: 'Nom, secteur et fuseau horaire', icon: Users, completed: false },
    { id: 1, title: 'Premier numéro', description: 'Acheter un numéro virtuel', icon: Phone, completed: false },
    { id: 2, title: 'Agent IA', description: 'Créer votre premier agent vocal', icon: Bot, completed: false },
    { id: 3, title: 'Facturation', description: 'Choisir votre plan', icon: CreditCard, completed: false },
  ]

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      router.push('/')
    }
  }

  function handleSkip() {
    router.push('/')
  }

  const step = steps[currentStep]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progression */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                i < currentStep ? 'bg-green-500 text-white' :
                i === currentStep ? 'bg-brand-600 text-white' :
                'bg-gray-200 text-gray-500'
              )}>
                {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-12 h-0.5', i < currentStep ? 'bg-green-500' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        {/* Contenu de l'étape */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-6">
            <step.icon className="w-8 h-8 text-brand-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Étape {currentStep + 1} : {step.title}
          </h1>
          <p className="text-gray-500 mb-8">{step.description}</p>

          {/* Placeholder pour le formulaire de chaque étape */}
          <div className="bg-gray-50 rounded-lg p-8 mb-8 text-sm text-gray-500">
            {/* TODO: Formulaire dynamique selon l'étape */}
            Configuration de : {step.title}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={handleSkip} className="text-sm text-gray-500 hover:text-gray-700">
              Passer pour le moment
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              {currentStep < steps.length - 1 ? 'Suivant' : 'Terminer'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

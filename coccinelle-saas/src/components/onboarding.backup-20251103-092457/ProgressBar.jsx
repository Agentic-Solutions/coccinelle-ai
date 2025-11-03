import React from 'react';

const steps = [
  { number: 1, label: 'Bienvenue', icon: '👋' },
  { number: 2, label: 'Entreprise', icon: '🏢' },
  { number: 3, label: 'Agents', icon: '👥' },
  { number: 4, label: 'Assistant', icon: '🎙️' },
  { number: 5, label: 'KB', icon: '📚' },
  { number: 6, label: 'Terminé', icon: '🎉' }
];

export default function ProgressBar({ currentStep, totalSteps }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="mb-8">
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all ${step.number < currentStep ? 'bg-indigo-600 text-white' : step.number === currentStep ? 'bg-indigo-500 text-white ring-4 ring-indigo-200' : 'bg-gray-200 text-gray-400'}`}>
              {step.number < currentStep ? '✓' : step.icon}
            </div>
            <div className={`text-xs text-center max-w-[80px] ${step.number <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

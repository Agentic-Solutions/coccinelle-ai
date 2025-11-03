'use client';

import React from 'react';

const steps = [
  { number: 1, label: 'Bienvenue' },
  { number: 2, label: 'Entreprise' },
  { number: 3, label: 'Agents' },
  { number: 4, label: 'Configuration' },
  { number: 5, label: 'Documents' },
  { number: 6, label: 'Terminé' }
];

export default function ProgressBar({ currentStep, totalSteps }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full mb-8">
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between mt-4">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep >= step.number
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.number}
            </div>
            <span className={`text-xs mt-2 ${
              currentStep >= step.number ? 'text-black font-medium' : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

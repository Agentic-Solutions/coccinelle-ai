'use client';

import React from 'react';

interface StepperProgressProps {
  currentStep: number; // 0-6
  completedSteps: Set<number>;
  onGotoStep: (step: number) => void;
}

const STEP_LABELS = [
  'Secteur',
  'Entreprise',
  'Connaissances',
  'Produits',
  'Canaux',
  'Assistant',
  'Recapitulatif',
];

const TOTAL_STEPS = STEP_LABELS.length;

export default function StepperProgress({ currentStep, completedSteps, onGotoStep }: StepperProgressProps) {
  return (
    <div className="w-full">
      {/* Step counter */}
      <div className="flex justify-end mb-3">
        <span className="text-sm text-gray-500 font-medium">
          Etape {currentStep + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Progress circles */}
      <div className="flex items-center justify-between w-full">
        {STEP_LABELS.map((label, index) => {
          const isCompleted = completedSteps.has(index);
          const isActive = index === currentStep;
          const isFuture = !isCompleted && !isActive;
          const isClickable = isCompleted;

          return (
            <React.Fragment key={index}>
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    completedSteps.has(index - 1) ? 'bg-[#0F6E56]' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Step circle */}
              <button
                type="button"
                onClick={() => isClickable && onGotoStep(index)}
                disabled={!isClickable}
                className={`
                  flex-shrink-0 flex items-center justify-center rounded-full transition-all
                  ${isActive ? 'w-9 h-9 sm:w-10 sm:h-10 bg-[#D85A30] text-white shadow-md' : ''}
                  ${isCompleted ? 'w-9 h-9 sm:w-10 sm:h-10 bg-[#0F6E56] text-white cursor-pointer hover:ring-2 hover:ring-[#0F6E56]/30' : ''}
                  ${isFuture ? 'w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 text-gray-400 border border-gray-200' : ''}
                  ${!isClickable ? 'cursor-default' : ''}
                `}
                title={label}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs sm:text-sm font-semibold">{index + 1}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Labels - hidden on mobile */}
      <div className="hidden sm:flex items-center justify-between w-full mt-2">
        {STEP_LABELS.map((label, index) => (
          <React.Fragment key={index}>
            {index > 0 && <div className="flex-1" />}
            <span
              className={`text-xs text-center flex-shrink-0 w-10 ${
                index === currentStep ? 'text-[#D85A30] font-semibold' :
                completedSteps.has(index) ? 'text-[#0F6E56] font-medium' :
                'text-gray-400'
              }`}
            >
              {label}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

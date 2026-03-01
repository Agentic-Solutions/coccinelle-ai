'use client';

import React from 'react';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center py-6 sm:py-8 px-4">
      <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🐞</div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
        Bienvenue sur Coccinelle.AI
      </h1>
      <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
        Configurez votre assistant vocal Sara en quelques minutes.
        Elle repondra a vos clients 24h/24, 7j/7.
      </p>
      <button
        onClick={onNext}
        className="w-full sm:w-auto bg-black text-white px-8 py-3.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-800 active:bg-gray-700 transition-colors text-base"
      >
        Commencer la configuration
      </button>
    </div>
  );
}

'use client';

import React from 'react';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-6">🐞</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Bienvenue sur Coccinelle.AI
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Configurez votre assistant vocal Sara en quelques minutes.
        Elle répondra à vos clients 24h/24, 7j/7.
      </p>
      <button
        onClick={onNext}
        className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
      >
        Commencer la configuration
      </button>
    </div>
  );
}

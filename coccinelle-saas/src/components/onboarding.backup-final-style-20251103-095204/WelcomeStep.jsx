'use client';

import React from 'react';

export default function WelcomeStep({ onNext }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-6">🐞</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Bienvenue sur Coccinelle.AI !
      </h2>
      <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
        Nous allons configurer votre plateforme ensemble en <strong>moins de 5 minutes</strong>.
        Vous aurez à la fin :
      </p>
      
      <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
        <div className="bg-indigo-50 p-6 rounded-xl">
          <div className="text-3xl mb-3">🤖</div>
          <h3 className="font-semibold text-gray-900 mb-2">Assistant vocal IA</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Sara répondra à vos clients 24/7</p>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-xl">
          <div className="text-3xl mb-3">📅</div>
          <h3 className="font-semibold text-gray-900 mb-2">Gestion des RDV</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Calendrier intelligent pour vos agents</p>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-xl">
          <div className="text-3xl mb-3">📚</div>
          <h3 className="font-semibold text-gray-900 mb-2">Base de connaissances</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">IA entraînée sur vos services</p>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-xl">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-gray-900 mb-2">Dashboard analytics</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Suivez vos performances en temps réel</p>
        </div>
      </div>
      
      <button
        onClick={onNext}
        className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-lg font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        Commencer la configuration →
      </button>
      
      <p className="mt-6 text-sm text-gray-500">
        ⏱️ Temps estimé : 5 minutes
      </p>
    </div>
  );
}

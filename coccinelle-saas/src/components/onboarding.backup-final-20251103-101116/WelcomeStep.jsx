'use client';

import React from 'react';
import { Phone, Calendar, BookOpen, BarChart3 } from 'lucide-react';

export default function WelcomeStep({ onNext }) {
  return (
    <div className="text-center">
      {/* Logo C */}
      <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-full mb-6">
        <span className="text-4xl font-bold text-white">C</span>
      </div>

      {/* Titre */}
      <h1 className="text-3xl font-bold text-black mb-4">
        Bienvenue sur Coccinelle.AI !
      </h1>

      {/* Description */}
      <p className="text-gray-600 text-lg mb-8">
        Nous allons configurer votre plateforme ensemble en{' '}
        <span className="font-semibold text-black">moins de 5 minutes</span>. Vous aurez à la fin :
      </p>

      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <FeatureCard
          icon={<Phone className="w-6 h-6 text-black" />}
          title="Assistant vocal IA"
          description="Sara répondra à vos clients 24/7"
        />
        <FeatureCard
          icon={<Calendar className="w-6 h-6 text-black" />}
          title="Gestion des RDV"
          description="Calendrier intelligent pour vos agents"
        />
        <FeatureCard
          icon={<BookOpen className="w-6 h-6 text-black" />}
          title="Base de connaissances"
          description="Réponses précises grâce à vos documents"
        />
        <FeatureCard
          icon={<BarChart3 className="w-6 h-6 text-black" />}
          title="Dashboard analytics"
          description="Suivez vos performances en temps réel"
        />
      </div>

      {/* Bouton */}
      <button
        onClick={onNext}
        className="px-8 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
      >
        Commencer →
      </button>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-gray-300 transition-colors">
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-black mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

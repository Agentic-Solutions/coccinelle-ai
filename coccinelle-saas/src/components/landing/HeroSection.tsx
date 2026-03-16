'use client';

import Link from 'next/link';
import { ArrowRightIcon } from './icons';

interface HeroSectionProps {
  onOpenTour: () => void;
}

export default function HeroSection({ onOpenTour }: HeroSectionProps) {
  return (
    <section className="relative pt-20 pb-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 -z-10" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            La plateforme tout-en-un qui{' '}
            <span className="text-[#D85A30]">gere vos clients, vos rendez-vous et vos appels</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            CRM, agenda, messagerie, catalogue de services, reservation en ligne et assistant vocal
            — tout ce dont votre entreprise a besoin, dans un seul outil. Pret en 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 text-base font-semibold rounded-lg text-white bg-[#D85A30] hover:bg-[#993C1D] shadow-lg hover:shadow-xl transition-all"
            >
              Demarrer gratuitement
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <button
              onClick={onOpenTour}
              className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              Voir la demo
            </button>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              14 jours gratuits
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              Sans carte bancaire
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              Setup en 5 min
            </span>
          </div>
        </div>

        {/* 4 mini-KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">26</div>
            <div className="text-sm text-gray-600">Modules</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">6</div>
            <div className="text-sm text-gray-600">Canaux integres</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">24/7</div>
            <div className="text-sm text-gray-600">Disponible</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">5 min</div>
            <div className="text-sm text-gray-600">Installation</div>
          </div>
        </div>
      </div>
    </section>
  );
}

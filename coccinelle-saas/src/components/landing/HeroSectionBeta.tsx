'use client';

import { ArrowRightIcon } from './icons';

interface HeroSectionBetaProps {
  onOpenTour: () => void;
}

export default function HeroSectionBeta({ onOpenTour }: HeroSectionBetaProps) {
  return (
    <section className="relative pt-20 pb-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 -z-10" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Votre relation client,{' '}
            <span className="text-[#D85A30]">augment&eacute;e par l&apos;IA</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            CRM, agenda, r&eacute;servation en ligne, messagerie unifi&eacute;e et assistant vocal &mdash; tout ce dont votre entreprise a besoin pour ne plus jamais perdre un client. Pr&ecirc;t en 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://formulaire-validation.youssef-amrouche.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 text-base font-semibold rounded-lg text-white bg-gray-900 hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all"
            >
              Participer &agrave; l&apos;&eacute;tude terrain
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </a>
            <a
              href="https://formulaire-validation.youssef-amrouche.workers.dev/waitlist"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              &Ecirc;tre contact&eacute;(e) en avant-premi&egrave;re
            </a>
            <button
              onClick={onOpenTour}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-200 text-base font-semibold rounded-lg text-gray-500 bg-white hover:bg-gray-50 transition-all"
            >
              Voir la d&eacute;mo
            </button>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              2 mois gratuits pour les b&ecirc;ta-testeurs
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              Sans engagement
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              Places limit&eacute;es par secteur
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
            <div className="text-sm text-gray-600">Canaux int&eacute;gr&eacute;s</div>
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

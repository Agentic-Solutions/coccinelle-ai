'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from './icons';

interface HeroSectionProps {
  onOpenTour: () => void;
}

export default function HeroSection({ onOpenTour }: HeroSectionProps) {
  const [showTestModal, setShowTestModal] = useState(false);

  return (
    <section className="relative pt-20 pb-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 -z-10" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Votre relation client,{' '}
            <span className="text-[#D85A30]">augmentée par l&apos;IA</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            CRM, agenda, réservation en ligne, messagerie unifiée et assistant vocal — tout ce dont votre entreprise a besoin pour ne plus jamais perdre un client. Prêt en 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 text-base font-semibold rounded-lg text-white bg-[#D85A30] hover:bg-[#993C1D] shadow-lg hover:shadow-xl transition-all"
            >
              Démarrer gratuitement
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <button
              onClick={onOpenTour}
              className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              Voir la démo
            </button>
            <button
              onClick={() => setShowTestModal(true)}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[#0F6E56] text-base font-semibold rounded-lg text-[#0F6E56] bg-white hover:bg-[#0F6E56]/5 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Tester l&apos;assistant
            </button>
          </div>

      {/* Modal test assistant */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTestModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-[#0F6E56]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Testez l&apos;assistant en direct</h3>
            <p className="text-gray-600 mb-6">Appelez notre assistant de démonstration et posez-lui vos questions</p>
            <a
              href="https://app.retellai.com/agent-test-call/agent_21f34e839d9c2c826ae164aa56"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0F6E56] text-white font-semibold rounded-lg hover:bg-[#0a5a45] transition-all shadow-lg w-full justify-center"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Lancer l&apos;appel test
            </a>
            <p className="text-xs text-gray-400 mt-4">L&apos;appel est gratuit et dure 2 minutes maximum</p>
            <button
              onClick={() => setShowTestModal(false)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

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
            <div className="text-sm text-gray-600">Canaux intégrés</div>
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

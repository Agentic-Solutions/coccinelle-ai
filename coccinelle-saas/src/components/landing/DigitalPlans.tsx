'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';

export default function DigitalPlans() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-12">
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-gray-400">Vous n&apos;avez pas besoin de voix ?</p>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 text-sm text-gray-400 border border-gray-200 rounded-lg px-4 py-2 hover:text-gray-600 hover:border-gray-300 transition-all duration-300"
        >
          {isOpen ? '− Masquer les plans digitaux' : '+ Voir les plans digitaux'}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-8' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Plans Digitaux — Sans agent vocal</h3>
              <p className="text-sm text-gray-400">SMS et Email uniquement</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Digital SMS */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                <h4 className="text-base font-bold text-gray-900 mb-1">SMS</h4>
                <p className="text-xs text-gray-400 mb-4">L&apos;essentiel</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">39&#8239;&#8364;</span>
                  <span className="text-gray-400 text-sm">/mois HT</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">50 SMS/mois</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Base de connaissances</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Agenda & RDV</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Support email</span></li>
                </ul>
                <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-delà</p>
                <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Commencer
                </Link>
              </div>

              {/* Digital Pro */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                <h4 className="text-base font-bold text-gray-900 mb-1">Digital Pro</h4>
                <p className="text-xs text-gray-400 mb-4">SMS + Email</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">69&#8239;&#8364;</span>
                  <span className="text-gray-400 text-sm">/mois HT</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">100 SMS/mois</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Email inclus</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Base de connaissances</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Agenda & RDV</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Insights basiques</span></li>
                </ul>
                <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-delà</p>
                <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Commencer
                </Link>
              </div>

              {/* Digital Omnicanal */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                <h4 className="text-base font-bold text-gray-900 mb-1">Digital Omnicanal</h4>
                <p className="text-xs text-gray-400 mb-4">SMS + Email</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">129&#8239;&#8364;</span>
                  <span className="text-gray-400 text-sm">/mois HT</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">300 SMS/mois</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Email inclus</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Base de connaissances</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Agenda & RDV</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Insights complets</span></li>
                </ul>
                <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-delà</p>
                <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Commencer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

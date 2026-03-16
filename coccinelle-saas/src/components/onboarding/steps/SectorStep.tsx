'use client';

import React from 'react';

interface SectorStepProps {
  sector: string;
  onSectorChange: (sector: string) => void;
  onNext: () => void;
}

const SECTORS = [
  { id: 'beaute', label: 'Beaute', icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )},
  { id: 'sante', label: 'Sante', icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )},
  { id: 'immobilier', label: 'Immobilier', icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  )},
  { id: 'restauration', label: 'Restauration', icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z" />
    </svg>
  )},
  { id: 'fitness', label: 'Fitness', icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )},
  { id: 'services', label: 'Services', icon: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.67 3.18a1.5 1.5 0 01-2.18-1.58l1.08-6.31L.47 6.5a1.5 1.5 0 01.83-2.56l6.34-.92L10.47.72a1.5 1.5 0 012.7 0l2.83 5.3 6.34.92a1.5 1.5 0 01.83 2.56l-4.59 4.47 1.08 6.31a1.5 1.5 0 01-2.18 1.58l-5.67-3.18z" />
    </svg>
  )},
];

export default function SectorStep({ sector, onSectorChange, onNext }: SectorStepProps) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#D85A30] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Quel est votre secteur ?</h2>
      </div>
      <p className="text-gray-500 mb-8">
        Choisissez le secteur qui correspond le mieux a votre activite
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
        {SECTORS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSectorChange(s.id)}
            className={`
              border-2 rounded-xl p-6 flex flex-col items-center gap-3 transition-all
              ${sector === s.id
                ? 'border-[#D85A30] bg-orange-50'
                : 'border-gray-200 hover:border-[#D85A30]'
              }
            `}
          >
            <span className={sector === s.id ? 'text-[#D85A30]' : 'text-gray-500'}>
              {s.icon}
            </span>
            <span className={`font-medium ${sector === s.id ? 'text-[#D85A30]' : 'text-gray-700'}`}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onNext}
          disabled={!sector}
          className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

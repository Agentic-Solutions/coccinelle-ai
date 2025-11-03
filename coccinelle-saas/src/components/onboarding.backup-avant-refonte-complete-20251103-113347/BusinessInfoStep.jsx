'use client';

import React, { useState } from 'react';

const industries = [
  'Immobilier',
  'Beauté & Bien-être',
  'Santé',
  'Fitness & Sport',
  'Éducation & Formation',
  'Restaurant & Hôtellerie',
  'Automobile',
  'Voyage & Tourisme',
  'Commerce de détail',
  'Services aux entreprises',
  'Construction & Travaux',
  'Services à domicile',
  'Juridique & Comptabilité',
  'Recrutement & RH',
  'Créatif & Design',
  'Marketing & Communication',
  'Autre'
];

export default function BusinessInfoStep({ onNext, onBack, loading }) {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    const finalIndustry = industry === 'Autre' ? customIndustry : industry;
    
    if (companyName && finalIndustry && phone && email) {
      onNext({ 
        companyName, 
        industry: finalIndustry, 
        phone, 
        email 
      });
    }
  };

  const isFormValid = companyName && 
    (industry !== 'Autre' ? industry : (industry === 'Autre' && customIndustry)) && 
    phone && 
    email;

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Parlez-nous de votre entreprise
      </h2>
      <p className="text-gray-600 mb-8">
        Ces informations nous permettront de personnaliser votre expérience.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Nom de votre entreprise *
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex: Agence SuperImmo"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Secteur d'activité *
          </label>
          <select
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value);
              if (e.target.value !== 'Autre') {
                setCustomIndustry('');
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Sélectionnez votre secteur</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>

          {industry === 'Autre' && (
            <div className="mt-4">
              <input
                type="text"
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                placeholder="Précisez votre secteur d'activité"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Téléphone principal *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 1 23 45 67 89"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Email de contact *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@entreprise.fr"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Chargement...' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}

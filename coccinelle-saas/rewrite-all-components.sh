#!/bin/bash
set -e

echo "🔧 Génération des composants sans emojis"

# Composant déjà fait : WelcomeStep, ProgressBar

# 2. BusinessInfoStep
cat > src/components/onboarding/BusinessInfoStep.jsx << 'EOF'
'use client';

import React, { useState } from 'react';
import { Building2, Sparkles, Briefcase, Dumbbell, Heart } from 'lucide-react';

const industries = [
  { id: 'real_estate', name: 'Immobilier', icon: Building2 },
  { id: 'beauty', name: 'Beauté & Bien-être', icon: Sparkles },
  { id: 'health', name: 'Santé', icon: Heart },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell },
  { id: 'b2b', name: 'Services B2B', icon: Briefcase }
];

export default function BusinessInfoStep({ onNext, onBack, loading }) {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (companyName && industry && phone && email) {
      onNext({ companyName, industry, phone, email });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">Parlez-nous de votre entreprise</h2>
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
          <div className="grid grid-cols-2 gap-3">
            {industries.map((ind) => {
              const Icon = ind.icon;
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setIndustry(ind.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    industry === ind.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-6 h-6 text-black mb-2" />
                  <div className="font-medium text-black">{ind.name}</div>
                </button>
              );
            })}
          </div>
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
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={!companyName || !industry || !phone || !email || loading}
          className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Chargement...' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}
EOF

echo "✅ BusinessInfoStep"

# 3-6: Composants simplifiés (on va juste enlever les emojis pour l'instant)
for comp in "AgentsStep" "VapiStep" "KnowledgeBaseStep" "CompletionStep"; do
    if [ -f "src/components/onboarding/${comp}.jsx" ]; then
        # Supprimer tous les emojis courants
        sed -i '' 's/[🏠🏢👥🤖📚🎉💼🔧⚙️📊✅🚀👋💪⚕️💆‍♀️🏋️‍♂️]//g' "src/components/onboarding/${comp}.jsx"
        echo "✅ ${comp} (emojis supprimés)"
    fi
done

echo ""
echo "🎉 Tous les composants mis à jour !"

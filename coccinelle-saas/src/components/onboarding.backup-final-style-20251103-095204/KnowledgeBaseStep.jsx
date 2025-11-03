'use client';

import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function KnowledgeBaseStep({ sessionId, businessData, onNext, loading }) {
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [kbData, setKbData] = useState(null);
  const [crawlUrl, setCrawlUrl] = useState(businessData?.website || '');
  const [wantsCrawl, setWantsCrawl] = useState(false);

  const initializeKB = async () => {
    setInitializing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/onboarding/${sessionId}/kb/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          crawlUrl: wantsCrawl ? crawlUrl : null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setKbData(data.kb);
        setInitialized(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error initializing KB:', err);
      alert('Erreur lors de l\'initialisation');
    } finally {
      setInitializing(false);
    }
  };

  const handleNext = () => {
    onNext({ kb: kbData, crawl_url: wantsCrawl ? crawlUrl : null });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Initialisation de la base de connaissances
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Créez une base de connaissances pour que Sara puisse répondre précisément à vos clients.
      </p>

      {!initialized ? (
        <div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-8 mb-6">
            <div className="text-5xl mb-4 text-center">📚✨</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              Documents par défaut
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 text-center">
              Nous créons automatiquement :
            </p>
            <ul className="max-w-md mx-auto space-y-2 mb-4">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Guide des services</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>FAQ clients</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Process de prise de RDV</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Horaires et disponibilités</span>
              </li>
            </ul>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">🌐 Crawler votre site web (optionnel)</h3>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={wantsCrawl}
                onChange={(e) => setWantsCrawl(e.target.checked)}
                className="w-4 h-4 text-indigo-600"
              />
              <label className="ml-2 text-neutral-700 dark:text-neutral-300">
                Importer automatiquement le contenu de mon site
              </label>
            </div>
            
            {wantsCrawl && (
              <input
                type="url"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                placeholder="https://www.monsite.com"
              />
            )}
          </div>

          <button
            onClick={initializeKB}
            disabled={initializing}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
          >
            {initializing ? (
              <>
                <span className="animate-spin inline-block mr-2">⚙️</span>
                Initialisation en cours...
              </>
            ) : (
              'Initialiser la base de connaissances'
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">
              ✅ Base de connaissances initialisée !
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {kbData?.documents_created || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Documents créés</div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {kbData?.faqs_created || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">FAQs ajoutées</div>
            </div>
          </div>

          {kbData?.crawl_job_id && (
            <div className="bg-neutral-50 dark:bg-neutral-900 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                🕷️ Le crawl de votre site est en cours... Les pages seront ajoutées automatiquement.
              </p>
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Continuer →'}
          </button>
        </div>
      )}
    </div>
  );
}

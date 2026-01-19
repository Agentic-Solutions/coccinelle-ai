'use client';

import React, { useState } from 'react';
import { Globe, Upload, FileText } from 'lucide-react';

interface KnowledgeBaseStepProps {
  sessionId: string | null;
  onNext: (data: any) => void;
  onBack: () => void;
  loading: boolean;
}

export default function KnowledgeBaseStep({ onNext, onBack, loading }: KnowledgeBaseStepProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<any>(null);

  const handleCrawl = async () => {
    if (!websiteUrl) return;
    
    setCrawling(true);
    // Simuler le crawl pour l'instant
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCrawlResult({
      pages: 5,
      faq: 12,
      services: 4
    });
    setCrawling(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Base de connaissances</h2>
      <p className="text-gray-600 mb-6">
        Sara apprendra à répondre aux questions de vos clients grâce à votre site web.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL de votre site web
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://www.monsite.fr"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <button
            onClick={handleCrawl}
            disabled={!websiteUrl || crawling}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {crawling ? 'Analyse...' : 'Analyser'}
          </button>
        </div>
      </div>

      {crawlResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-800 mb-2">✅ Site analysé avec succès !</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-700">{crawlResult.pages}</div>
              <div className="text-sm text-green-600">Pages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{crawlResult.faq}</div>
              <div className="text-sm text-green-600">FAQ générées</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{crawlResult.services}</div>
              <div className="text-sm text-green-600">Services</div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-6 mb-6">
        <p className="text-sm text-gray-500 mb-4">Ou importez manuellement :</p>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            Importer un fichier
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <FileText className="w-4 h-4" />
            Ajouter manuellement
          </button>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-2 text-gray-600 hover:text-gray-900">
          Retour
        </button>
        <button
          onClick={() => onNext({ websiteUrl, crawlResult })}
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

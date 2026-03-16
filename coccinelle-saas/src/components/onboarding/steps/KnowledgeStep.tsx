'use client';

import React, { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import {
  crawlWebsiteForOnboarding,
  uploadFilesForOnboarding,
} from '@/lib/onboarding-kb-handlers';

interface KnowledgeStepProps {
  sessionId: string;
  kbData: { method: string; documentsCount: number } | null;
  onKbChange: (data: { method: string; documentsCount: number } | null) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface QAItem {
  question: string;
  answer: string;
}

export default function KnowledgeStep({ sessionId, kbData, onKbChange, onNext, onBack, onSkip }: KnowledgeStepProps) {
  // Crawl state
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState('');
  const [crawlResult, setCrawlResult] = useState<{ pagesAnalyzed: number; documentsCount: number } | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ filesCount: number } | null>(null);

  // Q&A state
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [currentQA, setCurrentQA] = useState<QAItem>({ question: '', answer: '' });
  const [savingQA, setSavingQA] = useState(false);

  const [error, setError] = useState('');

  const totalDocs = (crawlResult?.documentsCount || 0) + (uploadResult?.filesCount || 0) + qaItems.length;

  // --- Crawl ---
  const handleCrawl = async () => {
    if (!url.trim()) return;
    let crawlUrl = url.trim();
    if (!crawlUrl.startsWith('http')) crawlUrl = 'https://' + crawlUrl;

    setCrawling(true);
    setError('');
    try {
      const data = await crawlWebsiteForOnboarding(crawlUrl, setCrawlProgress);
      setCrawlResult({ pagesAnalyzed: data.pagesAnalyzed, documentsCount: data.documentsCount });
      setCrawlProgress('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse du site');
      setCrawlProgress('');
    } finally {
      setCrawling(false);
    }
  };

  // --- Upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    try {
      const data = await uploadFilesForOnboarding(Array.from(files));
      setUploadResult(prev => ({
        filesCount: (prev?.filesCount || 0) + data.filesCount,
      }));
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  // --- Q&A ---
  const handleAddQA = async () => {
    if (!currentQA.question.trim() || !currentQA.answer.trim()) return;

    setSavingQA(true);
    setError('');
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(
        buildApiUrl('/api/v1/knowledge/documents'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: currentQA.question.trim(),
            content: currentQA.answer.trim(),
            sourceType: 'manual',
            category: 'faq',
          }),
        }
      );

      if (!response.ok) {
        console.warn('Q&A save returned error, saving locally');
      }

      setQaItems([...qaItems, currentQA]);
      setCurrentQA({ question: '', answer: '' });
    } catch {
      // Save locally even if API fails
      setQaItems([...qaItems, currentQA]);
      setCurrentQA({ question: '', answer: '' });
    } finally {
      setSavingQA(false);
    }
  };

  // --- Continue ---
  const handleContinue = async () => {
    const method = crawlResult ? 'crawl' : uploadResult ? 'upload' : 'manual';
    onKbChange({ method, documentsCount: totalDocs });

    // Try to save to onboarding session
    if (sessionId) {
      try {
        await fetch(
          buildApiUrl(`/api/v1/onboarding/session/${sessionId}/knowledge`),
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ method, documentsCount: totalDocs }),
          }
        );
      } catch {
        // Continue even if session update fails
      }
    }

    onNext();
  };

  const isProcessing = crawling || uploading || savingQA;

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#D85A30] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Base de connaissances</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Alimentez les connaissances de votre assistant pour qu&apos;il réponde précisément à vos clients.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {totalDocs > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <span className="text-[#0F6E56] font-semibold">
            {totalDocs} document{totalDocs > 1 ? 's' : ''} ajouté{totalDocs > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="max-w-lg mx-auto space-y-6">
        {/* Method 1 — Crawl website */}
        <div className="border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-5 h-5 text-[#D85A30] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <h3 className="font-semibold text-gray-900">Analyser votre site web</h3>
          </div>

          {crawlResult ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-[#0F6E56] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-[#0F6E56] font-medium">
                {crawlResult.pagesAnalyzed} page{crawlResult.pagesAnalyzed > 1 ? 's' : ''} analysée{crawlResult.pagesAnalyzed > 1 ? 's' : ''} — {crawlResult.documentsCount} document{crawlResult.documentsCount > 1 ? 's' : ''} créé{crawlResult.documentsCount > 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.monsite.fr"
                  disabled={crawling}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCrawl}
                  disabled={crawling || !url.trim()}
                  className="px-4 py-2 bg-[#D85A30] hover:bg-[#993C1D] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  Analyser
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                L&apos;assistant extraira automatiquement vos services, horaires et tarifs.
              </p>
              {crawling && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#D85A30] h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">{crawlProgress}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Method 2 — Upload files */}
        <div className="border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-5 h-5 text-[#D85A30] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <h3 className="font-semibold text-gray-900">Importer des documents</h3>
          </div>

          {uploadResult ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-[#0F6E56] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-[#0F6E56] font-medium">
                {uploadResult.filesCount} fichier{uploadResult.filesCount > 1 ? 's' : ''} importé{uploadResult.filesCount > 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-200 hover:border-[#D85A30] rounded-lg p-4 cursor-pointer transition-colors text-center">
              <span className="text-sm text-gray-600">
                {uploading ? 'Upload en cours...' : 'Cliquez pour sélectionner des fichiers'}
              </span>
              <p className="text-xs text-gray-400 mt-1">PDF, Word, texte — brochures, menus, tarifs</p>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Method 3 — Q&A */}
        <div className="border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-5 h-5 text-[#D85A30] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <h3 className="font-semibold text-gray-900">Ajouter des questions-réponses</h3>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={currentQA.question}
              onChange={e => setCurrentQA({ ...currentQA, question: e.target.value })}
              placeholder="Question : ex. Quels sont vos horaires ?"
              disabled={savingQA}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none text-sm disabled:bg-gray-100"
            />
            <textarea
              value={currentQA.answer}
              onChange={e => setCurrentQA({ ...currentQA, answer: e.target.value })}
              placeholder="Réponse : ex. Nous sommes ouverts du lundi au samedi, de 9h à 19h."
              disabled={savingQA}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none text-sm disabled:bg-gray-100 resize-none"
            />
            <button
              type="button"
              onClick={handleAddQA}
              disabled={savingQA || !currentQA.question.trim() || !currentQA.answer.trim()}
              className="text-sm text-[#D85A30] hover:text-[#993C1D] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingQA ? 'Ajout...' : '+ Ajouter cette question-réponse'}
            </button>
          </div>

          {qaItems.length > 0 && (
            <div className="mt-3 border border-gray-100 rounded-lg divide-y divide-gray-100">
              {qaItems.map((qa, i) => (
                <div key={i} className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-700">{qa.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{qa.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Vous pourrez compléter ces informations à tout moment depuis votre tableau de bord.
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Retour
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={isProcessing}
            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
          >
            Passer cette étape
          </button>
          {totalDocs > 0 && (
            <button
              type="button"
              onClick={handleContinue}
              disabled={isProcessing}
              className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

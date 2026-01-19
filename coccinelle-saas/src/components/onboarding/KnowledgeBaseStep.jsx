'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Upload, MessageSquare, Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { getQuestionsForSector, generateDocumentsFromAnswers, calculateInitialScore } from '../../../lib/kb-assistant-questions';
import { isDemoMode } from '../../../lib/mockData';
import { buildApiUrl, getAuthHeaders, getCurrentTenantId, getTenantStorageKey } from '../../../lib/config';
import { processLocalCrawl } from '../../../lib/crawl-processor';

export default function KnowledgeBaseStep({ sessionId, onNext, onBack, loading }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Assistant guidé states
  const [assistantStep, setAssistantStep] = useState('intro'); // intro | questions | generating
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Warning modal state
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Charger les questions quand l'assistant est sélectionné
  useEffect(() => {
    if (selectedMethod === 'assistant' && questions.length === 0) {
      // Récupérer le secteur depuis localStorage (sauvegardé au signup)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sector = user.sector || 'default';
      const sectorQuestions = getQuestionsForSector(sector);
      setQuestions(sectorQuestions.questions);
    }
  }, [selectedMethod]);

  // Option 1 : Crawler site web
  const handleWebsiteCrawl = async () => {
    if (!websiteUrl) return;

    setCrawling(true);

    try {
      const { crawlWebsiteForOnboarding } = await import('../../../lib/onboarding-kb-handlers');
      const result = await crawlWebsiteForOnboarding(websiteUrl);

      onNext({
        method: 'website',
        url: websiteUrl,
        crawl_job_id: result.jobId,
        documents_count: result.documentsCount,
        pages_analyzed: result.pagesAnalyzed
      });
    } catch (error) {
      console.error('Erreur crawl:', error);
      alert(error instanceof Error ? error.message : 'Erreur réseau. Vérifiez que votre URL est correcte.');
      setCrawling(false);
    }
  };

  // Option 2 : Upload documents
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadedFiles(files);
  };

  const handleContinueWithFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setUploading(true);

    try {
      const { uploadFilesForOnboarding } = await import('../../../lib/onboarding-kb-handlers');
      const result = await uploadFilesForOnboarding(uploadedFiles);

      onNext({ method: 'upload', files_count: result.filesCount });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur réseau');
      setUploading(false);
    }
  };

  // Option 3 : Assistant guidé
  const handleStartAssistant = () => {
    setAssistantStep('questions');
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Toutes les questions répondues, générer les documents
      handleGenerateDocuments();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleGenerateDocuments = async () => {
    setAssistantStep('generating');
    setGenerating(true);

    try {
      const { generateDocumentsFromAssistant } = await import('../../../lib/onboarding-kb-handlers');

      const result = await generateDocumentsFromAssistant(
        answers,
        questions,
        setGenerationProgress
      );

      // Passer à l'étape suivante avec les résultats
      onNext({
        method: 'assistant',
        status: 'completed',
        documents_generated: result.documentsGenerated,
        initial_score: result.initialScore,
        answers: result.answers
      });

    } catch (error) {
      console.error('Erreur génération documents:', error);
      alert('Erreur lors de la génération. Nous avons quand même enregistré vos réponses.');
      onNext({
        method: 'assistant',
        status: 'partial',
        answers: answers
      });
    } finally {
      setGenerating(false);
    }
  };

  // Skip - Affiche modal warning
  const handleSkip = () => {
    setShowSkipWarning(true);
  };

  // Confirmation skip après warning
  const confirmSkip = () => {
    setShowSkipWarning(false);
    onNext({ method: 'skip' });
  };

  // Vue initiale : Choix de la méthode
  if (selectedMethod === null) {
    // Modal Skip Warning
    if (showSkipWarning) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6 shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-black mb-3">
              Êtes-vous sûr de vouloir passer cette étape ?
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900 font-medium mb-3">
                Sans Knowledge Base, Assistant ne pourra pas :
              </p>
              <ul className="space-y-2 text-sm text-red-800">
                <li>Répondre aux questions sur vos services</li>
                <li>Donner vos horaires d'ouverture</li>
                <li>Qualifier correctement les prospects</li>
                <li>Prendre des rendez-vous efficacement</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Retour
              </button>
              <button
                onClick={confirmSkip}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Passer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Comment Assistant va-t-elle apprendre sur vous ?
        </h2>
        <p className="text-gray-600 mb-8">
          Choisissez la méthode la plus simple pour vous.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Option 1 : Site web */}
          <button
            onClick={() => setSelectedMethod('website')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-md transition-all text-center"
          >
            <Globe className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold text-black mb-2">J'ai un site web</h3>
            <p className="text-sm text-gray-600 mb-4">
              Assistant analyse automatiquement votre site
            </p>
            <span className="text-xs text-gray-500">⏱️ 2 minutes</span>
          </button>

          {/* Option 2 : Documents */}
          <button
            onClick={() => setSelectedMethod('upload')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-md transition-all text-center"
          >
            <Upload className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold text-black mb-2">J'ai des documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Uploadez vos PDF, DOCX, TXT
            </p>
            <span className="text-xs text-gray-500">⏱️ 1 minute</span>
          </button>

          {/* Option 3 : Assistant */}
          <button
            onClick={() => setSelectedMethod('assistant')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-md transition-all text-center"
          >
            <MessageSquare className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold text-black mb-2">Je n'ai rien</h3>
            <p className="text-sm text-gray-600 mb-4">
              Assistant vous pose 5 questions essentielles
            </p>
            <span className="text-xs text-gray-500">⏱️ 3 minutes</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={handleSkip}
            className="text-gray-600 hover:text-black transition-colors text-sm"
          >
             Je ferai ça depuis le dashboard
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // Vue Website
  if (selectedMethod === 'website') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Analysons votre site web
        </h2>
        <p className="text-gray-600 mb-8">
          Assistant va extraire automatiquement vos services, horaires et FAQ.
        </p>

        {!crawling ? (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                URL de votre site web *
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.votre-site.fr"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={handleWebsiteCrawl}
                disabled={!websiteUrl}
                className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Analyser mon site →
              </button>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Loader2 className="w-12 h-12 text-black mx-auto mb-4 animate-spin" />
            <p className="text-gray-700 font-medium mb-2">Assistant explore votre site...</p>
            <p className="text-sm text-gray-600">Cela peut prendre quelques instants</p>
          </div>
        )}
      </div>
    );
  }

  // Vue Upload
  if (selectedMethod === 'upload') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Uploadez vos documents
        </h2>
        <p className="text-gray-600 mb-8">
          Assistant lira vos PDF, DOCX, TXT pour apprendre sur votre entreprise.
        </p>

        <div className="mb-6">
          <label className="block w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-black transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Glissez-déposez vos fichiers ici
              </p>
              <p className="text-sm text-gray-500">
                ou cliquez pour parcourir
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Formats acceptés : PDF, DOCX, TXT
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md p-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setSelectedMethod(null)}
            disabled={uploading}
            className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            ← Retour
          </button>
          <button
            onClick={handleContinueWithFiles}
            disabled={uploadedFiles.length === 0 || uploading}
            className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Upload en cours...' : `Continuer avec ${uploadedFiles.length} fichier${uploadedFiles.length > 1 ? 's' : ''} →`}
          </button>
        </div>
      </div>
    );
  }

  // Vue Assistant
  if (selectedMethod === 'assistant') {
    // Intro - Présentation
    if (assistantStep === 'intro') {
      return (
        <div>
          <h2 className="text-2xl font-bold text-black mb-2">
            Assistant va vous poser quelques questions
          </h2>
          <p className="text-gray-600 mb-8">
            En 3 minutes, Assistant va construire automatiquement votre base de connaissances.
          </p>

          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-black mb-2">Comment ça marche ?</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">1.</span>
                    <span>Assistant vous pose {questions.length} questions sur votre activité</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">2.</span>
                    <span>Vous répondez librement en quelques phrases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">3.</span>
                    <span>Assistant génère automatiquement 3-5 documents structurés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">4.</span>
                    <span>Votre Knowledge Base est prête à l'emploi !</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setSelectedMethod(null)}
              className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={handleStartAssistant}
              className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Commencer →
            </button>
          </div>
        </div>
      );
    }

    // Questions - Interface conversationnelle
    if (assistantStep === 'questions' && questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex === questions.length - 1;
      const currentAnswer = answers[currentQuestion.id] || '';
      const canContinue = currentQuestion.required ? currentAnswer.trim().length > 0 : true;

      return (
        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">
                Question {currentQuestionIndex + 1} / {questions.length}
              </h2>
              <div className="text-sm text-gray-600">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% complété
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Message Assistant */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-black mb-1">Assistant</div>
                <p className="text-gray-900 mb-2">{currentQuestion.text}</p>
                {currentQuestion.hint && (
                  <p className="text-sm text-gray-600 italic">💡 {currentQuestion.hint}</p>
                )}
              </div>
            </div>
          </div>

          {/* Zone de réponse */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Votre réponse {currentQuestion.required && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
            {currentQuestion.required && !currentAnswer.trim() && (
              <p className="text-sm text-red-600 mt-1">Cette question est obligatoire</p>
            )}
          </div>

          {/* Questions précédentes répondues */}
          {currentQuestionIndex > 0 && (
            <details className="mb-6">
              <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                Voir mes réponses précédentes ({currentQuestionIndex})
              </summary>
              <div className="mt-3 space-y-3">
                {questions.slice(0, currentQuestionIndex).map((q, idx) => (
                  <div key={q.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{q.text}</p>
                        <p className="text-sm text-gray-700 mt-1">{answers[q.id]}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Boutons navigation */}
          <div className="flex gap-4">
            <button
              onClick={currentQuestionIndex === 0 ? () => setSelectedMethod(null) : handlePreviousQuestion}
              className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
            >
              ← {currentQuestionIndex === 0 ? 'Retour' : 'Précédent'}
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={!canContinue}
              className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLastQuestion ? (
                <>
                  <Send className="w-4 h-4" />
                  Générer ma Knowledge Base
                </>
              ) : (
                <>
                  Question suivante
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    // Génération - Loader avec animation et progrès dynamique
    if (assistantStep === 'generating') {
      const isSuccess = generationProgress.includes('✓');

      return (
        <div className="text-center py-12">
          <div className="mb-6">
            {isSuccess ? (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : (
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-black"></div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-black mb-3">
            {isSuccess ? 'Knowledge Base créée !' : 'Assistant génère votre Knowledge Base...'}
          </h2>
          <p className="text-gray-600 mb-8">
            {isSuccess ? 'Redirection vers le récapitulatif' : 'Création automatique de vos documents en cours'}
          </p>
          <div className="max-w-md mx-auto">
            <div className={`flex items-center gap-3 text-left p-4 rounded-lg ${
              isSuccess ? 'bg-green-50 border border-green-200' : 'bg-purple-50 border border-purple-200'
            }`}>
              {!isSuccess && <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />}
              <span className={`text-sm font-medium ${isSuccess ? 'text-green-900' : 'text-purple-900'}`}>
                {generationProgress || 'Initialisation...'}
              </span>
            </div>
          </div>
        </div>
      );
    }
  }

  // Modal Warning Skip
  return (
    <>
      {showSkipWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6 shadow-xl">
            {/* Icon warning */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Titre */}
            <h3 className="text-xl font-bold text-center text-black mb-3">
              Êtes-vous sûr de vouloir passer cette étape ?
            </h3>

            {/* Message warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900 font-medium mb-3">
                ⚠️ Sans Knowledge Base, Assistant ne pourra pas :
              </p>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>Répondre aux questions sur vos services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>Donner vos horaires d'ouverture</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>Qualifier correctement les prospects</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>Prendre des rendez-vous efficacement</span>
                </li>
              </ul>
            </div>

            {/* Incitation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900">
                <strong>💡 C'est rapide !</strong> Configurez votre KB en seulement <strong>2 minutes</strong> avec l'option "J'ai un site web".
              </p>
            </div>

            {/* Info Auto-Builder */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-purple-900">
                <strong>🤖 Auto-Builder</strong> : Si vous passez maintenant, Assistant utilisera l'Auto-Builder pour apprendre de vos premiers appels et construire sa KB automatiquement.
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                ← Retour
              </button>
              <button
                onClick={confirmSkip}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Passer (Auto-Builder)
              </button>
            </div>

            {/* Note */}
            <p className="text-xs text-center text-gray-500 mt-4">
              L'Auto-Builder analysera vos appels pour détecter les lacunes et suggérer du contenu
            </p>
          </div>
        </div>
      )}
    </>
  );
}

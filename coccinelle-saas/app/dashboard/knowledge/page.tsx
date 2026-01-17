'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Database, Upload, MessageSquare, Send, Loader2, BookOpen, CheckCircle, ExternalLink, Brain } from 'lucide-react';
import Link from 'next/link';
import BusinessKnowledgeView from '../../../src/components/dashboard/BusinessKnowledgeView';
import Logo from '../../../src/components/Logo';
import { isDemoMode, mockCalls, mockAppointments, mockDocuments } from '../../../lib/mockData';
import { buildApiUrl, getAuthHeaders, getCurrentTenantId, getTenantStorageKey, migrateOldDocuments } from '../../../lib/config';
import { processLocalCrawl } from '../../../lib/crawl-processor';

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'test' | 'builder'>('upload');

  // Upload states
  const [uploadMode, setUploadMode] = useState<'crawl' | 'manual' | 'file' | 'google'>('google');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Crawler preview states
  const [crawlProgress, setCrawlProgress] = useState<{
    status: 'idle' | 'crawling' | 'preview' | 'done';
    pages: any[];
    currentPage: number;
    totalPages: number;
  }>({ status: 'idle', pages: [], currentPage: 0, totalPages: 0 });
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [maxPages, setMaxPages] = useState(10);
  const [maxDepth, setMaxDepth] = useState(2);
  const [isDragging, setIsDragging] = useState(false);

  // Test states
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [useAI, setUseAI] = useState(true);
  const [rateLimit, setRateLimit] = useState<any>(null);

  // Auto-Builder states
  const [documents, setDocuments] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Charger les données pour l'Auto-Builder
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { loadKnowledgeData } = await import('../../../lib/knowledge-handlers');
      await loadKnowledgeData(setDocuments, setCalls, setAppointments);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const { deleteDocument } = await import('../../../lib/knowledge-handlers');
    deleteDocument(docId);
    loadData();
  };

  const handleStructureWithAI = async () => {
    if (documents.length === 0) {
      alert('Aucun document à structurer');
      return;
    }

    const crawledDocs = documents.filter(doc => doc.sourceType === 'crawl');
    if (crawledDocs.length === 0) {
      alert('Aucune page crawlée à structurer');
      return;
    }

    if (!confirm(`Voulez-vous structurer ${crawledDocs.length} page(s) crawlée(s) avec l'IA ?\n\nCela créera des documents structurés (Contact, Services, Horaires, etc.) et les pages brutes seront conservées.`)) {
      return;
    }

    setDataLoading(true);

    try {
      const { structureWithAI } = await import('../../../lib/knowledge-handlers');
      const data = await structureWithAI(documents);

      alert(`✅ Succès !\n\n${data.structuredDocuments.length} document(s) structuré(s) créé(s) depuis ${data.originalCount} page(s).\n\nVous pouvez maintenant voir vos informations business organisées par catégorie !`);

      await loadData();
    } catch (error) {
      console.error('❌ Erreur structuration:', error);
      alert(`❌ Erreur lors de la structuration:\n${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddInformation = async (category: string, data: any) => {
    const { saveManualInformation } = await import('../../../lib/knowledge-handlers');
    saveManualInformation(category, data);
    loadData();
    alert(`✅ Information ajoutée avec succès !`);
  };

  const handleCrawl = async () => {
    if (!url.trim()) return;

    setUploadLoading(true);
    setUploadStatus({ type: 'success', message: '🔍 Exploration du site en cours...' });
    setCrawlProgress({ status: 'crawling', pages: [], currentPage: 0, totalPages: 0 });

    try {
      const { crawlWebsite, saveCrawledPages } = await import('../../../lib/knowledge-handlers');

      const validPages = await crawlWebsite(url, maxPages, maxDepth);

      setUploadStatus({
        type: 'success',
        message: `📊 ${validPages.length} pages analysées. Structuration en cours...`
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalDocs = saveCrawledPages(validPages);
      console.log('🔄 Données rechargées');

      setUploadStatus({
        type: 'success',
        message: `✅ ${finalDocs.length} document(s) créé(s) depuis ${validPages.length} pages`
      });
      setUrl('');
      setCrawlProgress({ status: 'done', pages: [], currentPage: 0, totalPages: 0 });

      await loadData();
      setActiveTab('builder');

      setTimeout(() => {
        setCrawlProgress({ status: 'idle', pages: [], currentPage: 0, totalPages: 0 });
        setUploadStatus(null);
      }, 4000);
    } catch (error) {
      console.error('❌ Erreur crawl:', error);
      setUploadStatus({
        type: 'error',
        message: 'Erreur lors du crawl: ' + (error instanceof Error ? error.message : 'Erreur inconnue')
      });
      setCrawlProgress({ status: 'idle', pages: [], currentPage: 0, totalPages: 0 });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirmCrawl = async () => {
    const selectedPagesArray = crawlProgress.pages.filter((_: any, index: number) =>
      selectedPages.has(index.toString())
    );

    if (selectedPagesArray.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Sélectionnez au moins une page'
      });
      return;
    }

    try {
      // Traiter les pages pour créer des documents structurés
      setUploadLoading(true);
      setUploadStatus({
        type: 'success',
        message: 'Structuration du contenu en cours...'
      });

      // Utiliser le processeur local pour structurer les pages
      const structuredDocs = processLocalCrawl(selectedPagesArray);

      // Convertir en format de document
      const finalDocs = structuredDocs.map((doc: any, index: number) => ({
        id: `doc_crawl_${Date.now()}_${index}`,
        title: doc.title,
        content: doc.content,
        category: doc.category,
        created_at: new Date().toISOString(),
        sourceType: 'crawl'
      }));

      const existingDocs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
      const allDocs = [...existingDocs, ...finalDocs];
      localStorage.setItem(getTenantStorageKey('kb_documents'), JSON.stringify(allDocs));

      setUploadStatus({
        type: 'success',
        message: `${finalDocs.length} document(s) structuré(s) ajouté(s) (${selectedPagesArray.length} pages analysées)`
      });
      setUrl('');
      setCrawlProgress({ status: 'done', pages: [], currentPage: 0, totalPages: 0 });
      setSelectedPages(new Set());
      await loadData();

      // Reset après 3 secondes
      setTimeout(() => {
        setCrawlProgress({ status: 'idle', pages: [], currentPage: 0, totalPages: 0 });
        setUploadStatus(null);
        setUploadLoading(false);
      }, 3000);
    } catch (storageError) {
      setUploadStatus({
        type: 'error',
        message: 'Erreur lors de la structuration. Réessayez.'
      });
      setUploadLoading(false);
    }
  };

  const togglePageSelection = (index: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPages(newSelected);
  };

  const handleManualUpload = async () => {
    if (!title.trim() || !content.trim()) return;

    setUploadLoading(true);
    setUploadStatus(null);

    try {
      const { uploadManualDocument } = await import('../../../lib/knowledge-handlers');
      await uploadManualDocument(title, content);

      setUploadStatus({ type: 'success', message: 'Document ajouté avec succès !' });
      setTitle('');
      setContent('');
      await loadData();
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erreur lors de l\'ajout' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGoogleImport = async () => {
    if (!url.trim()) return;

    setUploadLoading(true);
    setUploadStatus({ type: 'success', message: '📍 Import depuis Google en cours...' });

    try {
      const { importFromGoogle } = await import('../../../lib/knowledge-handlers');
      const { documents, businessData } = await importFromGoogle(url);

      setUploadStatus({
        type: 'success',
        message: `✅ ${documents.length} document(s) importé(s) depuis ${businessData?.name || 'Google'}`
      });
      setUrl('');

      await loadData();
      setActiveTab('builder');

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      console.error('❌ Erreur import Google:', error);
      setUploadStatus({
        type: 'error',
        message: 'Erreur lors de l\'import Google: ' + (error instanceof Error ? error.message : 'Erreur inconnue')
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploadLoading(true);
    setUploadStatus(null);

    try {
      console.log('📤 Upload du fichier:', selectedFile.name);

      // Vérifier la taille du fichier (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'Le fichier est trop volumineux (max 10MB)' });
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tenantId', getCurrentTenantId());

      const response = await fetch(buildApiUrl('/api/knowledge/documents/upload'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erreur API ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.document) {
        const existingDocs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
        localStorage.setItem(getTenantStorageKey('kb_documents'), JSON.stringify([...existingDocs, data.document]));

        setUploadStatus({
          type: 'success',
          message: 'Fichier importé'
        });
        setSelectedFile(null);
        await loadData();
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Erreur lors de l\'import'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    setTestLoading(true);
    const currentQuestion = question;
    setQuestion('');

    try {
      const { askKnowledgeBase } = await import('../../../lib/knowledge-handlers');
      const data = await askKnowledgeBase(currentQuestion, documents, useAI);

      setAnswer(data);
      setRateLimit(data.rateLimit);
      setHistory(prev => [{ question: currentQuestion, answer: data }, ...prev].slice(0, 5));
    } catch (error) {
      setAnswer({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la recherche'
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size={48} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'builder' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            Auto-Builder
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'upload' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Ajouter des documents
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'test' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Tester le RAG
          </button>
        </div>

        {/* Auto-Builder Tab */}
        {activeTab === 'builder' && (
          <div>
            {dataLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Chargement des données...</p>
              </div>
            ) : (
              <BusinessKnowledgeView
                documents={documents}
                onDocumentDelete={handleDeleteDocument}
                onStructureWithAI={handleStructureWithAI}
                onAddInformation={handleAddInformation}
              />
            )}
          </div>
        )}

        {/* Content Upload */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Ajouter un document</h3>
            
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setUploadMode('google')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === 'google' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Google Business
              </button>
              <button
                onClick={() => setUploadMode('crawl')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'crawl' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Database className="w-4 h-4" />
                Crawler une URL
              </button>
              <button
                onClick={() => setUploadMode('file')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'file' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Importer un fichier
              </button>
              <button
                onClick={() => setUploadMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'manual' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Ajouter manuellement
              </button>
            </div>

            {uploadMode === 'google' ? (
              <div className="space-y-6">
                {/* Import Google Business */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Importer depuis Google Business</h4>
                      <p className="text-sm text-gray-700 mb-4">
                        Importez automatiquement les informations de votre fiche Google (adresse, horaires, services, etc.)
                      </p>

                      <div className="bg-white/60 rounded-lg p-4 mb-4 border border-blue-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">📍 URLs acceptées :</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Google Maps : <code className="bg-white px-1 py-0.5 rounded">maps.google.com/...</code></li>
                          <li>• Google Search : <code className="bg-white px-1 py-0.5 rounded">google.com/search?q=...</code></li>
                          <li>• Fiche établissement Google directe</li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://www.google.com/maps/place/..."
                          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white"
                        />

                        <button
                          onClick={handleGoogleImport}
                          disabled={uploadLoading || !url.trim() || !url.includes('google.com')}
                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/30 transition-all"
                        >
                          {uploadLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Import en cours...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                              </svg>
                              Importer depuis Google
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : uploadMode === 'crawl' ? (
              <div className="space-y-6">
                {/* Configuration du crawler */}
                {crawlProgress.status === 'idle' && (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">URL à crawler</label>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>

                      {/* Options avancées */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Pages max</label>
                          <input
                            type="number"
                            value={maxPages}
                            onChange={(e) => setMaxPages(Number(e.target.value))}
                            min="1"
                            max="50"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Profondeur</label>
                          <input
                            type="number"
                            value={maxDepth}
                            onChange={(e) => setMaxDepth(Number(e.target.value))}
                            min="1"
                            max="5"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Le crawler va analyser {maxPages} pages max avec une profondeur de {maxDepth} niveau{maxDepth > 1 ? 'x' : ''}
                      </p>
                    </div>

                    <button
                      onClick={handleCrawl}
                      disabled={uploadLoading || !url.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/30 transition-all"
                    >
                      {uploadLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                      {uploadLoading ? 'Exploration en cours...' : 'Lancer l\'exploration'}
                    </button>
                  </>
                )}

                {/* Preview des pages trouvées */}
                {crawlProgress.status === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{crawlProgress.totalPages} pages trouvées</p>
                          <p className="text-sm text-gray-600">{selectedPages.size} sélectionnées</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPages(new Set(crawlProgress.pages.map((_, i) => i.toString())))}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => setSelectedPages(new Set())}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Tout déselectionner
                        </button>
                      </div>
                    </div>

                    {/* Liste des pages */}
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {crawlProgress.pages.map((page, index) => (
                        <div
                          key={index}
                          role="button"
                          tabIndex={0}
                          className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                            selectedPages.has(index.toString())
                              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400'
                              : 'bg-white border-gray-200'
                          }`}
                          onClick={() => togglePageSelection(index.toString())}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePageSelection(index.toString()); }}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedPages.has(index.toString())}
                              onChange={() => togglePageSelection(index.toString())}
                              className="mt-1 w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{page.title}</h4>
                              <a
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {page.url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{page.content.substring(0, 150)}...</p>
                              <p className="text-xs text-gray-500 mt-2">{page.content.length} caractères</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setCrawlProgress({ status: 'idle', pages: [], currentPage: 0, totalPages: 0 });
                          setSelectedPages(new Set());
                        }}
                        className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleConfirmCrawl}
                        disabled={selectedPages.size === 0}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Importer {selectedPages.size} page{selectedPages.size > 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                )}

                {/* Success state */}
                {crawlProgress.status === 'done' && uploadStatus?.type === 'success' && (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Import réussi !</h3>
                    <p className="text-gray-600">{uploadStatus.message}</p>
                  </div>
                )}
              </div>
            ) : uploadMode === 'file' ? (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) setSelectedFile(file);
                  }}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 scale-105 shadow-xl'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className={`transition-all duration-300 ${isDragging ? 'scale-110' : 'scale-100'}`}>
                    <Upload className={`w-16 h-16 mx-auto mb-4 transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                    {isDragging ? (
                      <p className="text-lg font-semibold text-blue-900 mb-2">Déposez le fichier ici !</p>
                    ) : (
                      <>
                        <label className="cursor-pointer">
                          <span className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            Glissez-déposez ou cliquez pour sélectionner
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                        <p className="text-sm text-gray-500 mt-3">PDF, TXT, DOC, DOCX</p>
                        <p className="text-xs text-gray-400 mt-1">Taille max: 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {selectedFile && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-600">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFileUpload}
                  disabled={uploadLoading || !selectedFile}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-purple-500/30 transition-all"
                >
                  {uploadLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {uploadLoading ? 'Import en cours...' : 'Importer le fichier'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du document"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Contenu du document..."
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">URL (optionnel)</p>
                </div>
                <button
                  onClick={handleManualUpload}
                  disabled={uploadLoading || !title.trim() || !content.trim()}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadLoading ? 'Ajout en cours...' : 'Ajouter le document'}
                </button>
              </div>
            )}

            {uploadStatus && (
              <div className={`mt-4 p-4 rounded-lg border ${uploadStatus.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 ${uploadStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
                  <p className={`text-sm ${uploadStatus.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>{uploadStatus.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Test - RAG Interface */}
        {activeTab === 'test' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main chat area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Input area */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Assistant Knowledge Base</h3>
                        {answer?.mode === 'ai' && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full animate-pulse">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{documents.length} documents indexés</p>
                    </div>
                  </div>

                  {/* AI Toggle & Rate Limit */}
                  <div className="flex items-center gap-4">
                    {rateLimit && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">{rateLimit.remaining}</span> requêtes restantes
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-700">Mode IA</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={useAI}
                          onChange={(e) => setUseAI(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !testLoading && handleAsk()}
                    placeholder="Posez votre question..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    disabled={testLoading}
                  />
                  <button
                    onClick={handleAsk}
                    disabled={testLoading || !question.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-blue-500/30 transition-all"
                  >
                    {testLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Answer area */}
              {answer && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-gray-900">Réponse</h3>
                        {answer.confidence > 0 && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            answer.confidence > 0.7 ? 'bg-green-100 text-green-700' :
                            answer.confidence > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            Confiance: {(answer.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{answer.answer}</p>

                      {/* Sources */}
                      {answer.sources && answer.sources.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            <p className="font-medium text-gray-900">Sources ({answer.sources.length})</p>
                          </div>
                          <div className="space-y-3">
                            {answer.sources.map((source: any, idx: number) => (
                              <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900 text-sm">{source.title}</h4>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                                    {source.confidence}% match
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{source.excerpt}</p>
                                {source.url && (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Voir la source
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - History */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-8">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Historique récent
                </h3>
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Aucune question posée</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {history.map((item, idx) => (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all group"
                        onClick={() => {
                          setQuestion(item.question);
                          setAnswer(item.answer);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setQuestion(item.question); setAnswer(item.answer); } }}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {item.question}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 pl-6">
                          {item.answer.answer.substring(0, 100)}...
                        </p>
                        {item.answer.sources && item.answer.sources.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 pl-6">
                            <BookOpen className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{item.answer.sources.length} source{item.answer.sources.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

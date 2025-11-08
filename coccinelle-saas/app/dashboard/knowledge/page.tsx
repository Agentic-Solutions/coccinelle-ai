'use client';

import { useState } from 'react';
import { ArrowLeft, Database, Upload, MessageSquare, Send, Loader2, BookOpen, CheckCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'test'>('upload');
  
  // Upload states
  const [uploadMode, setUploadMode] = useState<'crawl' | 'manual'>('crawl');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Test states
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const handleCrawl = async () => {
    if (!url.trim()) return;
    setUploadLoading(true);
    setUploadStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/knowledge/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl: url, tenantId: 'agent-demo-001', maxPages: 10, maxDepth: 2 })
      });

      if (!response.ok) throw new Error('Erreur crawl');
      const data = await response.json();
      setUploadStatus({ type: 'success', message: `Crawl démarré ! ID: ${data.jobId}` });
      setUrl('');
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erreur lors du crawl' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleManualUpload = async () => {
    if (!title.trim() || !content.trim()) return;
    setUploadLoading(true);
    setUploadStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/knowledge/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tenantId: 'agent-demo-001', sourceType: 'manual' })
      });

      if (!response.ok) throw new Error('Erreur ajout');
      setUploadStatus({ type: 'success', message: 'Document ajouté avec succès !' });
      setTitle('');
      setContent('');
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erreur lors de l\'ajout' });
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
      const response = await fetch(`${API_URL}/api/v1/knowledge/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion, tenantId: 'agent-demo-001', maxResults: 3 })
      });

      if (!response.ok) throw new Error('Erreur API');
      const data = await response.json();
      setAnswer(data);
      setHistory(prev => [{ question: currentQuestion, answer: data }, ...prev].slice(0, 3));
    } catch (error) {
      console.error('Erreur:', error);
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
            Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
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

        {/* Content Upload */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Ajouter un document</h3>
            
            <div className="flex gap-2 mb-6">
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
                onClick={() => setUploadMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'manual' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Ajouter manuellement
              </button>
            </div>

            {uploadMode === 'crawl' ? (
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
                  <p className="text-xs text-gray-500 mt-2">Le système va crawler cette page et les pages liées (max 3 pages)</p>
                </div>
                <button
                  onClick={handleCrawl}
                  disabled={uploadLoading || !url.trim()}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadLoading ? 'Crawl en cours...' : 'Démarrer le crawl'}
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

        {/* Content Test */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Posez une question</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Ex: Quels sont les biens disponibles ?"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  disabled={testLoading}
                />
                <button
                  onClick={handleAsk}
                  disabled={testLoading || !question.trim()}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {answer && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">Réponse</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{answer.answer}</p>
                    {answer.sources && answer.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Sources ({answer.sources.length}) :</p>
                        <div className="space-y-2">
                          {answer.sources.map((source: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                              <BookOpen className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600">{source.content.substring(0, 100)}...</p>
                                {source.url && (
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                    <ExternalLink className="w-3 h-3" />{source.url}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Historique récent</h3>
                <div className="space-y-3">
                  {history.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm font-medium text-gray-900 mb-1">Q: {item.question}</p>
                      <p className="text-sm text-gray-600">{item.answer.answer.substring(0, 150)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

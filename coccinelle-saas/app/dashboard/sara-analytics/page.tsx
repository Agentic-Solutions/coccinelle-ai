'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Phone, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Logo from '../../../src/components/Logo';
import CallFunnelComponent from '../../../src/components/dashboard/CallFunnel';
import CallPerformanceComponent from '../../../src/components/dashboard/CallPerformance';
import CallInsights from '../../../src/components/dashboard/CallInsights';
import { analyzeSara, generateDemoCallEvents } from '../../../lib/sara-analytics';
import { isDemoMode, mockCalls } from '../../../lib/mockData';

export default function SaraAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'funnel' | 'performance' | 'insights'>('funnel');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Mode démo - utiliser données simulées
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800));

        // Générer des événements d'appels basés sur mockCalls
        const events = generateDemoCallEvents(mockCalls.length);

        // Analyser avec le moteur Sara Analytics
        const result = analyzeSara({
          events,
          calls: mockCalls
        });

        setAnalytics(result);
        setLoading(false);
        return;
      }

      // Mode production - fetch real data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sara/analytics`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Analyse des performances de Sara...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <Logo size={48} />
              <div>
                <h1 className="text-2xl font-bold">Sara Analytics</h1>
                <p className="text-sm text-gray-600">Performance des appels entrants</p>
              </div>
            </div>

            <button
              onClick={loadAnalytics}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Résumé avec score */}
        {analytics && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-3xl font-bold text-gray-900">Score : {analytics.score}/100</h2>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    analytics.score >= 80 ? 'bg-green-100 text-green-700' :
                    analytics.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    analytics.score >= 40 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {analytics.score >= 80 ? 'Excellent' :
                     analytics.score >= 60 ? 'Bien' :
                     analytics.score >= 40 ? 'Moyen' : 'Faible'}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">
                  {analytics.score >= 80
                    ? 'Sara performe excellemment sur les appels entrants.'
                    : analytics.score >= 60
                    ? 'Bonne performance avec des optimisations possibles.'
                    : 'Des améliorations significatives sont recommandées.'}
                </p>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Taux de prise en charge</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.funnel.rates.handleRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Conversion RDV</p>
                    <p className="text-2xl font-bold text-green-600">{analytics.funnel.rates.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">RDV créés</p>
                    <p className="text-2xl font-bold text-green-600">{analytics.funnel.rdvCreated}</p>
                  </div>
                </div>
              </div>

              {/* Score circulaire */}
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#E5E7EB"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={
                      analytics.score >= 80 ? '#10B981' :
                      analytics.score >= 60 ? '#F59E0B' :
                      analytics.score >= 40 ? '#F97316' : '#EF4444'
                    }
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(analytics.score / 100) * 351.86} 351.86`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{analytics.score}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => setActiveTab('funnel')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'funnel'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Funnel d'appels
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'performance'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'insights'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recommandations
              {analytics && analytics.insights.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {analytics.insights.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        {analytics && (
          <div>
            {activeTab === 'funnel' && (
              <CallFunnelComponent funnel={analytics.funnel} />
            )}

            {activeTab === 'performance' && (
              <CallPerformanceComponent performance={analytics.performance} />
            )}

            {activeTab === 'insights' && (
              <CallInsights
                insights={analytics.insights}
                score={analytics.score}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

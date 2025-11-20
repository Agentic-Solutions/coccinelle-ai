'use client';

import { useEffect, useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  ArrowRight,
  Sparkles,
  Target,
  DollarSign
} from 'lucide-react';
import { analyzeData, type AIAnalysis, type Insight } from '../../../lib/ai-insights';
import Link from 'next/link';

interface AIInsightsPanelProps {
  calls: any[];
  appointments: any[];
  documents?: any[];
}

export default function AIInsightsPanel({ calls, appointments, documents }: AIInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Analyse les données
    const result = analyzeData({ calls, appointments, documents });
    setAnalysis(result);
    setLoading(false);
  }, [calls, appointments, documents]);

  if (loading || !analysis) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Coccinelle AI Insights</h3>
            <p className="text-sm text-gray-600">Analyse en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Très Bon';
    if (score >= 70) return 'Bon';
    if (score >= 60) return 'Moyen';
    return 'À Améliorer';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <div className="w-4 h-4 text-gray-400">→</div>;
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getInsightBg = (type: Insight['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec Score Global */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-lg">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Coccinelle AI Insights
                <Sparkles className="w-5 h-5" />
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                Analyse intelligente et recommandations temps réel
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getScoreColor(analysis.score)} font-bold text-lg`}>
              <Target className="w-5 h-5" />
              {analysis.score}/100
            </div>
            <p className="text-sm text-purple-100 mt-1">{getScoreLabel(analysis.score)}</p>
          </div>
        </div>

        {/* Tendances */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-purple-100">Appels</span>
              {getTrendIcon(analysis.trends.calls)}
            </div>
            <p className="text-xl font-bold">{calls.length}</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-purple-100">RDV</span>
              {getTrendIcon(analysis.trends.appointments)}
            </div>
            <p className="text-xl font-bold">{appointments.length}</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-purple-100">Conversion</span>
              {getTrendIcon(analysis.trends.conversion)}
            </div>
            <p className="text-xl font-bold">
              {calls.length > 0 ? ((appointments.length / calls.length) * 100).toFixed(1) : 0}%
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-purple-100">Revenue</span>
              {getTrendIcon(analysis.trends.revenue)}
            </div>
            <p className="text-xl font-bold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {analysis.predictions.expectedRevenue}
            </p>
          </div>
        </div>
      </div>

      {/* Prédictions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Prédictions IA - Semaine Prochaine</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">RDV Attendus</p>
            <p className="text-3xl font-bold text-purple-600">{analysis.predictions.nextWeekAppointments}</p>
            <p className="text-xs text-gray-500 mt-1">Basé sur tendance actuelle</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Revenue Estimé</p>
            <p className="text-3xl font-bold text-green-600">${analysis.predictions.expectedRevenue}</p>
            <p className="text-xs text-gray-500 mt-1">Prédiction ML</p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Risque No-Show</p>
            <p className="text-3xl font-bold text-yellow-600">{analysis.predictions.noShowRisk}%</p>
            <p className="text-xs text-gray-500 mt-1">Activez rappels SMS</p>
          </div>
        </div>
      </div>

      {/* Insights & Recommandations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">
              Insights & Recommandations ({analysis.insights.length})
            </h3>
          </div>

          {analysis.insights.filter(i => i.type === 'critical').length > 0 && (
            <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {analysis.insights.filter(i => i.type === 'critical').length} Action{analysis.insights.filter(i => i.type === 'critical').length > 1 ? 's' : ''} Urgente{analysis.insights.filter(i => i.type === 'critical').length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {analysis.insights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">Aucun problème détecté ! Tout fonctionne parfaitement.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightBg(insight.type)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getInsightIcon(insight.type)}</div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-700">{insight.description}</p>

                        {insight.metrics && (
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-gray-600">
                              Actuel: <span className="font-semibold">{insight.metrics.current.toFixed(1)}</span>
                            </span>
                            {insight.metrics.target && (
                              <span className="text-gray-600">
                                Objectif: <span className="font-semibold">{insight.metrics.target}</span>
                              </span>
                            )}
                            {insight.metrics.change !== undefined && (
                              <span className={insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'}>
                                {insight.metrics.change > 0 ? '+' : ''}{insight.metrics.change.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                          insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {insight.impact === 'high' ? 'Impact Élevé' :
                           insight.impact === 'medium' ? 'Impact Moyen' :
                           'Impact Faible'}
                        </span>
                      </div>
                    </div>

                    {insight.action && (
                      <div className="mt-3">
                        {insight.actionUrl ? (
                          <Link
                            href={insight.actionUrl}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            {insight.action}
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        ) : (
                          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                            {insight.action}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Dernière analyse: {new Date().toLocaleTimeString('fr-FR')} •
          Propulsé par Coccinelle AI Engine
        </p>
      </div>
    </div>
  );
}

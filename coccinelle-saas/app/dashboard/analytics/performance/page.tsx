'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Target, Clock, ThumbsUp, TrendingUp, Loader2 } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface PerfStats {
  globalScore: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  topTopics: { topic: string; count: number }[];
}

export default function AnalyticsPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerfStats>({
    globalScore: 0,
    avgResolutionTime: 0,
    satisfactionScore: 0,
    topTopics: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [saraRes, overviewRes] = await Promise.all([
        fetch(buildApiUrl('/api/v1/analytics/sara?period=30d'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/api/v1/analytics/overview'), { headers: getAuthHeaders() }),
      ]);

      const sara = saraRes.ok ? await saraRes.json() : {};
      const overview = overviewRes.ok ? await overviewRes.json() : {};

      const convRate = sara.conversion_rate || 0;
      const avgDur = sara.avg_duration_seconds || 0;

      setStats({
        globalScore: Math.min(100, Math.round(convRate * 1.2 + (avgDur > 0 ? 20 : 0))),
        avgResolutionTime: avgDur,
        satisfactionScore: 0,
        topTopics: [
          { topic: 'Prise de rendez-vous', count: overview.total_appointments_month || 0 },
          { topic: 'Renseignements', count: sara.total_calls || 0 },
          { topic: 'Prospects qualifiés', count: overview.total_prospects || 0 },
        ].filter(t => t.count > 0),
      });
    } catch {
      // Keep defaults
    }
    setLoading(false);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-gray-900';
    if (score >= 50) return 'text-gray-700';
    return 'text-gray-500';
  }

  function getScoreBg(score: number): string {
    if (score >= 80) return 'bg-gray-900';
    if (score >= 50) return 'bg-gray-500';
    return 'bg-gray-300';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-gray-700" />
              Analytics — Performances
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Score global et performances de vos agents IA</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Global Score */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">Score global de l&apos;agent</h2>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={stats.globalScore >= 80 ? '#111827' : stats.globalScore >= 50 ? '#6B7280' : '#D1D5DB'}
                      strokeWidth="10"
                      strokeDasharray={`${(stats.globalScore / 100) * 327} 327`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${getScoreColor(stats.globalScore)}`}>
                      {stats.globalScore}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    {stats.globalScore >= 80
                      ? "Excellent ! Votre agent performe très bien."
                      : stats.globalScore >= 50
                      ? "Bon niveau. Quelques optimisations possibles."
                      : stats.globalScore > 0
                      ? "En progression. Ajustez les prompts pour de meilleurs résultats."
                      : "Pas encore de données. Les scores apparaîtront après les premiers appels."}
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Temps moyen de résolution</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgResolutionTime > 0 ? formatDuration(stats.avgResolutionTime) : '—'}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Satisfaction client</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.satisfactionScore > 0 ? `${stats.satisfactionScore}%` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Disponible prochainement</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Taux de conversion</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.globalScore > 0 ? `${Math.round(stats.globalScore * 0.8)}%` : '—'}
                </p>
              </div>
            </div>

            {/* Top Topics */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Sujets les plus traités</h2>
              </div>
              {stats.topTopics.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune donnée disponible.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.topTopics.map((topic, i) => {
                    const max = Math.max(...stats.topTopics.map(t => t.count));
                    const pct = max > 0 ? (topic.count / max) * 100 : 0;
                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-4">
                        <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{topic.topic}</p>
                          <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${getScoreBg(pct)}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">{topic.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

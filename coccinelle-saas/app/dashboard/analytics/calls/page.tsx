'use client';

import { useState, useEffect } from 'react';
import { Phone, Clock, TrendingUp, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface CallStats {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
  successRate: number;
}

interface CallEntry {
  id: string;
  date: string;
  duration: number;
  status: 'success' | 'failed' | 'no_answer';
  phone: string;
}

export default function AnalyticsCallsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CallStats>({ total: 0, successful: 0, failed: 0, avgDuration: 0, successRate: 0 });
  const [calls, setCalls] = useState<CallEntry[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/analytics/sara?period=${period}`), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          total: data.total_calls || 0,
          successful: data.successful_calls || 0,
          failed: (data.total_calls || 0) - (data.successful_calls || 0),
          avgDuration: data.avg_duration_seconds || 0,
          successRate: data.conversion_rate || 0,
        });
        const callsList = (data.calls_by_day || []).map((d: any, i: number) => ({
          id: `call-${i}`,
          date: d.day,
          duration: 0,
          status: 'success' as const,
          phone: '',
        }));
        setCalls(callsList);
      }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-6 h-6 text-gray-700" />
                Analytics — Appels
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Métriques et historique des appels de vos agents</p>
            </div>
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    period === p ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
                </button>
              ))}
            </div>
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
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Total appels</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Réussis</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.successful}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Taux succès</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Durée moyenne</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
              </div>
            </div>

            {/* Call History */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Appels par jour</h2>
              </div>
              {calls.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucun appel sur cette période.</p>
                  <p className="text-sm mt-1">Les données apparaîtront après les premiers appels de vos agents.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {calls.map(call => (
                    <div key={call.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${call.status === 'success' ? 'bg-gray-900' : call.status === 'failed' ? 'bg-gray-400' : 'bg-gray-300'}`} />
                        <span className="text-sm text-gray-900">{new Date(call.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      </div>
                      <span className="text-sm text-gray-500">{call.status === 'success' ? 'Réussi' : call.status === 'failed' ? 'Échoué' : 'Non répondu'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

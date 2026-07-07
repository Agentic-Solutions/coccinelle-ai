'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Clock, TrendingUp, CheckCircle, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface CallStats {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
  successRate: number;
  inbound: number;
  outbound: number;
}

interface CallEntry {
  id: string;
  from_number: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration: number;
  prospect_name: string | null;
  summary: string | null;
  created_at: string;
}

export default function AnalyticsCallsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CallStats>({ total: 0, successful: 0, failed: 0, avgDuration: 0, successRate: 0, inbound: 0, outbound: 0 });
  const [calls, setCalls] = useState<CallEntry[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, callsRes] = await Promise.all([
        fetch(buildApiUrl(`/api/v1/calls/stats?period=${period}`), { headers: getAuthHeaders() }).then(r => r.json()).catch(() => null),
        fetch(buildApiUrl(`/api/v1/calls?limit=50&period=${period}`), { headers: getAuthHeaders() }).then(r => r.json()).catch(() => null),
      ]);

      if (statsRes?.stats) {
        const s = statsRes.stats;
        const total = s.total_calls || 0;
        const completed = s.completed_calls || 0;
        setStats({
          total,
          successful: completed,
          failed: s.failed_calls || 0,
          avgDuration: s.avg_duration_seconds || 0,
          successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          inbound: s.inbound_calls || 0,
          outbound: s.outbound_calls || 0,
        });
      }

      if (callsRes?.calls) {
        setCalls(callsRes.calls);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des donnees');
    }
    setLoading(false);
  }

  function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m 00s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }

  function getCallIcon(direction: string, status: string) {
    if (status === 'failed' || status === 'no_answer' || status === 'busy' || status === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }
    if (direction === 'outbound') {
      return <PhoneOutgoing className="w-4 h-4 text-gray-500" />;
    }
    return <PhoneIncoming className="w-4 h-4 text-gray-700" />;
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      completed: 'Termine',
      ended: 'Termine',
      failed: 'Echoue',
      no_answer: 'Non repondu',
      busy: 'Occupe',
      missed: 'Manque',
      initiated: 'En cours',
    };
    return labels[status] || status;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-6 h-6 text-gray-700" />
                Appels
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Historique et statistiques des appels</p>
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-600">
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => loadData()} className="mt-3 text-sm text-gray-600 hover:text-gray-900 underline">
              Reessayer
            </button>
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
                  <span className="text-sm text-gray-500">Termines</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.successful}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Taux reponse</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-500">Duree moyenne</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
              </div>
            </div>

            {/* Call List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Historique des appels</h2>
              </div>
              {calls.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucun appel enregistre.</p>
                  <p className="text-sm mt-1">Les appels apparaitront apres les premieres conversations avec vos agents.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {calls.map(call => (
                    <div key={call.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCallIcon(call.direction, call.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {call.prospect_name || call.from_number || 'Inconnu'}
                            </span>
                            {call.prospect_name && call.from_number && (
                              <span className="text-xs text-gray-400">{call.from_number}</span>
                            )}
                          </div>
                          {call.summary && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-md">{call.summary}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatDuration(call.duration)}</span>
                        <span className="hidden sm:inline">{getStatusLabel(call.status)}</span>
                        <span className="text-xs">
                          {new Date(call.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <Link
                          href={`/dashboard/analytics/transcripts?call_id=${call.id}`}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
                          title="Voir la transcription"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Transcription</span>
                        </Link>
                      </div>
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

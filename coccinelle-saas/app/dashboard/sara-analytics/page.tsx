'use client';

import { useEffect, useState } from 'react';
import { Phone, Clock, Target, Star, RefreshCw, ArrowLeft, TrendingUp, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface SaraData {
  total_calls: number;
  avg_duration_seconds: number;
  calls_by_day: { day: string; count: number }[];
  appointments_from_calls: number;
  conversion_rate: number;
  avg_rating: number;
  total_prospects: number;
  total_customers: number;
  total_appointments: number;
}

export default function SaraAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SaraData | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/analytics/sara?period=${period}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Erreur chargement');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Erreur chargement Sara analytics:', err);
      setError('Impossible de charger les donnees. Verifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartData = (data?.calls_by_day || []).map(d => ({
    day: d.day.substring(5), // "03-01" format
    appels: d.count,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div>
              <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Skeleton chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const hasData = data && data.total_calls > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics appels</h1>
              <p className="text-xs sm:text-sm text-gray-600">Performance de l&apos;assistant vocal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
                </button>
              ))}
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rafraichir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!hasData && !error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun appel enregistre</h3>
            <p className="text-gray-500">L&apos;assistant commencera à collecter des données dès le premier appel.</p>
          </div>
        ) : data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
              {/* Total appels */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total appels</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.total_calls}</p>
              </div>

              {/* Duree moyenne */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Duree moyenne</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatDuration(data.avg_duration_seconds)}</p>
              </div>

              {/* Taux de conversion */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Taux de conversion</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.conversion_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{data.appointments_from_calls} RDV</p>
              </div>

              {/* Note moyenne */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Note moyenne</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.avg_rating || '-'}<span className="text-base font-normal text-gray-500">/5</span></p>
              </div>
            </div>

            {/* Chart - Appels par jour */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 lg:mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appels par jour</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="appels"
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={{ fill: '#F97316', r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Appels"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Aucune donnee pour cette periode
                </div>
              )}
            </div>

            {/* Stats supplementaires */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                  <p className="text-sm text-gray-600">Total prospects</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.total_prospects}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-gray-700" />
                  </div>
                  <p className="text-sm text-gray-600">Total clients</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.total_customers}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-700" />
                  </div>
                  <p className="text-sm text-gray-600">Total RDV</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.total_appointments}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

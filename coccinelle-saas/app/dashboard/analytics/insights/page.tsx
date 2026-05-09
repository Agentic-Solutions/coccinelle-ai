'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp, TrendingDown, Phone, Clock, CalendarCheck, UserPlus,
  Download, Activity
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

// Lazy load recharts
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

// Types
interface InsightsData {
  period: string;
  kpis: {
    total_calls: number;
    completed_calls: number;
    avg_duration: number;
    total_duration: number;
    active_days: number;
    rdv_rate: number;
    prospects_created: number;
    prev_total_calls: number;
    prev_completed_calls: number;
    prev_avg_duration: number;
  };
  calls_by_day: Array<{ date: string; calls: number; completed: number; avg_duration: number }>;
  calls_by_hour: Array<{ hour: number; count: number }>;
  calls_by_weekday: Array<{ day_of_week: number; count: number }>;
  prospects_by_day: Array<{ date: string; count: number }>;
  top_topics: Array<{ summary: string; count: number }>;
  rdv_conversion: { booked: number; total: number; rate: number };
}

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function variation(current: number, previous: number): { pct: number; positive: boolean } {
  if (!previous) return { pct: current > 0 ? 100 : 0, positive: current > 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), positive: pct >= 0 };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/v1/analytics/insights?period=${period}`), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('[Insights] API error:', res.status, body);
        throw new Error(`Erreur ${res.status}`);
      }
      const json = await res.json();
      // Validate response structure — API returns flat object with period, kpis, etc.
      if (json && json.kpis) {
        setData(json);
      } else if (json && json.error) {
        throw new Error(json.error);
      } else {
        // Unexpected shape — build empty default so the page still renders
        setData({
          period,
          kpis: { total_calls: 0, completed_calls: 0, avg_duration: 0, total_duration: 0, active_days: 0, rdv_rate: 0, prospects_created: 0, prev_total_calls: 0, prev_completed_calls: 0, prev_avg_duration: 0 },
          calls_by_day: [],
          calls_by_hour: [],
          calls_by_weekday: [],
          prospects_by_day: [],
          top_topics: [],
          rdv_conversion: { booked: 0, total: 0, rate: 0 },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les insights');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  // Export CSV
  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metrique', 'Valeur'],
      ['Total appels', String(data.kpis.total_calls)],
      ['Appels completes', String(data.kpis.completed_calls)],
      ['Duree moyenne', formatDuration(data.kpis.avg_duration)],
      ['RDV pris', String(data.rdv_conversion.booked)],
      ['Taux conversion RDV', data.rdv_conversion.rate + '%'],
      ['Prospects crees', String(data.kpis.prospects_created)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Aucune donnee'}</p>
          <button onClick={loadInsights} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Reessayer</button>
        </div>
      </div>
    );
  }

  const { kpis, calls_by_day, calls_by_hour, calls_by_weekday, top_topics, rdv_conversion, prospects_by_day } = data;

  // Prepare chart data
  const callsChartData = calls_by_day.map(d => ({
    date: formatDate(d.date),
    total: d.calls,
    completes: d.completed,
  }));

  // Fill all 24 hours
  const hoursData = Array.from({ length: 24 }, (_, i) => {
    const found = calls_by_hour.find(h => h.hour === i);
    return { hour: `${i}h`, count: found?.count || 0 };
  });
  const maxHourCount = Math.max(...hoursData.map(h => h.count), 1);

  const weekdayData = WEEKDAY_LABELS.map((label, i) => {
    const found = calls_by_weekday.find(d => d.day_of_week === i);
    return { day: label, count: found?.count || 0, isWeekend: i === 0 || i === 6 };
  });

  const prospectsChartData = prospects_by_day.map(d => ({
    date: formatDate(d.date),
    count: d.count,
  }));

  const callsVar = variation(kpis.total_calls, kpis.prev_total_calls);
  const completedVar = variation(kpis.completed_calls, kpis.prev_completed_calls);
  const durationVar = variation(kpis.avg_duration, kpis.prev_avg_duration);
  const successRate = kpis.total_calls > 0
    ? Math.round((kpis.completed_calls / kpis.total_calls) * 100) : 0;

  // Top topics with max for progress bars
  const maxTopicCount = Math.max(...top_topics.map(t => t.count), 1);

  // Donut data for RDV — green for booked (exception per dashboard rules), gray for remainder
  const rdvDonutData = [
    { name: 'RDV pris', value: rdv_conversion.booked, color: '#16a34a' },
    { name: 'Sans RDV', value: Math.max(rdv_conversion.total - rdv_conversion.booked, 0), color: '#f3f4f6' },
  ];

  const periodLabel = period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : '90 derniers jours';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-gray-700" />
                Insights
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">Analyse detaillee de vos appels et conversions</p>
            </div>
            <div className="flex items-center gap-2">
              {(['7d', '30d', '90d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
                </button>
              ))}
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* SECTION 1 — KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total appels */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Phone className="w-5 h-5 text-gray-600" /></div>
              {callsVar.pct > 0 && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${callsVar.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {callsVar.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {callsVar.pct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpis.total_calls}</p>
            <p className="text-sm text-gray-500 mt-0.5">Appels total</p>
          </div>

          {/* Duree moyenne */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Clock className="w-5 h-5 text-gray-600" /></div>
              {durationVar.pct > 0 && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${durationVar.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {durationVar.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {durationVar.pct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(kpis.avg_duration)}</p>
            <p className="text-sm text-gray-500 mt-0.5">Duree moyenne</p>
          </div>

          {/* Taux succes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Activity className="w-5 h-5 text-gray-600" /></div>
              {completedVar.pct > 0 && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${completedVar.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {completedVar.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {completedVar.pct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
            <p className="text-sm text-gray-500 mt-0.5">Taux succes</p>
          </div>

          {/* RDV convertis */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg"><CalendarCheck className="w-5 h-5 text-gray-600" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{rdv_conversion.booked}</p>
            <p className="text-sm text-gray-500 mt-0.5">RDV convertis</p>
          </div>
        </div>

        {/* SECTION 2 — Evolution appels (ligne) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Volume d&apos;appels — {periodLabel}
          </h3>
          {callsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={callsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#111827" strokeWidth={2} name="Total" dot={false} />
                <Line type="monotone" dataKey="completes" stroke="#9ca3af" strokeWidth={2} name="Completes" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Aucune donnee pour cette periode</div>
          )}
        </div>

        {/* SECTION 3 + 4 — Heures de pointe + Jours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heures de pointe */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Heures de pointe</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hoursData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="hour" stroke="#9ca3af" tick={{ fontSize: 11 }} width={35} />
                <Tooltip formatter={(value: number) => [`${value} appels`, 'Appels']} />
                <Bar dataKey="count" name="Appels" radius={[0, 4, 4, 0]}>
                  {hoursData.map((entry, i) => (
                    <Cell key={i} fill={entry.count >= maxHourCount * 0.7 ? '#111827' : entry.count > 0 ? '#9ca3af' : '#f3f4f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Jours de la semaine */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Jours les plus actifs</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [`${value} appels`, 'Appels']} />
                <Bar dataKey="count" name="Appels" radius={[4, 4, 0, 0]}>
                  {weekdayData.map((entry, i) => (
                    <Cell key={i} fill={entry.isWeekend ? '#d1d5db' : '#111827'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 5 + 6 — Conversion RDV + Sujets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion RDV (donut) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Taux de conversion RDV</h3>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rdvDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {rdvDonutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{rdv_conversion.rate}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{rdv_conversion.total}</span> appels
                  {' '}&rarr;{' '}
                  <span className="font-semibold text-green-600">{rdv_conversion.booked}</span> RDV pris
                </p>
                <p className="text-xs text-gray-400">Moyenne secteur : 15%</p>
              </div>
            </div>
          </div>

          {/* Sujets frequents */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Sujets les plus demandes</h3>
            {top_topics.length > 0 ? (
              <div className="space-y-3">
                {top_topics.slice(0, 5).map((topic, i) => {
                  const pct = Math.round((topic.count / maxTopicCount) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-700 truncate max-w-[80%]">{topic.summary}</p>
                        <span className="text-xs font-medium text-gray-500 ml-2">{topic.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: i === 0 ? '#111827' : i === 1 ? '#4b5563' : '#9ca3af' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Aucun sujet detecte pour cette periode</p>
            )}
          </div>
        </div>

        {/* SECTION 7 — Prospects */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Prospects crees</h3>
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold text-gray-900">{kpis.prospects_created}</span>
            </div>
          </div>
          {prospectsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={prospectsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#111827" fill="#e5e7eb" name="Prospects" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucun prospect cree sur cette periode</div>
          )}
        </div>
      </div>
    </div>
  );
}

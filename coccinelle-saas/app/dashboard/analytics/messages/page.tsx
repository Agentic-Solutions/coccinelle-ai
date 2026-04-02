'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Phone, Send, Loader2 } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface MessageStats {
  totalSMS: number;
  totalWhatsApp: number;
  totalEmail: number;
  responseRate: number;
}

export default function AnalyticsMessagesPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MessageStats>({ totalSMS: 0, totalWhatsApp: 0, totalEmail: 0, responseRate: 0 });

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/analytics/overview`), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalSMS: data.total_sms || 0,
          totalWhatsApp: data.total_whatsapp || 0,
          totalEmail: data.total_email || 0,
          responseRate: data.response_rate || 0,
        });
      }
    } catch {
      // Keep defaults
    }
    setLoading(false);
  }

  const channels = [
    { label: 'SMS', icon: Phone, count: stats.totalSMS, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'WhatsApp', icon: MessageSquare, count: stats.totalWhatsApp, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'Email', icon: Mail, count: stats.totalEmail, color: 'text-gray-700', bg: 'bg-gray-100' },
  ];

  const total = stats.totalSMS + stats.totalWhatsApp + stats.totalEmail;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-gray-700" />
                Analytics — Messages
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Métriques SMS, WhatsApp et Email</p>
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
            {/* Total */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total messages envoyés</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Taux de réponse</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.responseRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Per Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {channels.map(ch => {
                const Icon = ch.icon;
                const pct = total > 0 ? ((ch.count / total) * 100).toFixed(0) : '0';
                return (
                  <div key={ch.label} className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${ch.bg}`}>
                        <Icon className={`w-5 h-5 ${ch.color}`} />
                      </div>
                      <span className="font-medium text-gray-900">{ch.label}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{ch.count}</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${ch.label === 'SMS' ? 'bg-gray-900' : ch.label === 'WhatsApp' ? 'bg-gray-700' : 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pct}% du total</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {total === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucun message sur cette période.</p>
                <p className="text-sm mt-1">Les statistiques de messages apparaîtront ici.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

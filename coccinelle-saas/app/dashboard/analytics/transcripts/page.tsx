'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Phone, Clock, ChevronDown, ChevronUp, Loader2, Filter } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface Transcript {
  id: string;
  date: string;
  duration: number;
  phone: string;
  status: 'success' | 'failed' | 'no_answer';
  excerpt: string;
  fullText: string;
}

export default function AnalyticsTranscriptsPage() {
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadTranscripts();
  }, []);

  async function loadTranscripts() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/analytics/sara?period=30d'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Map calls_by_day to transcript entries
        const items: Transcript[] = (data.calls_by_day || []).map((d: { day: string; count?: number }, i: number) => ({
          id: `transcript-${i}`,
          date: d.day,
          duration: data.avg_duration_seconds || 0,
          phone: '',
          status: 'success' as const,
          excerpt: 'Transcription disponible après traitement...',
          fullText: '',
        }));
        setTranscripts(items);
      }
    } catch {
      // Keep empty
    }
    setLoading(false);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  }

  const filtered = transcripts.filter(t => {
    if (dateFilter && !t.date.includes(dateFilter)) return false;
    if (phoneFilter && !t.phone.includes(phoneFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.excerpt.toLowerCase().includes(q) || t.phone.includes(q) || t.date.includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-gray-700" />
              Transcripts
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Transcriptions complètes de tous les appels</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans les transcripts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Filtrer par numéro"
              value={phoneFilter}
              onChange={e => setPhoneFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-44"
            />
          </div>
        </div>

        {/* Transcripts list */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune transcription disponible.</p>
              <p className="text-sm mt-1">Les transcriptions apparaîtront après les appels de vos agents.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(t => (
                <div key={t.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        t.status === 'success' ? 'bg-gray-900' : t.status === 'failed' ? 'bg-gray-400' : 'bg-gray-300'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900">
                            {new Date(t.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                          {t.phone && (
                            <span className="text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {t.phone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{t.excerpt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.duration > 0 ? formatDuration(t.duration) : '—'}
                      </span>
                      {expandedId === t.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedId === t.id && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                        {t.fullText || 'Transcription complète non disponible. Les transcriptions en temps réel seront activées dans une prochaine version.'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

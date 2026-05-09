'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Phone, Clock, ArrowLeft, Loader2, User, Bot } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface TranscriptEntry {
  id: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  duration: number;
  transcript: string;
  summary: string | null;
  sentiment: string | null;
  prospect_name: string | null;
  created_at: string;
}

interface TranscriptLine {
  role: 'client' | 'assistant';
  text: string;
}

function parseTranscript(raw: string): TranscriptLine[] {
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map(line => {
    if (line.startsWith('Client:') || line.startsWith('user:')) {
      return { role: 'client' as const, text: line.replace(/^(Client|user):\s*/, '') };
    }
    if (line.startsWith('Assistant:') || line.startsWith('assistant:')) {
      return { role: 'assistant' as const, text: line.replace(/^(Assistant|assistant):\s*/, '') };
    }
    return { role: 'client' as const, text: line };
  });
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function AnalyticsTranscriptsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    loadTranscripts();
  }, []);

  async function loadTranscripts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl('/api/v1/calls/transcripts?limit=50'), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTranscripts(data.transcripts || []);
      if (data.transcripts?.length > 0) {
        setSelectedId(data.transcripts[0].id);
      }
    } catch (e) {
      setError('Impossible de charger les transcriptions');
    }
    setLoading(false);
  }

  const filtered = transcripts.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.from_number?.toLowerCase().includes(q) ||
      t.transcript?.toLowerCase().includes(q) ||
      t.prospect_name?.toLowerCase().includes(q) ||
      t.summary?.toLowerCase().includes(q)
    );
  });

  const selected = transcripts.find(t => t.id === selectedId);
  const lines = selected ? parseTranscript(selected.transcript) : [];

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-gray-700" />
              Transcripts
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Transcriptions completes de tous les appels
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto mt-16 text-center">
          <p className="text-gray-500">{error}</p>
          <button
            onClick={loadTranscripts}
            className="mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Reessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="max-w-md mx-auto mt-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">Aucune transcription disponible</p>
          <p className="text-sm text-gray-400 mt-2">
            Les prochains appels apparaitront ici automatiquement
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6 h-[calc(100vh-180px)]">
            {/* List panel */}
            <div className={`w-full lg:w-[380px] flex-shrink-0 flex flex-col ${mobileDetail ? 'hidden lg:flex' : 'flex'}`}>
              {/* Search */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* List */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-y-auto flex-1">
                <div className="divide-y divide-gray-100">
                  {filtered.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(t.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedId === t.id ? 'bg-gray-50 border-l-2 border-gray-900' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {t.prospect_name || t.from_number || 'Inconnu'}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatDuration(t.duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{t.from_number}</span>
                        <span className="text-gray-300">|</span>
                        <span>{formatDate(t.created_at)}</span>
                      </div>
                      {t.summary && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{t.summary}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detail panel */}
            <div className={`flex-1 flex flex-col min-w-0 ${!mobileDetail ? 'hidden lg:flex' : 'flex'}`}>
              {selected ? (
                <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
                  {/* Detail header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                    <button
                      onClick={() => setMobileDetail(false)}
                      className="lg:hidden p-1 hover:bg-gray-100 rounded"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-medium text-gray-900 truncate">
                        {selected.prospect_name || selected.from_number}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{formatDate(selected.created_at)} a {formatTime(selected.created_at)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(selected.duration)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {selected.direction === 'inbound' ? 'Entrant' : 'Sortant'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {selected.summary && (
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Resume :</span> {selected.summary}
                      </p>
                    </div>
                  )}

                  {/* Conversation bubbles */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {lines.length > 0 ? (
                      lines.map((line, i) => (
                        <div
                          key={i}
                          className={`flex ${line.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start gap-2 max-w-[80%] ${
                            line.role === 'assistant' ? 'flex-row-reverse' : ''
                          }`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              line.role === 'assistant' ? 'bg-gray-900' : 'bg-gray-200'
                            }`}>
                              {line.role === 'assistant' ? (
                                <Bot className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-gray-600" />
                              )}
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm ${
                              line.role === 'assistant'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {line.text}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-400">Format de transcription non reconnu</p>
                        <pre className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600 text-left whitespace-pre-wrap">
                          {selected.transcript}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-sm">Selectionnez un appel pour voir la transcription</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

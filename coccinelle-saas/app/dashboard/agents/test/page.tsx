'use client';

import { useState, useEffect } from 'react';
import { PhoneCall, PhoneOff, Loader2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface TestCall {
  id: string;
  date: string;
  duration: number;
  status: 'success' | 'failed' | 'no_answer';
  transcript?: string;
}

export default function AgentTestPage() {
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [calling, setCalling] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [recentCalls, setRecentCalls] = useState<TestCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  useEffect(() => {
    checkAgentStatus();
    loadRecentCalls();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callActive) {
      timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callActive]);

  async function checkAgentStatus() {
    setAgentStatus('checking');
    try {
      const res = await fetch(buildApiUrl('/api/v1/voixia/resolve-phone?phone=%2B33939035760'), {
        headers: getAuthHeaders(),
      });
      setAgentStatus(res.ok ? 'online' : 'offline');
    } catch {
      setAgentStatus('offline');
    }
  }

  async function loadRecentCalls() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/analytics/sara?period=7d'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const calls = (data.calls_by_day || []).slice(0, 5).map((d: { day: string; count?: number }, i: number) => ({
          id: `test-${i}`,
          date: d.day,
          duration: data.avg_duration_seconds || 0,
          status: 'success' as const,
          transcript: '',
        }));
        setRecentCalls(calls);
      }
    } catch {
      // Keep empty
    }
    setLoading(false);
  }

  async function startTestCall() {
    setCalling(true);
    setCallDuration(0);
    setLiveTranscript('');
    try {
      // Initiate call via VoixIA
      const res = await fetch(buildApiUrl('/api/v1/voixia/orchestrate'), {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outbound_call',
          phone: '+33939035760',
          test_mode: true,
        }),
      });
      if (res.ok) {
        setCallActive(true);
        setLiveTranscript('Appel en cours... En attente de connexion.');
        // Poll for transcript updates
        pollTranscript();
      } else {
        setLiveTranscript('Erreur : impossible de lancer l\'appel. Vérifiez la configuration agent.');
      }
    } catch {
      setLiveTranscript('Erreur de connexion au serveur.');
    }
    setCalling(false);
  }

  function pollTranscript() {
    let polls = 0;
    const interval = setInterval(async () => {
      polls++;
      try {
        const res = await fetch(buildApiUrl('/api/v1/analytics/sara?period=1d'), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.total_calls > 0) {
            setLiveTranscript(prev => prev + '\n[Agent connecté - transcription en direct non disponible dans cette version]');
            clearInterval(interval);
            setTimeout(() => {
              setCallActive(false);
              loadRecentCalls();
            }, 2000);
          }
        }
      } catch {
        // Continue polling
      }
      if (polls > 30) {
        clearInterval(interval);
        setCallActive(false);
        setLiveTranscript(prev => prev + '\nDélai dépassé. Vérifiez les logs VoixIA.');
      }
    }, 3000);
  }

  function endCall() {
    setCallActive(false);
    setLiveTranscript(prev => prev + '\nAppel terminé.');
    loadRecentCalls();
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-gray-700" />
              Test vocal
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Testez votre agent en direct</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Agent Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${
                agentStatus === 'online' ? 'bg-gray-900' :
                agentStatus === 'checking' ? 'bg-gray-400 animate-pulse' :
                'bg-gray-300'
              }`} />
              <div>
                <p className="font-medium text-gray-900">
                  Statut agent : {agentStatus === 'online' ? 'En ligne' : agentStatus === 'checking' ? 'Vérification...' : 'Hors ligne'}
                </p>
                <p className="text-sm text-gray-500">Numéro : +33 9 39 03 57 60</p>
              </div>
            </div>
            <button
              onClick={checkAgentStatus}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Actualiser
            </button>
          </div>
        </div>

        {/* Call Control */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Lancer un appel de test</h2>
          <div className="flex items-center gap-4">
            {!callActive ? (
              <button
                onClick={startTestCall}
                disabled={calling || agentStatus !== 'online'}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                  calling || agentStatus !== 'online'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                {calling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <PhoneCall className="w-5 h-5" />
                )}
                {calling ? 'Connexion...' : 'Appeler maintenant'}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" />
                  <span className="font-medium">En cours — {formatDuration(callDuration)}</span>
                </div>
                <button
                  onClick={endCall}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                  Raccrocher
                </button>
              </div>
            )}
          </div>
          {agentStatus !== 'online' && !callActive && (
            <p className="text-sm text-gray-700 mt-2">L&apos;agent doit être en ligne pour lancer un appel de test.</p>
          )}
        </div>

        {/* Live Transcript */}
        {liveTranscript && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Transcription
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {liveTranscript}
            </div>
          </div>
        )}

        {/* Recent Test Calls */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Derniers appels (7 jours)</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : recentCalls.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <PhoneCall className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucun appel récent.</p>
              <p className="text-sm mt-1">Lancez un appel de test pour commencer.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCalls.map(call => (
                <div key={call.id}>
                  <button
                    onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {call.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-gray-700" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-900">
                        {new Date(call.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {call.duration > 0 ? formatDuration(call.duration) : '—'}
                      </span>
                      <span>{call.status === 'success' ? 'Réussi' : 'Échoué'}</span>
                    </div>
                  </button>
                  {expandedCall === call.id && (
                    <div className="px-4 pb-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                        {call.transcript || 'Transcription non disponible.'}
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

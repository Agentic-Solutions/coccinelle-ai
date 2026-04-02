'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, Filter, X, Calendar, TrendingUp, Clock, ArrowLeft, FileText, Smile, Meh, Frown, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Call {
  id: string;
  retell_call_id: string | null;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  duration: number;
  sentiment: string | null;
  summary: string | null;
  appointment_booked: number;
  prospect_name: string | null;
  prospect_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface Stats {
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  avg_duration_seconds: number;
  inbound_calls: number;
  outbound_calls: number;
  appointments_created: number;
  conversion_rate: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function AppelsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtres
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selected call for detail panel
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  const fetchCalls = async (page: number) => {
    const token = getToken();
    if (!token) {
      setError('Non authentifié');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (statusFilter) params.set('status', statusFilter);
      if (directionFilter) params.set('direction', directionFilter);
      if (dateFromFilter) params.set('date_from', dateFromFilter);
      if (dateToFilter) params.set('date_to', dateToFilter);

      const res = await fetch(`${API_URL}/api/v1/calls?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expirée, veuillez vous reconnecter');
          return;
        }
        throw new Error('Erreur serveur');
      }

      const data = await res.json();
      setCalls(data.calls || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/calls/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchCallDetail = async (callId: string) => {
    const token = getToken();
    if (!token) return;

    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/calls/${callId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCall(data.call);
      }
    } catch (err) {
      console.error('Detail error:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCalls(currentPage), fetchStats()]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCalls(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, directionFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    if (selectedCallId) {
      fetchCallDetail(selectedCallId);
    } else {
      setSelectedCall(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCallId]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min > 0) return `${min}m${sec > 0 ? sec + 's' : ''}`;
    return `${sec}s`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSentimentIcon = (sentiment: string | null) => {
    if (!sentiment) return <Meh className="w-4 h-4 text-gray-400" />;
    switch (sentiment.toLowerCase()) {
      case 'positive': return <Smile className="w-4 h-4 text-green-500" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-500" />;
      default: return <Meh className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      ended: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      no_answer: 'bg-yellow-100 text-yellow-800',
      busy: 'bg-orange-100 text-orange-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Terminé',
      ended: 'Terminé',
      in_progress: 'En cours',
      failed: 'Échoué',
      no_answer: 'Sans réponse',
      busy: 'Occupé',
      initiated: 'Lancé'
    };
    return labels[status] || status;
  };

  const resetFilters = () => {
    setStatusFilter('');
    setDirectionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const hasActiveFilters = statusFilter || directionFilter || dateFromFilter || dateToFilter;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des appels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">Retour au dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/conversations"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Journal des appels</h1>
              <p className="text-sm text-gray-600">Historique réel des appels téléphoniques</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres {hasActiveFilters && '(actifs)'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.total_calls || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">RDV créés</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.appointments_created || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Conversion</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.conversion_rate || '0%'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Durée moy.</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatDuration(stats?.avg_duration_seconds || 0)}</p>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Filtres</h3>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                  <X className="w-3 h-3" /> Réinitialiser
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Tout statut</option>
                <option value="completed">Terminé</option>
                <option value="ended">Terminé (ended)</option>
                <option value="in_progress">En cours</option>
                <option value="failed">Échoué</option>
              </select>
              <select
                value={directionFilter}
                onChange={(e) => { setDirectionFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Toute direction</option>
                <option value="inbound">Entrant</option>
                <option value="outbound">Sortant</option>
              </select>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => { setDateFromFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => { setDateToFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* Calls list + detail panel */}
        <div className="flex gap-6">
          {/* Calls table */}
          <div className={`${selectedCallId ? 'hidden lg:block lg:flex-1' : 'flex-1'}`}>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {calls.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Phone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Aucun appel</p>
                  <p className="text-sm mt-1">Les appels apparaîtront ici automatiquement</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Direction</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Sentiment</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Prospect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {calls.map((call) => (
                          <tr
                            key={call.id}
                            onClick={() => setSelectedCallId(call.id === selectedCallId ? null : call.id)}
                            className={`cursor-pointer transition-colors ${
                              selectedCallId === call.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">{formatDate(call.created_at)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-mono text-xs">
                              {call.direction === 'inbound' ? call.from_number : call.to_number}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                call.direction === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                              }`}>
                                {call.direction === 'inbound' ? 'Entrant' : 'Sortant'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDuration(call.duration)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(call.status)}`}>
                                {getStatusLabel(call.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{getSentimentIcon(call.sentiment)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700 hidden lg:table-cell">
                              {call.prospect_name ? (
                                <Link
                                  href={`/dashboard/crm/prospects/${call.prospect_id}`}
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {call.prospect_name}
                                </Link>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Page {pagination.page} / {pagination.total_pages} ({pagination.total} appels)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                          disabled={currentPage === pagination.total_pages}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selectedCallId && (
            <div className="w-full lg:w-96 xl:w-[420px] flex-shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 sticky top-6">
                {/* Panel header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Détail de l&apos;appel</h3>
                  <button
                    onClick={() => setSelectedCallId(null)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : selectedCall ? (
                  <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Call info */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Statut</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(selectedCall.status)}`}>
                          {getStatusLabel(selectedCall.status)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Direction</span>
                        <span className="text-gray-900">{selectedCall.direction === 'inbound' ? 'Entrant' : 'Sortant'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Durée</span>
                        <span className="text-gray-900 font-medium">{formatDuration(selectedCall.duration)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">De</span>
                        <span className="text-gray-900 font-mono text-xs">{selectedCall.from_number || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Vers</span>
                        <span className="text-gray-900 font-mono text-xs">{selectedCall.to_number || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date</span>
                        <span className="text-gray-900">{formatDate(selectedCall.created_at)}</span>
                      </div>
                      {selectedCall.sentiment && (
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-500">Sentiment</span>
                          <div className="flex items-center gap-1">
                            {getSentimentIcon(selectedCall.sentiment)}
                            <span className="text-gray-900 capitalize">{selectedCall.sentiment}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prospect lién */}
                    {selectedCall.prospect && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">Prospect lié</p>
                        <Link
                          href={`/dashboard/crm/prospects/${selectedCall.prospect.id}`}
                          className="text-sm font-medium text-blue-800 hover:underline"
                        >
                          {[selectedCall.prospect.first_name, selectedCall.prospect.last_name].filter(Boolean).join(' ')}
                        </Link>
                        {selectedCall.prospect.phone && (
                          <p className="text-xs text-blue-600 mt-0.5">{selectedCall.prospect.phone}</p>
                        )}
                      </div>
                    )}

                    {/* Résumé */}
                    {selectedCall.summary && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Résumé</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedCall.summary}</p>
                      </div>
                    )}

                    {/* Transcription */}
                    {selectedCall.transcript && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Transcription
                        </h4>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                          {selectedCall.transcript}
                        </div>
                      </div>
                    )}

                    {/* Analysis */}
                    {selectedCall.analysis && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Analyse</h4>
                        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          {selectedCall.analysis.call_summary && (
                            <p><span className="font-medium">Résumé :</span> {selectedCall.analysis.call_summary}</p>
                          )}
                          {selectedCall.analysis.user_sentiment && (
                            <p><span className="font-medium">Sentiment:</span> {selectedCall.analysis.user_sentiment}</p>
                          )}
                          {selectedCall.analysis.call_successful !== undefined && (
                            <p><span className="font-medium">Succès :</span> {selectedCall.analysis.call_successful ? 'Oui' : 'Non'}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, Download, Filter, X, Calendar, TrendingUp, Clock, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import Logo from '../../../src/components/Logo';
import { isDemoMode, mockCalls, mockStats } from '../../../lib/mockData';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';
const API_KEY = 'demo-key-12345';

interface Call {
  id: string;
  call_id: string;
  status: string;
  duration_seconds: number;
  cost_usd: string;
  prospect_name: string;
  phone_number: string;
  appointment_created: number;
  created_at: string;
}

interface Stats {
  total_calls: number;
  completed_calls: number;
  appointments_created: number;
  conversion_rate: string;
  avg_duration_seconds: number;
  total_cost_usd: string;
}

export default function AppelsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filtres
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [costMin, setCostMin] = useState('');
  const [costMax, setCostMax] = useState('');
  const [prospectSearch, setProspectSearch] = useState('');
  const [rdvFilter, setRdvFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        // Mode démo - utiliser mockData
        if (isDemoMode()) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Simule délai réseau
          setStats(mockStats);
          setCalls(mockCalls);
          setFilteredCalls(mockCalls);
          setLoading(false);
          return;
        }

        // Mode production - fetch API
        const statsRes = await fetch(`${API_URL}/api/v1/vapi/stats`, {
          headers: { 'x-api-key': API_KEY }
        });
        const statsData = await statsRes.json();
        setStats(statsData.stats);

        // Récupérer les appels
        const callsRes = await fetch(`${API_URL}/api/v1/vapi/calls`, {
          headers: { 'x-api-key': API_KEY }
        });
        const callsData = await callsRes.json();
        setCalls(callsData.calls || []);
        setFilteredCalls(callsData.calls || []);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...calls];

    if (statusFilter) {
      result = result.filter(call => call.status === statusFilter);
    }

    if (dateFromFilter) {
      result = result.filter(call => call.created_at >= dateFromFilter);
    }
    if (dateToFilter) {
      result = result.filter(call => call.created_at <= dateToFilter);
    }

    if (durationMin) {
      result = result.filter(call => call.duration_seconds >= parseInt(durationMin));
    }
    if (durationMax) {
      result = result.filter(call => call.duration_seconds <= parseInt(durationMax));
    }

    if (costMin) {
      result = result.filter(call => parseFloat(call.cost_usd || '0') >= parseFloat(costMin));
    }
    if (costMax) {
      result = result.filter(call => parseFloat(call.cost_usd || '0') <= parseFloat(costMax));
    }

    if (prospectSearch) {
      result = result.filter(call => 
        call.prospect_name?.toLowerCase().includes(prospectSearch.toLowerCase())
      );
    }

    if (rdvFilter === 'yes') {
      result = result.filter(call => call.appointment_created === 1);
    } else if (rdvFilter === 'no') {
      result = result.filter(call => call.appointment_created === 0);
    }

    setFilteredCalls(result);
    setCurrentPage(1);
  }, [calls, statusFilter, dateFromFilter, dateToFilter, durationMin, durationMax, costMin, costMax, prospectSearch, rdvFilter]);

  const resetFilters = () => {
    setStatusFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setDurationMin('');
    setDurationMax('');
    setCostMin('');
    setCostMax('');
    setProspectSearch('');
    setRdvFilter('all');
  };

  const hasActiveFilters = statusFilter || dateFromFilter || dateToFilter || durationMin || durationMax || costMin || costMax || prospectSearch || rdvFilter !== 'all';

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalls = filteredCalls.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredCalls.map(call => ({
      'ID': call.id,
      'Call ID': call.call_id,
      'Statut': call.status,
      'Durée (s)': call.duration_seconds,
      'Coût (USD)': call.cost_usd,
      'Prospect': call.prospect_name || 'N/A',
      'Téléphone': call.phone_number || 'N/A',
      'RDV Créé': call.appointment_created === 1 ? 'Oui' : 'Non',
      'Date': new Date(call.created_at).toLocaleString('fr-FR')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Appels');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `appels_sara_${date}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Appels Sara</h1>
              <p className="text-gray-600 mt-1">Historique complet des appels téléphoniques</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Phone className="w-5 h-5 text-orange-600" />}
            title="Total Appels"
            value={stats?.total_calls.toString() || '0'}
            iconBg="bg-orange-100"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-green-600" />}
            title="RDV Créés"
            value={stats?.appointments_created.toString() || '0'}
            iconBg="bg-green-100"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            title="Taux Conversion"
            value={stats?.conversion_rate || '0%'}
            iconBg="bg-blue-100"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-gray-600" />}
            title="Durée Moyenne"
            value={`${Math.round(stats?.avg_duration_seconds || 0)}s`}
            iconBg="bg-gray-100"
          />
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous</option>
                <option value="completed">Terminé</option>
                <option value="failed">Échoué</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RDV créé</label>
              <select
                value={rdvFilter}
                onChange={(e) => setRdvFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée min (s)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="Ex: 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée max (s)</label>
              <input
                type="number"
                value={durationMax}
                onChange={(e) => setDurationMax(e.target.value)}
                placeholder="Ex: 300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coût min (USD)</label>
              <input
                type="number"
                step="0.01"
                value={costMin}
                onChange={(e) => setCostMin(e.target.value)}
                placeholder="Ex: 0.10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coût max (USD)</label>
              <input
                type="number"
                step="0.01"
                value={costMax}
                onChange={(e) => setCostMax(e.target.value)}
                placeholder="Ex: 1.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recherche prospect</label>
              <input
                type="text"
                value={prospectSearch}
                onChange={(e) => setProspectSearch(e.target.value)}
                placeholder="Rechercher par nom..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {filteredCalls.length} appel{filteredCalls.length > 1 ? 's' : ''} trouvé{filteredCalls.length > 1 ? 's' : ''}
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RDV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCalls.map((call) => (
                  <tr 
                    key={call.id}
                    onClick={() => window.location.href = `/dashboard/appels/${call.id}`}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{call.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        call.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{call.duration_seconds}s</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${call.cost_usd}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{call.prospect_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        call.appointment_created === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {call.appointment_created === 1 ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(call.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredCalls.length)} sur {filteredCalls.length} résultats
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Précédent
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, iconBg }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${iconBg} rounded-lg p-2`}>
          {icon}
        </div>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

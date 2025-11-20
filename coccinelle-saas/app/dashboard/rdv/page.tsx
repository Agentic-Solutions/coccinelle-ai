'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Filter,
  Download,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowLeft,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Logo from '../../../src/components/Logo';
import { isDemoMode, mockAppointments, mockProspects, mockAgents } from '../../../lib/mockData';

interface Appointment {
  id: string;
  tenant_id: string;
  prospect_id: string;
  agent_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
  prospect_name?: string;
  prospect_phone?: string;
  agent_name?: string;
}

interface Stats {
  total_appointments: number;
  upcoming_appointments: number;
  confirmed_appointments: number;
  attendance_rate: number;
}

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function RdvPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_appointments: 0,
    upcoming_appointments: 0,
    confirmed_appointments: 0,
    attendance_rate: 0
  });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [newAppointment, setNewAppointment] = useState({
    prospect_id: '',
    agent_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, statusFilter, agentFilter, dateFilter, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mode démo - utiliser mockData
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simule délai réseau

        setAppointments(mockAppointments);
        const total = mockAppointments.length;
        const upcoming = mockAppointments.filter((a: Appointment) =>
          new Date(a.scheduled_at) >= new Date() && a.status === 'scheduled'
        ).length;
        const confirmed = mockAppointments.filter((a: Appointment) =>
          a.status === 'confirmed'
        ).length;
        const completed = mockAppointments.filter((a: Appointment) =>
          a.status === 'completed'
        ).length;
        const attendance = total > 0 ? Math.round((completed / total) * 100) : 0;

        setStats({
          total_appointments: total,
          upcoming_appointments: upcoming,
          confirmed_appointments: confirmed,
          attendance_rate: attendance
        });

        setProspects(mockProspects);
        setAgents(mockAgents);
        setLoading(false);
        return;
      }

      // Mode production - fetch API
      const rdvResponse = await fetch(`${API_URL}/api/v1/appointments`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const rdvData = await rdvResponse.json();
      setAppointments(rdvData.appointments || []);

      const total = rdvData.appointments?.length || 0;
      const upcoming = rdvData.appointments?.filter((a: Appointment) =>
        new Date(a.scheduled_at) >= new Date() && a.status === 'scheduled'
      ).length || 0;
      const confirmed = rdvData.appointments?.filter((a: Appointment) =>
        a.status === 'confirmed'
      ).length || 0;
      const completed = rdvData.appointments?.filter((a: Appointment) =>
        a.status === 'completed'
      ).length || 0;
      const attendance = total > 0 ? Math.round((completed / total) * 100) : 0;

      setStats({
        total_appointments: total,
        upcoming_appointments: upcoming,
        confirmed_appointments: confirmed,
        attendance_rate: attendance
      });

      const prospectsResponse = await fetch(`${API_URL}/api/v1/prospects`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const prospectsData = await prospectsResponse.json();
      setProspects(prospectsData.prospects || []);

      const agentsResponse = await fetch(`${API_URL}/api/v1/agents`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const agentsData = await agentsResponse.json();
      setAgents(agentsData.agents || []);

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (agentFilter !== 'all') {
      filtered = filtered.filter(a => a.agent_id === agentFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(a => {
        const appointmentDate = new Date(a.scheduled_at);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (dateFilter === 'today') {
          return appointmentDate.getTime() === today.getTime();
        } else if (dateFilter === 'upcoming') {
          return appointmentDate >= today;
        } else if (dateFilter === 'past') {
          return appointmentDate < today;
        }
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.prospect_name?.toLowerCase().includes(query) ||
        a.agent_name?.toLowerCase().includes(query) ||
        a.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setAgentFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const exportToExcel = () => {
    const dataToExport = filteredAppointments.map(a => ({
      'ID': a.id,
      'Prospect': a.prospect_name || 'N/A',
      'Téléphone': a.prospect_phone || 'N/A',
      'Agent': a.agent_name || 'N/A',
      'Date': new Date(a.scheduled_at).toLocaleDateString('fr-FR'),
      'Heure': a.scheduled_at ? a.scheduled_at.split('T')[1].substring(0, 5) : 'N/A',
      'Statut': a.status,
      'Notes': a.notes || 'N/A',
      'Créé le': new Date(a.created_at).toLocaleString('fr-FR')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rendez-vous');
    
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `rdv_coccinelle_${today}.xlsx`);
  };

  const createAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-key-12345'
        },
        body: JSON.stringify(newAppointment)
      });

      if (response.ok) {
        alert('Rendez-vous créé avec succès !');
        setShowCreateModal(false);
        setNewAppointment({
          prospect_id: '',
          agent_id: '',
          appointment_date: '',
          appointment_time: '',
          notes: ''
        });
        fetchData();
      } else {
        alert('Erreur lors de la création du rendez-vous');
      }
    } catch (error) {
      console.error('Erreur création RDV:', error);
      alert('Erreur lors de la création du rendez-vous');
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no_show': 'bg-orange-100 text-orange-800'
    };
    
    const labels: { [key: string]: string } = {
      'scheduled': 'Planifié',
      'confirmed': 'Confirmé',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'no_show': 'Absent'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || badges.scheduled}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des rendez-vous...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
              <p className="text-sm text-gray-600">Gérez tous vos rendez-vous prospects</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div></div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/rdv/settings">
            <button className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2">
              <Settings size={20} />
              Paramètres RDV
            </button>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
          >
            <Plus size={20} />
            Nouveau RDV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total RDV</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_appointments}</p>
            </div>
            <Calendar className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">RDV à venir</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcoming_appointments}</p>
            </div>
            <Clock className="text-orange-600" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">RDV confirmés</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.confirmed_appointments}</p>
            </div>
            <CheckCircle2 className="text-green-600" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Taux présence</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.attendance_rate}%</p>
            </div>
            <Users className="text-purple-600" size={40} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous</option>
              <option value="scheduled">Planifié</option>
              <option value="confirmed">Confirmé</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
              <option value="no_show">Absent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.first_name} {agent.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="upcoming">À venir</option>
              <option value="past">Passés</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom prospect, agent..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={resetFilters}
          className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          Réinitialiser les filtres
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          <span className="font-semibold text-gray-900">{filteredAppointments.length}</span> rendez-vous trouvés
        </p>
        <button
          onClick={exportToExcel}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <Download size={20} />
          Exporter Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospect</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((appointment) => (
                <tr
                  key={appointment.id}
                  onClick={() => window.location.href = `/dashboard/rdv/${appointment.id}`}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(appointment.scheduled_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.scheduled_at ? appointment.scheduled_at.split('T')[1].substring(0, 5) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <div>
                        <div className="font-medium">{appointment.prospect_name || 'N/A'}</div>
                        {appointment.prospect_phone && (
                          <div className="text-xs text-gray-500">{appointment.prospect_phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {appointment.agent_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(appointment.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {appointment.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAppointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Aucun rendez-vous trouvé</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
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
                className={`px-4 py-2 rounded-lg ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Nouveau rendez-vous</h2>
            
            <form onSubmit={createAppointment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prospect</label>
                  <select
                    required
                    value={newAppointment.prospect_id}
                    onChange={(e) => setNewAppointment({...newAppointment, prospect_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un prospect</option>
                    {prospects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} - {p.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                  <select
                    required
                    value={newAppointment.agent_id}
                    onChange={(e) => setNewAppointment({...newAppointment, agent_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un agent</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.first_name} {a.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={newAppointment.appointment_date}
                    onChange={(e) => setNewAppointment({...newAppointment, appointment_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                  <input
                    type="time"
                    required
                    value={newAppointment.appointment_time}
                    onChange={(e) => setNewAppointment({...newAppointment, appointment_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes optionnelles..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer le RDV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

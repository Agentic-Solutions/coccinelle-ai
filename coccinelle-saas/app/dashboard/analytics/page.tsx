'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Brain,
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Phone,
  Download,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import Logo from '../../../src/components/Logo';
import { isDemoMode, mockCalls, mockAppointments, mockStats, mockDocuments } from '../../../lib/mockData';
import AIInsightsPanel from '../../../src/components/dashboard/AIInsightsPanel';

// Lazy load recharts (only when analytics tab is active)
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

// Types
interface Stats {
  totalDocuments: number;
  totalCalls: number;
  totalAppointments: number;
  conversionRate: number;
  totalCost: number;
  avgDuration: number;
}

interface CallByDay {
  date: string;
  calls: number;
}

interface AppointmentByWeekday {
  day: string;
  count: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

interface CostData {
  date: string;
  cost: number;
}

interface TopQuestion {
  question: string;
  count: number;
}

interface AgentPerformance {
  agent: string;
  rdvCreated: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'ai-insights' | 'analytics'>('analytics');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  
  // Stats globales
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalCalls: 0,
    totalAppointments: 0,
    conversionRate: 0,
    totalCost: 0,
    avgDuration: 0
  });

  // Données graphiques
  const [callsByDay, setCallsByDay] = useState<CallByDay[]>([]);
  const [appointmentsByWeekday, setAppointmentsByWeekday] = useState<AppointmentByWeekday[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [costData, setCostData] = useState<CostData[]>([]);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);

  // Données pour AI Insights
  const [calls, setCalls] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Charger les données
  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Mode démo - utiliser mockData
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simule délai réseau

        const documentsData = { documents: mockDocuments };
        const callsData = { calls: mockCalls };
        const appointmentsData = { appointments: mockAppointments };
        const vapiStats = mockStats;

        // Store raw data for AI Insights
        setCalls(callsData.calls || []);
        setAppointments(appointmentsData.appointments || []);
        setDocuments(documentsData.documents || []);

        // Calculer les stats globales
        const totalDocs = documentsData.documents?.length || 0;
        const totalCalls = callsData.calls?.length || 0;
        const totalAppts = appointmentsData.appointments?.length || 0;
        const convRate = totalCalls > 0 ? (totalAppts / totalCalls) * 100 : 0;

        setStats({
          totalDocuments: totalDocs,
          totalCalls: totalCalls,
          totalAppointments: totalAppts,
          conversionRate: parseFloat(vapiStats.conversion_rate) || convRate,
          totalCost: parseFloat(vapiStats.total_cost_usd) || 0,
          avgDuration: vapiStats.avg_duration_seconds || 0
        });

        // Traiter les données pour les graphiques
        processCallsByDay(callsData.calls || []);
        processAppointmentsByWeekday(appointmentsData.appointments || []);
        processStatusDistribution(appointmentsData.appointments || []);
        processCostData(callsData.calls || []);
        processTopQuestions(callsData.calls || []);
        processAgentPerformance(appointmentsData.appointments || []);

        setLoading(false);
        return;
      }

      // Mode production - fetch API
      const [documentsRes, callsRes, appointmentsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/knowledge/documents`),
        fetch(`${API_URL}/api/v1/vapi/calls`),
        fetch(`${API_URL}/api/v1/appointments`),
        fetch(`${API_URL}/api/v1/vapi/stats`)
      ]);

      const documentsData = await documentsRes.json();
      const callsData = await callsRes.json();
      const appointmentsData = await appointmentsRes.json();
      const vapiStats = await statsRes.json();

      // Store raw data for AI Insights
      setCalls(callsData.calls || []);
      setAppointments(appointmentsData.appointments || []);
      setDocuments(documentsData.documents || []);

      // Calculer les stats globales
      const totalDocs = documentsData.documents?.length || 0;
      const totalCalls = callsData.calls?.length || 0;
      const totalAppts = appointmentsData.appointments?.length || 0;
      const convRate = totalCalls > 0 ? (totalAppts / totalCalls) * 100 : 0;

      setStats({
        totalDocuments: totalDocs,
        totalCalls: totalCalls,
        totalAppointments: totalAppts,
        conversionRate: convRate,
        totalCost: vapiStats.total_cost || 0,
        avgDuration: vapiStats.average_duration || 0
      });

      // Traiter les données pour les graphiques
      processCallsByDay(callsData.calls || []);
      processAppointmentsByWeekday(appointmentsData.appointments || []);
      processStatusDistribution(appointmentsData.appointments || []);
      processCostData(callsData.calls || []);
      processTopQuestions(callsData.calls || []);
      processAgentPerformance(appointmentsData.appointments || []);

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Traitement des données
  const processCallsByDay = (calls: any[]) => {
    const daysCount = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const now = new Date();
    const data: CallByDay[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = calls.filter(call => 
        call.created_at && call.created_at.startsWith(dateStr)
      ).length;

      data.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        calls: count
      });
    }

    setCallsByDay(data);
  };

  const processAppointmentsByWeekday = (appointments: any[]) => {
    const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const counts = new Array(7).fill(0);

    appointments.forEach(appt => {
      if (appt.scheduled_at) {
        const date = new Date(appt.scheduled_at);
        const day = date.getDay();
        counts[day]++;
      }
    });

    const data = weekdays.map((day, index) => ({
      day,
      count: counts[index]
    }));

    setAppointmentsByWeekday(data);
  };

  const processStatusDistribution = (appointments: any[]) => {
    const statusColors: Record<string, string> = {
      scheduled: '#64748B',
      confirmed: '#10B981',
      completed: '#6B7280',
      cancelled: '#94A3B8',
      no_show: '#A8A29E'
    };

    const statusLabels: Record<string, string> = {
      scheduled: 'Planifié',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Absent'
    };

    const statusCounts: Record<string, number> = {};

    appointments.forEach(appt => {
      const status = appt.status || 'scheduled';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const data = Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || '#6B7280'
    }));

    setStatusDistribution(data);
  };

  const processCostData = (calls: any[]) => {
    const daysCount = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const now = new Date();
    const data: CostData[] = [];
    let cumulativeCost = 0;

    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayCost = calls
        .filter(call => call.created_at && call.created_at.startsWith(dateStr))
        .reduce((sum, call) => sum + (parseFloat(call.cost) || 0), 0);

      cumulativeCost += dayCost;

      data.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        cost: parseFloat(cumulativeCost.toFixed(2))
      });
    }

    setCostData(data);
  };

  const processTopQuestions = (calls: any[]) => {
    // Simulé - dans un vrai système, on analyserait les transcripts
    const questions = [
      { question: "Quels sont vos horaires d'ouverture ?", count: 45 },
      { question: "Comment prendre rendez-vous ?", count: 38 },
      { question: "Quels types de biens proposez-vous ?", count: 32 },
      { question: "Quels sont vos tarifs ?", count: 28 },
      { question: "Où êtes-vous situés ?", count: 24 }
    ];

    setTopQuestions(questions);
  };

  const processAgentPerformance = (appointments: any[]) => {
    const agentCounts: Record<string, number> = {};

    appointments.forEach(appt => {
      const agentName = appt.agent_name || 'Non assigné';
      agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
    });

    const data = Object.entries(agentCounts)
      .map(([agent, count]) => ({ agent, rdvCreated: count }))
      .sort((a, b) => b.rdvCreated - a.rdvCreated);

    setAgentPerformance(data);
  };

  // Export PDF - lazy load jsPDF only when needed
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();

    // Titre
    doc.setFontSize(20);
    doc.text('Rapport Analytics Coccinelle.ai', 14, 22);

    doc.setFontSize(12);
    doc.text(`Période: ${period === '7d' ? '7 jours' : period === '30d' ? '30 jours' : period === '90d' ? '90 jours' : '1 an'}`, 14, 32);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 40);

    // Stats globales
    doc.setFontSize(14);
    doc.text('Statistiques Globales', 14, 55);

    (doc as any).autoTable({
      startY: 60,
      head: [['Métrique', 'Valeur']],
      body: [
        ['Documents KB', stats.totalDocuments.toString()],
        ['Total Appels', stats.totalCalls.toString()],
        ['Total RDV', stats.totalAppointments.toString()],
        ['Taux Conversion', `${stats.conversionRate.toFixed(1)}%`],
        ['Coût Total', `$${stats.totalCost.toFixed(2)}`],
        ['Durée Moyenne', `${Math.floor(stats.avgDuration / 60)}min ${stats.avgDuration % 60}s`]
      ]
    });

    // Top Questions
    doc.setFontSize(14);
    doc.text('Top 5 Questions', 14, (doc as any).lastAutoTable.finalY + 15);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Question', 'Nombre']],
      body: topQuestions.map(q => [q.question, q.count.toString()])
    });

    // Performance Agents
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Performance des Agents', 14, 22);

    (doc as any).autoTable({
      startY: 27,
      head: [['Agent', 'RDV Créés']],
      body: agentPerformance.map(a => [a.agent, a.rdvCreated.toString()])
    });

    doc.save(`analytics_coccinelle_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Filtres période - uniquement pour onglet Analytics */}
            {activeTab === 'analytics' && (
              <div className="flex gap-2">
                {(['7d', '30d', '90d', '1y'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : p === '90d' ? '90 jours' : '1 an'}
                  </button>
                ))}
              </div>
            )}

            {/* Bouton Export - uniquement pour onglet Analytics */}
            {activeTab === 'analytics' && (
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter PDF
              </button>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ai-insights'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Brain className="w-5 h-5" />
            AI Insights
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'ai-insights' && (
          <div>
            {!loading && (
              <AIInsightsPanel
                calls={calls}
                appointments={appointments}
                documents={documents}
              />
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Documents KB */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Documents indexés</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
          </div>

          {/* Total Appels */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Phone className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total appels Assistant</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
          </div>

          {/* Total RDV */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Calendar className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total RDV créés</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAppointments}</p>
          </div>

          {/* Taux Conversion */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Taux conversion</p>
            <p className="text-3xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Appels → RDV</p>
          </div>

          {/* Coût Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Coût total VAPI</p>
            <p className="text-3xl font-bold text-gray-900">${stats.totalCost.toFixed(2)}</p>
          </div>

          {/* Durée Moyenne */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Clock className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Durée moyenne appels</p>
            <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* LineChart - Évolution Appels */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des appels</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={callsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#374151" strokeWidth={2} name="Appels" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BarChart - RDV par jour */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">RDV par jour de la semaine</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentsByWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10B981" name="RDV" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PieChart - Statuts RDV */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition statuts RDV</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* AreaChart - Coûts cumulés */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coûts VAPI cumulés</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="cost" stroke="#78716C" fill="#F5F5F4" name="Coût ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tableaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Questions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Questions</h3>
            <div className="space-y-3">
              {topQuestions.map((q, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-700 flex-1">{q.question}</span>
                  <span className="ml-4 px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium">
                    {q.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Agents */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance des agents</h3>
            <div className="space-y-3">
              {agentPerformance.map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-700">{agent.agent}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">RDV créés:</span>
                    <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium">
                      {agent.rdvCreated}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROI */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Coût par RDV</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalAppointments > 0 ? (stats.totalCost / stats.totalAppointments).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Taux de présence</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusDistribution.find(s => s.name === 'Terminé')?.value || 0} / {stats.totalAppointments}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Taux absence</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusDistribution.find(s => s.name === 'Absent')?.value || 0} / {stats.totalAppointments}
              </p>
            </div>
          </div>
        </div>
          </div>
        )}
      </div>
    </div>
  );
}

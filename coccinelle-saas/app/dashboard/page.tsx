'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, FileText, Calendar, Activity,
  Users, Package, MessageSquare, TrendingUp, Zap, ArrowUpRight, Clock,
  CheckCircle2, Inbox, Settings
} from 'lucide-react';
import Link from 'next/link';
import SmartAlerts from '../../src/components/dashboard/SmartAlerts';
import NotificationCenter from '../../src/components/dashboard/NotificationCenter';
import { ToastContainer } from '../../src/components/dashboard/ToastNotification';
import GettingStartedChecklist from '../../src/components/dashboard/GettingStartedChecklist';
import { useLiveUpdates } from '../../hooks/useLiveUpdates';
import { LiveNotification } from '../../lib/live-updates';
import { isDemoMode, mockCalls, mockAppointments, mockDocuments } from '../../lib/mockData';
import { getTenantStorageKey } from '../../lib/config';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    appels: 0,
    documents: 0,
    rdv: 0,
    clients: 0
  });
  const [calls, setCalls] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastNotifications, setToastNotifications] = useState<LiveNotification[]>([]);
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  // Live updates
  const liveUpdates = useLiveUpdates(
    {
      totalAppointments: stats.rdv,
      totalCalls: stats.appels,
      totalDocuments: stats.documents,
      recentBookings: 0,
      pendingAppointments: 0,
      lastUpdate: new Date()
    },
    {
      enabled: !loading,
      interval: 5000,
      onNewNotification: (notification) => {
        setToastNotifications(prev => [...prev, notification]);
        setTimeout(() => {
          setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
      }
    }
  );

  useEffect(() => {
    loadStats();

    // Vérifier si la checklist doit être affichée
    const checklistDismissed = localStorage.getItem('getting_started_dismissed') === 'true';
    setShowGettingStarted(!checklistDismissed);
  }, []);

  const loadStats = async () => {
    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const kbDocs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
        const docsToUse = kbDocs.length > 0 ? kbDocs : mockDocuments;

        setCalls(mockCalls);
        setAppointments(mockAppointments);
        setDocuments(docsToUse);
        setStats({
          appels: mockCalls.length,
          documents: docsToUse.length,
          rdv: mockAppointments.length,
          clients: 156 // Mock data
        });
        setLoading(false);
        return;
      }

      // Mode production - fetch API
      const vapiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/vapi/calls`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const vapiData = await vapiRes.json();
      setCalls(vapiData.calls || []);

      const kbRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/knowledge/documents`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const kbData = await kbRes.json();
      setDocuments(kbData.documents || []);

      const rdvRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const rdvData = await rdvRes.json();
      setAppointments(rdvData.appointments || []);

      setStats({
        appels: vapiData.calls?.length || 0,
        documents: kbData.documents?.length || 0,
        rdv: rdvData.appointments?.length || 0,
        clients: 156 // À remplacer par vraie donnée
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };


  // Mettre à jour les stats depuis live updates
  useEffect(() => {
    if (liveUpdates.stats) {
      setStats(prev => ({
        ...prev,
        appels: liveUpdates.stats.totalCalls,
        documents: liveUpdates.stats.totalDocuments,
        rdv: liveUpdates.stats.totalAppointments
      }));
    }
  }, [liveUpdates.stats]);

  // Activités récentes (derniers appels + rendez-vous)
  const recentActivities = [
    ...calls.slice(0, 3).map(call => ({
      type: 'call',
      title: `Appel ${call.status === 'completed' ? 'terminé' : 'en cours'}`,
      description: call.customer_name || 'Client inconnu',
      time: new Date(call.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(call.created_at),
      icon: Phone,
      status: call.status
    })),
    ...appointments.slice(0, 2).map(apt => ({
      type: 'appointment',
      title: 'Rendez-vous confirmé',
      description: apt.customer_name || 'Client',
      time: new Date(apt.appointment_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(apt.appointment_date),
      icon: Calendar,
      status: 'confirmed'
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

  // Quick wins
  const quickWins = [
    {
      title: '3 RDV à confirmer',
      action: 'Confirmer',
      icon: Calendar,
      color: 'green',
      href: '/dashboard/appointments'
    },
    {
      title: '5 appels non traités',
      action: 'Écouter',
      icon: Phone,
      color: 'blue',
      href: '/dashboard/conversations/appels'
    },
    {
      title: '2 docs à valider',
      action: 'Valider',
      icon: FileText,
      color: 'purple',
      href: '/dashboard/knowledge'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      <ToastContainer
        notifications={toastNotifications}
        onClose={(id) => setToastNotifications(prev => prev.filter(n => n.id !== id))}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Tableau de bord</h2>
              <p className="text-sm text-gray-600 mt-1">
                Bienvenue sur votre assistant omnicanal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter
                notifications={liveUpdates.notifications}
                unreadCount={liveUpdates.unreadCount}
                onMarkAsRead={liveUpdates.markAsRead}
                onMarkAllAsRead={liveUpdates.markAllAsRead}
                onDelete={liveUpdates.deleteNotification}
                onClearRead={liveUpdates.clearRead}
              />
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Métriques clés - 4 cards avec micro-trends */}
          <div className="grid grid-cols-4 gap-6">
            <Link href="/dashboard/conversations/appels">
              <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                    +12%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.appels}</p>
                <p className="text-sm text-gray-600 mb-3">Appels Assistant</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span>3 aujourd'hui</span>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/knowledge">
              <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-50 group-hover:bg-purple-100 rounded-xl flex items-center justify-center transition-colors">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                    +5%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.documents}</p>
                <p className="text-sm text-gray-600 mb-3">Documents KB</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span>Base à jour</span>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/appointments">
              <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-50 group-hover:bg-green-100 rounded-xl flex items-center justify-center transition-colors">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                    +8%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.rdv}</p>
                <p className="text-sm text-gray-600 mb-3">Rendez-vous</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 text-orange-600" />
                  <span>2 cette semaine</span>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/crm">
              <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-xl flex items-center justify-center transition-colors">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                    +15%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.clients}</p>
                <p className="text-sm text-gray-600 mb-3">Clients actifs</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span>5 nouveaux</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Actions rapides - Grid 3x3 optimisé */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Actions rapides</h3>
              <span className="text-xs text-gray-500">Accès direct aux fonctionnalités</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Ligne 1 */}
              <Link href="/dashboard/conversations/appels">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <Phone className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Appels</h4>
                      <p className="text-xs text-gray-600 truncate">Historique vocal</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/knowledge">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-purple-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <FileText className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Base de connaissance</h4>
                      <p className="text-xs text-gray-600 truncate">Docs & FAQ</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/appointments">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-green-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <Calendar className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Agenda</h4>
                      <p className="text-xs text-gray-600 truncate">Rendez-vous</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              {/* Ligne 2 */}
              <Link href="/dashboard/crm">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-orange-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <Users className="w-5 h-5 text-orange-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">CRM</h4>
                      <p className="text-xs text-gray-600 truncate">Contacts & leads</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/products">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-pink-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <Package className="w-5 h-5 text-pink-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Produits</h4>
                      <p className="text-xs text-gray-600 truncate">Catalogue</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/channels">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-teal-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <MessageSquare className="w-5 h-5 text-teal-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Canaux</h4>
                      <p className="text-xs text-gray-600 truncate">Multi-canal</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              {/* Ligne 3 */}
              <Link href="/dashboard/analytics">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-indigo-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <TrendingUp className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Analytics</h4>
                      <p className="text-xs text-gray-600 truncate">Rapports</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/inbox">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-cyan-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <Inbox className="w-5 h-5 text-cyan-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Inbox</h4>
                      <p className="text-xs text-gray-600 truncate">Messages</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/settings">
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gray-50 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                      <Settings className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-0.5 truncate">Configuration</h4>
                      <p className="text-xs text-gray-600 truncate">Paramètres</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Section 2 colonnes: Activité + Quick Wins */}
          <div className="grid grid-cols-3 gap-6">
            {/* Activité récente - 2/3 avec timeline verticale */}
            <div className="col-span-2">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-600" />
                    Activité récente
                  </h3>
                  <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    Tout voir
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Timeline verticale */}
                <div className="space-y-0">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => {
                      const Icon = activity.icon;
                      const isLast = index === recentActivities.length - 1;

                      return (
                        <div key={index} className="flex items-start gap-4 pb-4 relative">
                          {/* Timeline line */}
                          {!isLast && (
                            <div className="absolute left-5 top-12 bottom-0 w-px bg-gray-200" />
                          )}

                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center relative z-10 ${
                            activity.type === 'call' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-green-50 border-2 border-green-200'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              activity.type === 'call' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 pt-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-gray-900">{activity.title}</p>
                                <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5" />
                                {activity.time}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Aucune activité récente</p>
                      <p className="text-sm mt-1">Les événements apparaîtront ici</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Wins & Alerts - 1/3 */}
            <div className="space-y-4">
              {/* Quick Wins - Actions prioritaires */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-gray-900">Quick Wins</h3>
                </div>
                <div className="space-y-2">
                  {quickWins.map((win, index) => (
                    <Link key={index} href={win.href}>
                      <div className="bg-white rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group border border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 bg-${win.color}-50 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <win.icon className={`w-4 h-4 text-${win.color}-600`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{win.title}</p>
                            <p className="text-xs text-gray-600">{win.action}</p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Getting Started Checklist */}
              {showGettingStarted && (
                <GettingStartedChecklist
                  documentsCount={stats.documents}
                  callsCount={stats.appels}
                  appointmentsCount={stats.rdv}
                  onDismiss={() => {
                    setShowGettingStarted(false);
                    localStorage.setItem('getting_started_dismissed', 'true');
                  }}
                />
              )}

              {/* Smart Alerts */}
              <SmartAlerts calls={calls} appointments={appointments} documents={documents} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

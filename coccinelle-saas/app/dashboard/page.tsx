'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, FileText, Calendar, BarChart3, LogOut, Activity, Settings, Home,
  Users, Zap, ShoppingCart, TrendingUp, MessageSquare, Building2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Mail, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import SmartAlerts from '../../src/components/dashboard/SmartAlerts';
import NotificationCenter from '../../src/components/dashboard/NotificationCenter';
import { ToastContainer } from '../../src/components/dashboard/ToastNotification';
import GettingStartedChecklist from '../../src/components/dashboard/GettingStartedChecklist';
import { useLiveUpdates } from '../../hooks/useLiveUpdates';
import { LiveNotification } from '../../lib/live-updates';
import { isDemoMode, mockCalls, mockAppointments, mockDocuments } from '../../lib/mockData';
import Logo from '../../src/components/Logo';
import { getTenantStorageKey } from '../../lib/config';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    appels: 0,
    documents: 0,
    rdv: 0
  });
  const [calls, setCalls] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast notifications state
  const [toastNotifications, setToastNotifications] = useState<LiveNotification[]>([]);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [kbMethod, setKbMethod] = useState<string | null>(null);

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check if right sidebar should be visible
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Dashboard sections collapse state
  const [dashboardSections, setDashboardSections] = useState({
    crm: true,
    canaux: false,
    knowledge: false,
    analytics: false
  });

  useEffect(() => {
    const checklistDismissed = localStorage.getItem('getting_started_dismissed') === 'true';
    // Pour l'instant on masque la sidebar si la checklist est dismissed
    // Plus tard on pourra ajouter d'autres conditions (alertes, etc.)
    setShowRightSidebar(!checklistDismissed);

    // Load dashboard sections state from localStorage
    const savedDashboardSections = localStorage.getItem('dashboard_sections');
    if (savedDashboardSections) {
      setDashboardSections(JSON.parse(savedDashboardSections));
    }
  }, []);

  const toggleDashboardSection = (section: keyof typeof dashboardSections) => {
    const newSections = {
      ...dashboardSections,
      [section]: !dashboardSections[section]
    };
    setDashboardSections(newSections);
    localStorage.setItem('dashboard_sections', JSON.stringify(newSections));
  };

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
      enabled: !loading, // Activer après chargement initial
      interval: 5000, // 5 secondes (plus rapide pour tester)
      onNewNotification: (notification) => {
        // Ajouter au toast
        setToastNotifications(prev => [...prev, notification]);

        // Auto-remove après 5 secondes
        setTimeout(() => {
          setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
      }
    }
  );

  useEffect(() => {
    loadStats();

    // Vérifier si c'est la première visite après onboarding
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    const welcomeShown = localStorage.getItem('welcome_banner_shown');
    const method = localStorage.getItem('kb_method');

    if (onboardingCompleted === 'true' && !welcomeShown) {
      setShowWelcomeBanner(true);
      setKbMethod(method);
    }

    // Charger l'état de la sidebar depuis localStorage
    const savedSidebarState = localStorage.getItem('sidebar_collapsed');
    if (savedSidebarState !== null) {
      setSidebarCollapsed(savedSidebarState === 'true');
    }
  }, []);

  // Sauvegarder l'état de la sidebar dans localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const loadStats = async () => {
    try {
      // Mode démo - utiliser mockData + localStorage pour KB
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Récupérer les documents depuis localStorage (créés par l'assistant guidé)
        const kbDocs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
        const docsToUse = kbDocs.length > 0 ? kbDocs : mockDocuments;

        setCalls(mockCalls);
        setAppointments(mockAppointments);
        setDocuments(docsToUse);
        setStats({
          appels: mockCalls.length,
          documents: docsToUse.length,
          rdv: mockAppointments.length
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
        rdv: rdvData.appointments?.length || 0
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Mettre à jour les stats depuis live updates
  useEffect(() => {
    if (liveUpdates.stats) {
      setStats({
        appels: liveUpdates.stats.totalCalls,
        documents: liveUpdates.stats.totalDocuments,
        rdv: liveUpdates.stats.totalAppointments
      });
    }
  }, [liveUpdates.stats]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col fixed h-screen transition-all duration-300`}>
        {/* Logo */}
        <div className={`p-6 border-b border-gray-200 ${sidebarCollapsed ? 'flex flex-col items-center' : 'relative'}`}>
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Logo size={40} />
            {!sidebarCollapsed && (
              <div className="flex-1">
                <h1 className="text-lg font-bold">Coccinelle.AI</h1>
                {liveUpdates.isPolling && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Live
                  </div>
                )}
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                title="Réduire la barre latérale"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              title="Ouvrir la barre latérale"
              className="mt-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Navigation Accordéon */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* CRM & Clients */}
          <div>
            <div
              className="text-sm font-semibold px-3 py-2 flex items-center justify-between text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => toggleDashboardSection('crm')}
            >
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-700" />
                    CRM & Clients
                  </div>
                  {dashboardSections.crm ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </>
              ) : (
                <Users className="w-5 h-5 text-gray-700" />
              )}
            </div>
          </div>

          {/* Canaux de communication */}
          <div>
            <div
              className="text-sm font-semibold px-3 py-2 flex items-center justify-between text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => toggleDashboardSection('canaux')}
            >
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-700" />
                    Canaux de communication
                  </div>
                  {dashboardSections.canaux ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </>
              ) : (
                <MessageSquare className="w-5 h-5 text-gray-700" />
              )}
            </div>
          </div>

          {/* Base de connaissances */}
          <div>
            <div
              className="text-sm font-semibold px-3 py-2 flex items-center justify-between text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => toggleDashboardSection('knowledge')}
            >
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-700" />
                    Base de connaissances
                  </div>
                  {dashboardSections.knowledge ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </>
              ) : (
                <FileText className="w-5 h-5 text-gray-700" />
              )}
            </div>
          </div>

          {/* Analytics & Rapports */}
          <div>
            <div
              className="text-sm font-semibold px-3 py-2 flex items-center justify-between text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => toggleDashboardSection('analytics')}
            >
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-700" />
                    Analytics & Rapports
                  </div>
                  {dashboardSections.analytics ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </>
              ) : (
                <BarChart3 className="w-5 h-5 text-gray-700" />
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className={`w-full flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Toast Notifications */}
      <ToastContainer
        notifications={toastNotifications}
        onClose={(id) => setToastNotifications(prev => prev.filter(n => n.id !== id))}
      />

      {/* Main Content */}
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        {/* Header - Version compacte */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-2 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Tableau de bord</h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Center */}
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

        <div className="flex">
          {/* Main Dashboard Content */}
          <div className="flex-1 p-4">
            {/* Welcome Banner */}
            {showWelcomeBanner && (
              <div className="mb-6 bg-gray-100 border-2 border-gray-300 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {kbMethod === 'assistant' ? '🎉 Sara a créé votre Knowledge Base' : '👋 Bienvenue sur Coccinelle.AI !'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {kbMethod === 'assistant'
                        ? `${stats.documents} documents générés. Commencez par tester Sara !`
                        : "Votre plateforme est prête. Explorez les modules ci-dessous."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowWelcomeBanner(false);
                      localStorage.setItem('welcome_banner_shown', 'true');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Stats principales en hero - Version compacte */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700 text-sm">Appels Sara</h3>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.appels}</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700 text-sm">Documents KB</h3>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.documents}</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700 text-sm">Rendez-vous</h3>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.rdv}</p>
              </div>
            </div>

            {/* Actions rapides par catégorie - Grid 2x2 uniforme - Version compacte */}
            <div className="space-y-5">
              {/* CRM & Clients */}
              {dashboardSections.crm && (
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-900">
                    <Users className="w-4 h-4 text-gray-700" />
                    CRM & Clients
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                  <Link href="/dashboard/customers">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Users className="w-4 h-4 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Clients & Prospects</h4>
                      </div>
                      <p className="text-xs text-gray-600">Base clients et leads</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/rdv">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Calendar className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Rendez-vous</h4>
                      </div>
                      <p className="text-xs text-gray-600">Calendrier et planification</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/properties">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <ShoppingCart className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Catalogue</h4>
                      </div>
                      <p className="text-xs text-gray-600">Produits et services</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/settings/integrations">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Zap className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Intégrations CRM</h4>
                      </div>
                      <p className="text-xs text-gray-600">HubSpot, Salesforce...</p>
                    </div>
                  </Link>
                </div>
                </div>
              )}

              {/* Canaux de communication */}
              {dashboardSections.canaux && (
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-900">
                    <MessageSquare className="w-4 h-4 text-gray-700" />
                    Canaux de communication
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                  {/* Canal Voix - Groupé */}
                  <div className="col-span-2 bg-gray-50 p-3 rounded-lg border-2 border-gray-300">
                    <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Canal Voix
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <Link href="/dashboard/appels">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                          <div className="flex flex-col items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                            <span className="text-xs font-medium text-gray-900">Historique</span>
                          </div>
                        </div>
                      </Link>
                      <Link href="/dashboard/sara">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                          <div className="flex flex-col items-center gap-1">
                            <Settings className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                            <span className="text-xs font-medium text-gray-900">Config Sara</span>
                          </div>
                        </div>
                      </Link>
                      <Link href="/dashboard/sara-analytics">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                          <div className="flex flex-col items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                            <span className="text-xs font-medium text-gray-900">Analytics</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  <Link href="/dashboard/settings/channels">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <MessageCircle className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">SMS</h4>
                      </div>
                      <p className="text-xs text-gray-600">Configuration SMS</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/settings/channels">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Mail className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Email</h4>
                      </div>
                      <p className="text-xs text-gray-600">Configuration Email</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/settings/channels">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <MessageSquare className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">WhatsApp</h4>
                      </div>
                      <p className="text-xs text-gray-600">Configuration WhatsApp</p>
                    </div>
                  </Link>
                </div>
                </div>
              )}

              {/* Base de connaissances */}
              {dashboardSections.knowledge && (
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-900">
                    <FileText className="w-4 h-4 text-gray-700" />
                    Base de connaissances
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                  <Link href="/dashboard/knowledge">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <FileText className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Knowledge Base</h4>
                      </div>
                      <p className="text-xs text-gray-600">Base documentaire</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/knowledge">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <FileText className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Documents</h4>
                      </div>
                      <p className="text-xs text-gray-600">Gestion des fichiers</p>
                    </div>
                  </Link>
                </div>
                </div>
              )}

              {/* Analytics & Rapports */}
              {dashboardSections.analytics && (
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-900">
                    <BarChart3 className="w-4 h-4 text-gray-700" />
                    Analytics & Rapports
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                  <Link href="/dashboard/analytics">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <BarChart3 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Dashboard Global</h4>
                      </div>
                      <p className="text-xs text-gray-600">Vue d'ensemble complète</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/analytics">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <TrendingUp className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Conversion & Stats</h4>
                      </div>
                      <p className="text-xs text-gray-600">Taux et entonnoirs</p>
                    </div>
                  </Link>
                </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Alerts & Checklist */}
          {showRightSidebar && (
            <div className="w-80 p-6 space-y-6">
              {!loading && (
                <>
                  <GettingStartedChecklist
                    documentsCount={stats.documents}
                    callsCount={stats.appels}
                    appointmentsCount={stats.rdv}
                    onDismiss={() => setShowRightSidebar(false)}
                  />
                  <SmartAlerts calls={calls} appointments={appointments} documents={documents} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

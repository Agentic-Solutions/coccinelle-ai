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

  // Menu sections collapse state
  const [menuSections, setMenuSections] = useState({
    analytics: true,
    crm: true,
    configuration: true
  });

  useEffect(() => {
    const checklistDismissed = localStorage.getItem('getting_started_dismissed') === 'true';
    // Pour l'instant on masque la sidebar si la checklist est dismissed
    // Plus tard on pourra ajouter d'autres conditions (alertes, etc.)
    setShowRightSidebar(!checklistDismissed);

    // Load menu sections state from localStorage
    const savedSections = localStorage.getItem('menu_sections');
    if (savedSections) {
      setMenuSections(JSON.parse(savedSections));
    }
  }, []);

  const toggleMenuSection = (section: keyof typeof menuSections) => {
    const newSections = {
      ...menuSections,
      [section]: !menuSections[section]
    };
    setMenuSections(newSections);
    localStorage.setItem('menu_sections', JSON.stringify(newSections));
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

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <Link href="/dashboard" title="Dashboard">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg bg-gray-900 text-white font-medium`}>
              <Home className="w-5 h-5" />
              {!sidebarCollapsed && 'Dashboard'}
            </div>
          </Link>

          {/* Paramètres */}
          <Link href="/dashboard/settings" title="Paramètres">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
              <Settings className="w-5 h-5" />
              {!sidebarCollapsed && 'Paramètres'}
            </div>
          </Link>

          {/* Section Analytics */}
          {!sidebarCollapsed && (
            <div
              className="pt-4 pb-2 px-4 flex items-center justify-between cursor-pointer group"
              onClick={() => toggleMenuSection('analytics')}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Analytics
              </span>
              {menuSections.analytics ? (
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              )}
            </div>
          )}
          {(sidebarCollapsed || menuSections.analytics) && (
            <>
              <Link href="/dashboard/appels" title="Historique des appels">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Phone className="w-5 h-5" />
                  {!sidebarCollapsed && 'Historique des appels'}
                </div>
              </Link>
              <Link href="/dashboard/analytics" title="Analytics générales">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <BarChart3 className="w-5 h-5" />
                  {!sidebarCollapsed && 'Analytics'}
                </div>
              </Link>
              <Link href="/dashboard/sara-analytics" title="Sara Analytics">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <TrendingUp className="w-5 h-5" />
                  {!sidebarCollapsed && 'Sara Analytics'}
                </div>
              </Link>
            </>
          )}

          {/* Section CRM & Clients */}
          {!sidebarCollapsed && (
            <div
              className="pt-4 pb-2 px-4 flex items-center justify-between cursor-pointer group"
              onClick={() => toggleMenuSection('crm')}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                CRM & Clients
              </span>
              {menuSections.crm ? (
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              )}
            </div>
          )}
          {(sidebarCollapsed || menuSections.crm) && (
            <>
              <Link href="/dashboard/customers" title="Clients">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Users className="w-5 h-5" />
                  {!sidebarCollapsed && 'Clients'}
                </div>
              </Link>
              <Link href="/dashboard/rdv" title="Rendez-vous">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Calendar className="w-5 h-5" />
                  {!sidebarCollapsed && 'Rendez-vous'}
                </div>
              </Link>
              <Link href="/dashboard/properties" title="Biens immobiliers">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Building2 className="w-5 h-5" />
                  {!sidebarCollapsed && 'Biens immobiliers'}
                </div>
              </Link>
            </>
          )}

          {/* Section Configuration */}
          {!sidebarCollapsed && (
            <div
              className="pt-4 pb-2 px-4 flex items-center justify-between cursor-pointer group"
              onClick={() => toggleMenuSection('configuration')}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Configuration
              </span>
              {menuSections.configuration ? (
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              )}
            </div>
          )}
          {(sidebarCollapsed || menuSections.configuration) && (
            <>
              <Link href="/dashboard/knowledge" title="Base de connaissances">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <FileText className="w-5 h-5" />
                  {!sidebarCollapsed && 'Base de connaissances'}
                </div>
              </Link>
              <Link href="/dashboard/sara" title="Paramètres Sara">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Settings className="w-5 h-5" />
                  {!sidebarCollapsed && 'Paramètres Sara'}
                </div>
              </Link>
              <Link href="/dashboard/settings/channels?channel=sms" title="SMS">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <MessageCircle className="w-5 h-5" />
                  {!sidebarCollapsed && 'SMS'}
                </div>
              </Link>
              <Link href="/dashboard/settings/channels?channel=whatsapp" title="WhatsApp">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <MessageSquare className="w-5 h-5" />
                  {!sidebarCollapsed && 'WhatsApp'}
                </div>
              </Link>
              <Link href="/dashboard/settings/channels?channel=email" title="Email">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Mail className="w-5 h-5" />
                  {!sidebarCollapsed && 'Email'}
                </div>
              </Link>
              <Link href="/dashboard/settings/integrations" title="Intégrations">
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors`}>
                  <Zap className="w-5 h-5" />
                  {!sidebarCollapsed && 'Intégrations'}
                </div>
              </Link>
            </>
          )}
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
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Tableau de bord</h2>
              <p className="text-sm text-gray-600">Vue d'ensemble de votre plateforme</p>
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
          <div className="flex-1 p-8">
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

            {/* Stats principales en hero */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white border-2 border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Appels Sara</h3>
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold mb-1 text-gray-900">{stats.appels}</p>
                <p className="text-sm text-gray-600">Total des appels</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Documents KB</h3>
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold mb-1 text-gray-900">{stats.documents}</p>
                <p className="text-sm text-gray-600">Base de connaissances</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Rendez-vous</h3>
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold mb-1 text-gray-900">{stats.rdv}</p>
                <p className="text-sm text-gray-600">Confirmés</p>
              </div>
            </div>

            {/* Actions rapides par catégorie */}
            <div className="space-y-8">
              {/* CRM & Clients */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <Users className="w-5 h-5 text-gray-700" />
                  CRM & Clients
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/dashboard/customers">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Users className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Gestion des clients</h4>
                      </div>
                      <p className="text-sm text-gray-600">Gérez votre base clients et prospects</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/settings/integrations">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Zap className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Intégrations CRM</h4>
                      </div>
                      <p className="text-sm text-gray-600">HubSpot, Salesforce, et plus</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Agent IA Sara */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <Phone className="w-5 h-5 text-gray-700" />
                  Agent IA Sara
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Link href="/dashboard/appels">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Phone className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Appels</h4>
                      </div>
                      <p className="text-sm text-gray-600">Historique et statistiques</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/sara">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Settings className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Configuration</h4>
                      </div>
                      <p className="text-sm text-gray-600">Voix et personnalité</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/sara-analytics">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-900 hover:shadow-md transition-all cursor-pointer group relative">
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-900 text-white text-xs font-bold rounded">NEW</span>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900">Analytics</h4>
                      </div>
                      <p className="text-sm text-gray-600">Analyse des performances</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Gestion & Contenu */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <FileText className="w-5 h-5 text-gray-700" />
                  Gestion & Contenu
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Link href="/dashboard/knowledge">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <FileText className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Knowledge Base</h4>
                      </div>
                      <p className="text-sm text-gray-600">Documents et contenus</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/rdv">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Calendar className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Rendez-vous</h4>
                      </div>
                      <p className="text-sm text-gray-600">Calendrier et planification</p>
                    </div>
                  </Link>

                  <Link href="/dashboard/properties">
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                          <Building2 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="font-bold text-gray-900">Biens</h4>
                      </div>
                      <p className="text-sm text-gray-600">Catalogue immobilier</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Analytics */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <BarChart3 className="w-5 h-5 text-gray-700" />
                  Analytics & Rapports
                </h3>
                <Link href="/dashboard/analytics">
                  <div className="bg-white p-5 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                        <BarChart3 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                      </div>
                      <h4 className="font-bold text-gray-900">Tableau de bord Analytics</h4>
                    </div>
                    <p className="text-sm text-gray-600">Métriques globales et analyses détaillées</p>
                  </div>
                </Link>
              </div>
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

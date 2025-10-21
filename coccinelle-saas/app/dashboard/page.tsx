'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, FileText, Calendar, BarChart3, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    appels: 0,
    documents: 0,
    rdv: 0
  });

  useEffect(() => {
    // Charger les stats réelles depuis l'API
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Stats VAPI
      const vapiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/vapi/stats`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const vapiData = await vapiRes.json();

      // Stats KB
      const kbRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/knowledge/documents`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const kbData = await kbRes.json();

      // Stats RDV
      const rdvRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      const rdvData = await rdvRes.json();

      setStats({
        appels: vapiData.stats?.total_calls || 0,
        documents: kbData.documents?.length || 0,
        rdv: rdvData.appointments?.length || 0
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h1 className="text-2xl font-bold">Coccinelle.AI</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Titre */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-gray-600">Gérez votre plateforme d'IA vocale</p>
        </div>

        {/* Cards statistiques */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Appels Sara</h3>
              <Phone className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">{stats.appels}</p>
            <p className="text-sm text-gray-500 mt-2">Total des appels</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Documents KB</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">{stats.documents}</p>
            <p className="text-sm text-gray-500 mt-2">Base de connaissances</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Rendez-vous</h3>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">{stats.rdv}</p>
            <p className="text-sm text-gray-500 mt-2">Confirmés</p>
          </div>
        </div>

        {/* Modules disponibles */}
        <div>
          <h3 className="text-xl font-bold mb-4">Modules disponibles</h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Agent Vocal */}
            <Link href="/dashboard/appels">
              <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-black rounded flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Agent Vocal Sara</h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Consultez les statistiques et l'historique des appels de Sara
                    </p>
                    <span className="text-sm text-black font-medium">Voir les appels →</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Knowledge Base */}
            <Link href="/dashboard/knowledge">
              <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-black rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Knowledge Base</h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Gérez les documents et la base de connaissances de Sara
                    </p>
                    <span className="text-sm text-black font-medium">Gérer les documents →</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Rendez-vous */}
            <Link href="/dashboard/rdv">
              <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-black rounded flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Rendez-vous</h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Calendrier et gestion des rendez-vous pris par Sara
                    </p>
                    <span className="text-sm text-black font-medium">Voir le calendrier →</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Analytics */}
            <Link href="/dashboard/analytics">
              <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-black hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-black rounded flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Analytics</h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Métriques globales et analyses détaillées de performance
                    </p>
                    <span className="text-sm text-black font-medium">Voir les stats →</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

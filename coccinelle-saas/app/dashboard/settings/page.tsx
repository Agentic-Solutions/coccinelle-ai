'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ProfileForm from '@/components/settings/ProfileForm';
import APIKeysForm from '@/components/settings/APIKeysForm';
import NotificationsSettings from '@/components/settings/NotificationsSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import AvailabilitySettings from '@/components/settings/AvailabilitySettings';
import TeamManagement from '@/components/settings/TeamManagement';
import CalendarIntegration from '@/components/settings/CalendarIntegration';
import EmailConfiguration from '@/components/settings/EmailConfiguration';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    // Compte & Personnel
    { id: 'section1', label: 'COMPTE & PERSONNEL', isSection: true },
    { id: 'profile', label: 'Profil' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Sécurité' },

    // Configuration Business
    { id: 'section2', label: 'CONFIGURATION BUSINESS', isSection: true },
    { id: 'availability', label: 'Disponibilités' },
    { id: 'calendar', label: 'Calendriers' },
    { id: 'email', label: 'Email' },
    { id: 'channels', label: 'Canaux de communication', link: '/dashboard/settings/channels' },

    // Équipe & Développement
    { id: 'section3', label: 'ÉQUIPE & DÉVELOPPEMENT', isSection: true },
    { id: 'team', label: 'Equipe' },
    { id: 'api', label: 'Cles API' },

    // Zone dangereuse
    { id: 'section4', label: 'ZONE DANGEREUSE', isSection: true },
    { id: 'danger', label: 'Supprimer le compte' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="hidden sm:block">
              <Logo size={48} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Parametres</h1>
              <p className="text-xs sm:text-sm text-gray-600">Gerez votre compte et vos preferences</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Menu lateral - horizontal scroll on mobile, vertical on desktop */}
          <div className="lg:w-64 flex-shrink-0">
            {/* Mobile: horizontal tabs */}
            <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2">
              <div className="flex gap-2 min-w-max">
                {tabs.filter(tab => !tab.isSection).map((tab) => {
                  if (tab.link) {
                    return (
                      <Link key={tab.id} href={tab.link}>
                        <div className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-gray-700 bg-white border border-gray-200">
                          {tab.label}
                        </div>
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 bg-white border border-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop: vertical nav */}
            <nav className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 p-2">
              {tabs.map((tab, index) => {
                if (tab.isSection) {
                  return (
                    <div
                      key={tab.id}
                      className={`px-4 py-2 ${index > 0 ? 'mt-4' : 'mt-0'}`}
                    >
                      <span className="text-xs font-bold text-gray-500 tracking-wider">
                        {tab.label}
                      </span>
                    </div>
                  );
                }

                if (tab.link) {
                  return (
                    <Link key={tab.id} href={tab.link}>
                      <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100 cursor-pointer">
                        <span className="font-medium">{tab.label}</span>
                      </div>
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {activeTab === 'availability' && <AvailabilitySettings />}
            {activeTab === 'team' && <TeamManagement />}
            {activeTab === 'calendar' && <CalendarIntegration />}
            {activeTab === 'email' && <EmailConfiguration />}
            {activeTab === 'profile' && <ProfileForm />}
            {activeTab === 'api' && <APIKeysForm />}
            {activeTab === 'notifications' && <NotificationsSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'danger' && <DangerZone onAccountDeleted={() => {
              localStorage.clear();
              router.push('/login');
            }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerZone({ onAccountDeleted }: { onAccountDeleted: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');

    if (confirmation !== 'SUPPRIMER') {
      setError('Tapez exactement SUPPRIMER pour confirmer');
      return;
    }

    if (!password) {
      setError('Le mot de passe est requis');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password, confirmation })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la suppression');
        return;
      }

      onAccountDeleted();
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-red-600 mb-2">Zone dangereuse</h2>
      <p className="text-sm text-gray-600 mb-6">
        Les actions ci-dessous sont irreversibles. Procedez avec prudence.
      </p>

      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <h3 className="font-semibold text-red-800 mb-2">Supprimer mon compte</h3>
        <p className="text-sm text-red-700 mb-4">
          Cette action supprimera definitivement votre compte et toutes vos donnees
          (prospects, clients, produits, rendez-vous). Cette operation est irreversible.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Supprimer mon compte
        </button>
      </div>

      {/* Modal de confirmation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cette action est irreversible. Toutes vos donnees seront supprimees definitivement.
            </p>

            {error && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tapez SUPPRIMER pour confirmer
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="SUPPRIMER"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Votre mot de passe"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setConfirmation('');
                  setPassword('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmation !== 'SUPPRIMER' || !password}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

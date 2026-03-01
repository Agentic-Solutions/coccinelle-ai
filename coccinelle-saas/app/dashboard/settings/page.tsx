'use client';

import { useState } from 'react';
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

export default function SettingsPage() {
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
    { id: 'team', label: 'Équipe' },
    { id: 'api', label: 'Clés API' },
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
          </div>
        </div>
      </div>
    </div>
  );
}

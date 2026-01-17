'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, BookOpen, Settings as SettingsIcon, Check } from 'lucide-react';
import AssistantConfigStep from '@/components/onboarding/SaraConfigStep';
import Link from 'next/link';

export default function AssistantConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const [activeTab, setActiveTab] = useState('agent');
  const [saved, setSaved] = useState(false);

  const handleSaveAgent = async (data: any) => {
    try {
      // TODO: Appeler l'API pour sauvegarder la configuration
      console.log('Saving agent configuration:', data);

      // Simuler une sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Redirect to onboarding if coming from there
      if (fromOnboarding) {
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving agent configuration:', error);
    }
  };

  const tabs = [
    { id: 'agent', label: 'Type d\'agent', icon: Bot },
    { id: 'knowledge', label: 'Base de connaissances', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assistant IA</h1>
              <p className="text-gray-600 mt-1">
                Configurez votre assistant intelligent et sa base de connaissances
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-4 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">Configuration sauvegardée avec succès!</span>
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <AssistantConfigStep
              sessionId={null}
              onNext={handleSaveAgent}
              onBack={() => {}}
              loading={false}
            />
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Base de connaissances
              </h3>
              <p className="text-gray-600 mb-6">
                Gérez les documents et informations de votre assistant
              </p>
              <Link
                href="/dashboard/knowledge"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Accéder à la base de connaissances
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

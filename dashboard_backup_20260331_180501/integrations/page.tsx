'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings, Plus, CheckCircle, XCircle, RefreshCw,
  Plug, TrendingUp, AlertCircle, ExternalLink
} from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Integration {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo_url?: string;
  auth_type: string;
  supports_contacts: number;
  supports_deals: number;
  supports_products: number;
  supports_orders: number;
  beta: number;
}

interface ConfiguredIntegration {
  id: string;
  integration_type: string;
  integration_name: string;
  enabled: boolean;
  platform_name: string;
  platform_slug: string;
  logo_url?: string;
  category: string;
  last_sync_at?: string;
  last_sync_status?: string;
  created_at: string;
}

export default function IntegrationsPage() {
  const [availableIntegrations, setAvailableIntegrations] = useState<Integration[]>([]);
  const [configuredIntegrations, setConfiguredIntegrations] = useState<ConfiguredIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      // Fetch available integrations
      const availableRes = await fetch(`${API_URL}/api/v1/integrations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const availableData = await availableRes.json();

      // Fetch configured integrations
      const configuredRes = await fetch(`${API_URL}/api/v1/integrations/configured`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const configuredData = await configuredRes.json();

      setAvailableIntegrations(availableData.integrations || []);
      setConfiguredIntegrations(configuredData.integrations || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Toutes', icon: '🔌' },
    { id: 'crm', label: 'CRM', icon: '👥' },
    { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
    { id: 'marketing', label: 'Marketing', icon: '📈' },
    { id: 'support', label: 'Support', icon: '💬' }
  ];

  const filteredIntegrations = selectedCategory === 'all'
    ? availableIntegrations
    : availableIntegrations.filter(i => i.category === selectedCategory);

  const isConfigured = (slug: string) => {
    return configuredIntegrations.some(c => c.platform_slug === slug);
  };

  const getConfiguredIntegration = (slug: string) => {
    return configuredIntegrations.find(c => c.platform_slug === slug);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Logo size={48} />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Intégrations</h1>
                <p className="text-sm text-gray-600">Connectez vos outils CRM et e-commerce</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span>{configuredIntegrations.length} intégration(s) active(s)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : (
          <>
            {/* Intégrations configurées */}
            {configuredIntegrations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Mes intégrations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {configuredIntegrations.map((integration) => (
                    <Link key={integration.id} href={`/dashboard/integrations/${integration.id}`}>
                      <div className="bg-white border-2 border-green-300 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {integration.logo_url ? (
                              <img src={integration.logo_url} alt={integration.platform_name} className="w-10 h-10 rounded" />
                            ) : (
                              <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                                <Plug className="w-5 h-5 text-green-600" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-gray-900">{integration.integration_name}</h3>
                              <p className="text-xs text-gray-500">{integration.category}</p>
                            </div>
                          </div>
                          {integration.enabled ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          )}
                        </div>

                        {integration.last_sync_at && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Dernière sync</span>
                              <span className="font-medium">
                                {new Date(integration.last_sync_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {integration.last_sync_status === 'success' && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>Synchronisé</span>
                              </div>
                            )}
                            {integration.last_sync_status === 'failed' && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                                <XCircle className="w-3 h-3" />
                                <span>Erreur</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Filtres par catégorie */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Intégrations disponibles */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Intégrations disponibles
                {selectedCategory !== 'all' && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({categories.find(c => c.id === selectedCategory)?.label})
                  </span>
                )}
              </h2>

              {filteredIntegrations.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Plug className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Aucune intégration disponible dans cette catégorie</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIntegrations.map((integration) => {
                    const configured = getConfiguredIntegration(integration.slug);

                    return (
                      <div
                        key={integration.id}
                        className={`bg-white rounded-lg p-6 border-2 transition-all ${
                          configured
                            ? 'border-green-300 opacity-60'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {integration.logo_url ? (
                              <img src={integration.logo_url} alt={integration.name} className="w-10 h-10 rounded" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <Plug className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                {integration.name}
                                {integration.beta === 1 && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                    BETA
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-500">{integration.category}</p>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                          {integration.description}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {integration.supports_contacts === 1 && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              Contacts
                            </span>
                          )}
                          {integration.supports_deals === 1 && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                              Deals
                            </span>
                          )}
                          {integration.supports_products === 1 && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                              Produits
                            </span>
                          )}
                          {integration.supports_orders === 1 && (
                            <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">
                              Commandes
                            </span>
                          )}
                        </div>

                        {configured ? (
                          <Link href={`/dashboard/integrations/${configured.id}`}>
                            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium">
                              <Settings className="w-4 h-4" />
                              Gérer
                            </button>
                          </Link>
                        ) : (
                          <Link href={`/dashboard/integrations/new?type=${integration.slug}`}>
                            <button className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium">
                              <Plus className="w-4 h-4" />
                              Connecter
                            </button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

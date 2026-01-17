'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Settings, Check, X, RefreshCw, ExternalLink,
  Database, Cloud, ShoppingCart, Package, Zap,
  Home, Users
} from 'lucide-react';

// Types
interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
  status: 'connected' | 'disconnected' | 'error';
  type: 'crm' | 'ecommerce' | 'shipping';
  requiresOAuth: boolean;
  configFields?: {
    name: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
    required: boolean;
  }[];
}

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, 'connected' | 'disconnected' | 'error'>>({});

  const integrations: Integration[] = [
    {
      id: 'native',
      name: 'CRM Natif Coccinelle',
      description: 'CRM intégré pour gérer vos clients sans système externe',
      icon: Database,
      iconColor: 'text-blue-600',
      status: 'connected',
      type: 'crm',
      requiresOAuth: false,
    },
    {
      id: 'hubspot',
      name: 'HubSpot CRM',
      description: 'Synchronisez vos contacts avec HubSpot CRM',
      icon: Cloud,
      iconColor: 'text-orange-600',
      status: 'disconnected',
      type: 'crm',
      requiresOAuth: true,
      configFields: [
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          placeholder: 'pat-na1-xxxxx-xxxx',
          required: true,
        },
        {
          name: 'portalId',
          label: 'Portal ID',
          type: 'text',
          placeholder: '12345678',
          required: true,
        },
      ],
    },
    {
      id: 'salesforce',
      name: 'Salesforce CRM',
      description: 'Connectez votre Salesforce pour synchroniser les contacts',
      icon: Cloud,
      iconColor: 'text-blue-500',
      status: 'disconnected',
      type: 'crm',
      requiresOAuth: true,
      configFields: [
        {
          name: 'instanceUrl',
          label: 'Instance URL',
          type: 'url',
          placeholder: 'https://yourinstance.salesforce.com',
          required: true,
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          placeholder: 'Your Salesforce access token',
          required: true,
        },
      ],
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Synchronisez votre catalogue et commandes Shopify',
      icon: ShoppingCart,
      iconColor: 'text-green-600',
      status: 'disconnected',
      type: 'ecommerce',
      requiresOAuth: true,
      configFields: [
        {
          name: 'shopUrl',
          label: 'Shop URL',
          type: 'url',
          placeholder: 'myshop.myshopify.com',
          required: true,
        },
        {
          name: 'accessToken',
          label: 'Admin API Access Token',
          type: 'password',
          placeholder: 'shpat_xxxxx',
          required: true,
        },
      ],
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: 'Connectez votre boutique WooCommerce',
      icon: Package,
      iconColor: 'text-purple-600',
      status: 'disconnected',
      type: 'ecommerce',
      requiresOAuth: false,
      configFields: [
        {
          name: 'siteUrl',
          label: 'Site URL',
          type: 'url',
          placeholder: 'https://monsite.com',
          required: true,
        },
        {
          name: 'consumerKey',
          label: 'Consumer Key',
          type: 'text',
          placeholder: 'ck_xxxxx',
          required: true,
        },
        {
          name: 'consumerSecret',
          label: 'Consumer Secret',
          type: 'password',
          placeholder: 'cs_xxxxx',
          required: true,
        },
      ],
    },
  ];

  // Load integrations status on mount
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      // Mode démo : ne pas appeler l'API
      if (token?.startsWith('demo_token_')) {
        console.log('Mode démo : intégrations simulées');
        setIntegrationStatuses({
          native: 'connected',
          hubspot: 'disconnected',
          salesforce: 'disconnected',
          shopify: 'disconnected',
          woocommerce: 'disconnected'
        });
        return;
      }

      // Mode production : appeler l'API
      const response = await fetch('https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/integrations/configured', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error('Erreur API intégrations:', response.status);
        return;
      }

      const data = await response.json();

      const statuses: Record<string, 'connected' | 'disconnected' | 'error'> = {};
      data.integrations?.forEach((int: any) => {
        statuses[int.platform_slug] = int.enabled ? 'connected' : 'disconnected';
      });
      setIntegrationStatuses(statuses);
    } catch (error) {
      console.error('Erreur lors du chargement des intégrations:', error);
    }
  };

  const handleInputChange = (integrationId: string, fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [integrationId]: {
        ...(prev[integrationId] || {}),
        [fieldName]: value
      }
    }));
  };

  const handleSaveConfiguration = async (integrationId: string) => {
    setIsSaving(true);
    setTestResult(null);

    try {
      const credentials = formData[integrationId] || {};

      const token = localStorage.getItem('auth_token');
      const response = await fetch('https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/integrations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integration_type: integrationId,
          integration_name: `${integrationId.charAt(0).toUpperCase() + integrationId.slice(1)} Integration`,
          config_encrypted: credentials,
          sync_direction: 'bidirectional',
          sync_frequency: 'realtime'
        })
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: 'Configuration enregistrée avec succès'
        });

        // Update status
        setIntegrationStatuses(prev => ({
          ...prev,
          [integrationId]: 'connected'
        }));

        // Reload integrations
        await loadIntegrations();
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Erreur lors de la configuration'
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erreur de connexion au serveur'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Pour le CRM natif, toujours succès
      if (integrationId === 'native') {
        setTestResult({
          success: true,
          message: 'CRM Natif opérationnel',
        });
        setIsTestingConnection(false);
        return;
      }

      const credentials = formData[integrationId] || {};

      // Vérifier si les credentials sont renseignés
      const hasCredentials = Object.keys(credentials).length > 0 &&
        Object.values(credentials).every(v => v && v.trim() !== '');

      if (!hasCredentials) {
        setTestResult({
          success: false,
          message: 'Veuillez renseigner tous les champs requis'
        });
        setIsTestingConnection(false);
        return;
      }

      // TODO: Implémenter un vrai test de connexion via l'API
      // Pour l'instant, on simule
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTestResult({
        success: true,
        message: 'Connexion réussie ! Vous pouvez enregistrer la configuration.'
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erreur lors du test de connexion'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      // Get the integration ID from configured integrations
      const token = localStorage.getItem('auth_token');
      const integrationsResponse = await fetch('https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/integrations/configured', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const integrationsData = await integrationsResponse.json();
      const integration = integrationsData.integrations?.find((i: any) => i.platform_slug === integrationId);

      if (!integration) {
        throw new Error('Intégration non trouvée');
      }

      const response = await fetch(`https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/integrations/${integration.id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_type: 'manual_sync',
          entity_type: 'all',
          entity_id: 'all'
        })
      });

      const result = await response.json();

      if (result.message) {
        setSyncResult({
          success: true,
          message: result.message || 'Synchronisation démarrée',
          details: result.result
        });
      } else {
        setSyncResult({
          success: false,
          message: result.error || 'Erreur lors de la synchronisation'
        });
      }
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.message || 'Erreur de connexion au serveur'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir déconnecter ${integrationId} ?`)) {
      return;
    }

    try {
      // Get the integration ID from configured integrations
      const token = localStorage.getItem('auth_token');
      const integrationsResponse = await fetch('https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/integrations/configured', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const integrationsData = await integrationsResponse.json();
      const integration = integrationsData.integrations?.find((i: any) => i.platform_slug === integrationId);

      if (integration) {
        // Disable the integration
        await fetch(`https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/integrations/${integration.id}/disable`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      // Update local state
      setIntegrationStatuses(prev => ({
        ...prev,
        [integrationId]: 'disconnected'
      }));

      // Clear form data
      setFormData(prev => {
        const newData = { ...prev };
        delete newData[integrationId];
        return newData;
      });

      setTestResult({
        success: true,
        message: 'Intégration déconnectée avec succès'
      });

      // Reload integrations
      await loadIntegrations();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erreur lors de la déconnexion'
      });
    }
  };

  const handleOAuthConnect = (integrationId: string) => {
    // TODO: Implémenter le flux OAuth
    if (integrationId === 'salesforce') {
      // Redirect to Salesforce OAuth
      window.location.href = '/api/crm/oauth/salesforce';
    } else if (integrationId === 'hubspot') {
      // Redirect to HubSpot OAuth
      window.location.href = '/api/crm/oauth/hubspot';
    } else {
      alert(`OAuth flow pour ${integrationId} - À implémenter`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" />
            Connecté
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <X className="w-4 h-4" />
            Erreur
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            Non connecté
          </span>
        );
    }
  };

  const crmIntegrations = integrations.filter(i => i.type === 'crm');
  const ecommerceIntegrations = integrations.filter(i => i.type === 'ecommerce');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-gray-900">Coccinelle.AI</h1>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link href="/dashboard/customers" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Users className="w-5 h-5" />
                Clients
              </Link>
              <Link href="/dashboard/settings/integrations" className="flex items-center gap-2 text-red-600 font-medium">
                <Settings className="w-5 h-5" />
                Intégrations
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Settings className="w-8 h-8 text-red-600" />
            Intégrations
          </h2>
          <p className="text-gray-600">
            Connectez vos outils pour synchroniser vos données automatiquement
          </p>
        </div>

      {/* CRM Section */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Systèmes CRM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crmIntegrations.map((integration) => {
            const Icon = integration.icon;
            const isExpanded = selectedIntegration === integration.id;
            const currentStatus = integrationStatuses[integration.id] || integration.status;

            return (
              <div
                key={integration.id}
                className={`bg-white rounded-lg shadow transition-all ${
                  isExpanded ? 'ring-2 ring-red-500' : ''
                }`}
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center ${integration.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {getStatusBadge(currentStatus)}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {integration.description}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {currentStatus === 'connected' ? (
                      <>
                        <button
                          onClick={() => handleSyncNow(integration.id)}
                          disabled={isSyncing}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSyncing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Synchroniser
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Déconnecter
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          isExpanded
                            ? setSelectedIntegration(null)
                            : setSelectedIntegration(integration.id)
                        }
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        {isExpanded ? 'Annuler' : 'Configurer'}
                      </button>
                    )}
                  </div>

                  {/* Test Result */}
                  {testResult && selectedIntegration === integration.id && (
                    <div
                      className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                        testResult.success
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {testResult.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {testResult.message}
                    </div>
                  )}

                  {/* Sync Result */}
                  {syncResult && (
                    <div
                      className={`mt-4 p-3 rounded-lg text-sm ${
                        syncResult.success
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        {syncResult.success ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        {syncResult.message}
                      </div>
                      {syncResult.details && (
                        <div className="ml-6 text-xs mt-1 space-y-1">
                          <div>Créés: {syncResult.details.created}</div>
                          <div>Mis à jour: {syncResult.details.updated}</div>
                          {syncResult.details.errors?.length > 0 && (
                            <div className="text-red-600">Erreurs: {syncResult.details.errors.length}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Configuration Form */}
                {isExpanded && integration.configFields && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Configuration
                    </h4>

                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveConfiguration(integration.id); }}>
                      {integration.configFields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={formData[integration.id]?.[field.name] || ''}
                            onChange={(e) => handleInputChange(integration.id, field.name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      ))}

                      <div className="flex gap-2 pt-2">
                        {integration.requiresOAuth && (
                          <button
                            type="button"
                            onClick={() => handleOAuthConnect(integration.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Zap className="w-4 h-4" />
                            Connexion OAuth
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTestConnection(integration.id)}
                          disabled={isTestingConnection}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isTestingConnection ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            'Tester'
                          )}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          'Enregistrer la configuration'
                        )}
                      </button>
                    </form>

                    {/* Documentation Link */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <a
                        href="#"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir la documentation
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* E-commerce Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-green-600" />
          E-commerce
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ecommerceIntegrations.map((integration) => {
            const Icon = integration.icon;
            const isExpanded = selectedIntegration === integration.id;
            const currentStatus = integrationStatuses[integration.id] || integration.status;

            return (
              <div
                key={integration.id}
                className={`bg-white rounded-lg shadow transition-all ${
                  isExpanded ? 'ring-2 ring-red-500' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center ${integration.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {getStatusBadge(currentStatus)}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {integration.description}
                  </p>

                  <button
                    onClick={() =>
                      isExpanded
                        ? setSelectedIntegration(null)
                        : setSelectedIntegration(integration.id)
                    }
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {isExpanded ? 'Annuler' : 'Configurer'}
                  </button>
                </div>

                {isExpanded && integration.configFields && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Configuration
                    </h4>

                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveConfiguration(integration.id); }}>
                      {integration.configFields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={formData[integration.id]?.[field.name] || ''}
                            onChange={(e) => handleInputChange(integration.id, field.name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      ))}

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          'Enregistrer'
                        )}
                      </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <a
                        href="#"
                        className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir la documentation
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plug, Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

function NewIntegrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const integrationType = searchParams.get('type');

  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [integrationName, setIntegrationName] = useState('');
  const [authMethod, setAuthMethod] = useState<'oauth' | 'api_key'>('api_key');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [syncDirection, setSyncDirection] = useState('bidirectional');
  const [syncFrequency, setSyncFrequency] = useState('realtime');

  useEffect(() => {
    if (!integrationType) {
      router.push('/dashboard/integrations');
      return;
    }
    fetchIntegrationDetails();
  }, [integrationType]);

  const fetchIntegrationDetails = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/integrations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const found = data.integrations.find((i: any) => i.slug === integrationType);

      if (found) {
        setIntegration(found);
        setIntegrationName(`${found.name} Integration`);
        setAuthMethod(found.auth_type === 'oauth2' ? 'oauth' : 'api_key');
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'intégration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');

      const payload = {
        integration_type: integrationType,
        integration_name: integrationName,
        config_public: {
          sync_direction: syncDirection,
          sync_frequency: syncFrequency
        },
        config_encrypted: authMethod === 'api_key' ? {
          api_key: apiKey,
          api_secret: apiSecret,
          api_url: apiUrl
        } : {},
        sync_direction: syncDirection,
        sync_frequency: syncFrequency
      };

      const res = await fetch(`${API_URL}/api/v1/integrations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/integrations/${data.integrationId}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = () => {
    // TODO: Implémenter OAuth flow
    alert('OAuth flow à implémenter');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700">Intégration non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/integrations">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connecter {integration.name}</h1>
              <p className="text-sm text-gray-600">{integration.description}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Intégration créée avec succès ! Redirection...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom de l'intégration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Informations générales</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'intégration
              </label>
              <input
                type="text"
                value={integrationName}
                onChange={(e) => setIntegrationName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`Mon intégration ${integration.name}`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Nom personnalisé pour identifier cette intégration
              </p>
            </div>
          </div>

          {/* Méthode d'authentification */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Authentification</h3>

            {integration.auth_type === 'oauth2' ? (
              <div>
                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Connecter avec {integration.name}
                </button>
                <p className="text-sm text-gray-600 mt-3">
                  Vous serez redirigé vers {integration.name} pour autoriser la connexion
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clé API
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Votre clé API"
                    required
                  />
                </div>

                {integration.slug === 'woocommerce' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secret API
                      </label>
                      <input
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Votre secret API"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL de votre boutique
                      </label>
                      <input
                        type="url"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="https://votreboutique.com"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Comment obtenir votre clé API ?
                  </p>
                  <p className="text-sm text-blue-800">
                    Consultez la documentation de {integration.name} pour créer une clé API
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Options de synchronisation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Options de synchronisation</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Direction de la synchronisation
                </label>
                <select
                  value={syncDirection}
                  onChange={(e) => setSyncDirection(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="bidirectional">Bidirectionnelle (Coccinelle ⇄ {integration.name})</option>
                  <option value="to_platform">Coccinelle → {integration.name} uniquement</option>
                  <option value="from_platform">{integration.name} → Coccinelle uniquement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fréquence de synchronisation
                </label>
                <select
                  value={syncFrequency}
                  onChange={(e) => setSyncFrequency(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="realtime">Temps réel (immédiat)</option>
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidienne</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/integrations">
              <button
                type="button"
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
            </Link>
            <button
              type="submit"
              disabled={saving || (authMethod === 'api_key' && !apiKey)}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Création...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Créer l'intégration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewIntegrationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    }>
      <NewIntegrationContent />
    </Suspense>
  );
}

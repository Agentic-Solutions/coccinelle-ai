'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Save, CheckCircle, AlertCircle, Settings as SettingsIcon, Info } from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function SMSConfigPage() {
  const [config, setConfig] = useState({
    enabled: false,
    configured: false,
    templates: {
      rdvConfirmation: true,
      rdvRappel: true,
      promotions: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testNumber, setTestNumber] = useState('');

  // Charger la config depuis l'API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/v1/channels/sms`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.channel) {
            setConfig(prev => ({
              ...prev,
              enabled: data.channel.enabled,
              configured: data.channel.configured,
              templates: data.channel.config?.templates || prev.templates
            }));
          }
        } else {
          // Fallback localStorage
          const savedConfig = localStorage.getItem('sms_client_config');
          if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
          }
        }
      } catch (e) {
        console.error('Error loading SMS config:', e);
        const savedConfig = localStorage.getItem('sms_client_config');
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Validation
    if (config.enabled && !config.configured) {
      setError('Le canal SMS doit d\'abord être configuré par un administrateur. Contactez le support.');
      setSaving(false);
      return;
    }

    // Sauvegarder via l'API
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/sms`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: { templates: config.templates },
          enabled: config.enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      localStorage.setItem('sms_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error('Error saving SMS config:', e);
      localStorage.setItem('sms_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testNumber) {
      setError('Veuillez entrer un numéro de téléphone pour le test');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/sms/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toNumber: testNumber })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`SMS de test envoyé avec succès à ${testNumber} !`);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi du SMS de test');
      }
    } catch (e: any) {
      setError('Erreur lors de l\'envoi du SMS: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings/channels">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration SMS</h1>
              <p className="text-sm text-gray-600">Configuration du canal SMS via Twilio</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : (
        <>
        {/* Messages de statut */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Configuration SMS enregistrée avec succès !</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Info: Géré par Coccinelle.AI */}
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <p className="text-purple-900 font-medium mb-1">Canal géré par Coccinelle.AI</p>
            <p className="text-sm text-purple-800">
              Le canal SMS utilise les numéros Twilio partagés de Coccinelle.AI (+33 9 39 03 57 60 et +33 9 39 03 57 61).
              Vous pouvez activer/désactiver ce canal et choisir les types de messages à envoyer.
            </p>
          </div>
        </div>

        {/* Activation du canal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <MessageSquare className={`w-6 h-6 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Canal SMS</h2>
                <p className="text-sm text-gray-600">Messages SMS automatisés via Twilio</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                {config.enabled ? 'Activé' : 'Désactivé'}
              </span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked, configured: true })}
                className="w-6 h-6 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
            </label>
          </div>
        </div>

        {/* Types de messages SMS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">Types de messages SMS</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Choisissez quels types de messages seront envoyés par SMS à vos clients
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Confirmation de rendez-vous</p>
                <p className="text-xs text-gray-600">Envoyé immédiatement après la prise de RDV</p>
              </div>
              <input
                type="checkbox"
                checked={config.templates.rdvConfirmation}
                onChange={(e) => setConfig({
                  ...config,
                  templates: { ...config.templates, rdvConfirmation: e.target.checked }
                })}
                disabled={!config.enabled}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Rappel de rendez-vous</p>
                <p className="text-xs text-gray-600">Envoyé 24h et 1h avant le rendez-vous</p>
              </div>
              <input
                type="checkbox"
                checked={config.templates.rdvRappel}
                onChange={(e) => setConfig({
                  ...config,
                  templates: { ...config.templates, rdvRappel: e.target.checked }
                })}
                disabled={!config.enabled}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Promotions et offres</p>
                <p className="text-xs text-gray-600">Campagnes marketing et promotions</p>
              </div>
              <input
                type="checkbox"
                checked={config.templates.promotions}
                onChange={(e) => setConfig({
                  ...config,
                  templates: { ...config.templates, promotions: e.target.checked }
                })}
                disabled={!config.enabled}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Test SMS */}
        {config.enabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-blue-900 mb-2">Tester le canal SMS</h3>
            <p className="text-sm text-blue-800 mb-4">
              Envoyez un SMS de test pour vérifier que tout fonctionne correctement
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Numéro de téléphone (ex: +33612345678)"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
              <button
                onClick={handleTestSMS}
                disabled={testing || !testNumber}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Tester
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/settings/channels">
            <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Annuler
            </button>
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

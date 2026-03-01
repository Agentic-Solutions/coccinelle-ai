'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, Save, CheckCircle, AlertCircle, Settings as SettingsIcon, Info, ExternalLink } from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';
const META_APP_ID = '25451229527845708';
const META_CONFIG_ID = '741514108686417';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

function WhatsAppConfigContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const [config, setConfig] = useState({
    enabled: false,
    configured: false,
    connectionMethod: '',
    whatsappNumber: '',
    templates: {
      rdvConfirmation: true,
      rdvRappel: true,
      promotions: false,
      reponseAuto: true
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [fbLoaded, setFbLoaded] = useState(false);

  useEffect(() => {
    if (window.FB) {
      setFbLoaded(true);
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v21.0'
      });
      setFbLoaded(true);
      console.log('Facebook SDK chargé');
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/fr_FR/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/v1/channels/whatsapp`, {
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
              connectionMethod: data.channel.config?.connectionMethod || '',
              whatsappNumber: data.channel.config?.whatsappNumber || '',
              templates: data.channel.config?.templates || prev.templates
            }));
          }
        } else {
          const savedConfig = localStorage.getItem('whatsapp_client_config');
          if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
          }
        }
      } catch (e) {
        console.error('Error loading WhatsApp config:', e);
        const savedConfig = localStorage.getItem('whatsapp_client_config');
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleMetaEmbeddedSignup = () => {
    if (!fbLoaded || !window.FB) {
      setError('Le SDK Facebook n\'est pas encore chargé. Veuillez patienter quelques secondes.');
      return;
    }

    setConnecting(true);
    setError(null);

    window.FB.login(
      function(response: any) {
        console.log('Réponse FB.login:', response);

        if (response.authResponse) {
          const code = response.authResponse.code;
          console.log('Code OAuth reçu:', code);
          exchangeCodeForToken(code);
        } else {
          console.log('Utilisateur a annulé ou erreur');
          setConnecting(false);
          setError('Connexion annulée. Veuillez réessayer.');
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3'
        }
      }
    );
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/api/v1/omnichannel/whatsapp/oauth/callback?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConfig(prev => ({
          ...prev,
          configured: true,
          connectionMethod: 'meta_embedded',
          whatsappNumber: data.phone_number || 'WhatsApp connecté'
        }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);

        if (fromOnboarding) {
          setTimeout(() => router.push('/onboarding'), 1500);
        }
      } else {
        setError(data.error || 'Erreur lors de la connexion WhatsApp');
      }
    } catch (e: any) {
      console.error('Erreur échange token:', e);
      setError('Erreur de connexion au serveur: ' + e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (config.enabled && !config.configured) {
      setError('Vous devez d\'abord connecter votre compte WhatsApp Business.');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/whatsapp`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            connectionMethod: config.connectionMethod,
            whatsappNumber: config.whatsappNumber,
            templates: config.templates
          },
          enabled: config.enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      localStorage.setItem('whatsapp_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (fromOnboarding) {
        setTimeout(() => router.push('/onboarding'), 1500);
      }
    } catch (e: any) {
      console.error('Error saving WhatsApp config:', e);
      localStorage.setItem('whatsapp_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (fromOnboarding) {
        setTimeout(() => router.push('/onboarding'), 1500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testNumber) {
      setError('Veuillez entrer un numéro WhatsApp pour le test');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/whatsapp/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toNumber: testNumber })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message || 'Test WhatsApp effectué !');
      } else {
        setError(data.error || 'Erreur lors du test WhatsApp');
      }
    } catch (e: any) {
      setError('Erreur: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/channels">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration WhatsApp</h1>
              <p className="text-sm text-gray-600">Connectez votre compte WhatsApp Business</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : (
        <>
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Configuration WhatsApp enregistrée avec succès !</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {!config.configured ? (
          <div>
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-blue-900 font-medium mb-1">Connexion WhatsApp Business requise</p>
                <p className="text-sm text-blue-800">
                  Pour utiliser le canal WhatsApp, connectez votre compte WhatsApp Business en moins de 2 minutes.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border-2 border-green-300 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">Connecter mon WhatsApp Business</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                      2 MINUTES
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Connectez votre numéro WhatsApp directement via Facebook. Simple et rapide.
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Aucune configuration technique requise
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Connexion sécurisée via Facebook
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Sara répond immédiatement sur votre numéro
                    </li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={handleMetaEmbeddedSignup}
                disabled={connecting || !fbLoaded}
                className="w-full px-6 py-4 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors flex items-center justify-center gap-3 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Connecter mon WhatsApp
                  </>
                )}
              </button>
              
              {!fbLoaded && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Chargement du SDK Facebook...
                </p>
              )}
              
              <p className="text-xs text-gray-500 mt-3 text-center">
                Vous serez redirigé vers Facebook pour autoriser la connexion
              </p>
            </div>

            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Besoin d'aide ?</strong> Notre équipe peut configurer votre compte pour vous.
                  Contactez <a href="mailto:support@coccinelle.ai" className="text-blue-600 hover:underline">support@coccinelle.ai</a>
                </span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-green-900 font-medium mb-1">WhatsApp Business connecté ✅</p>
                <p className="text-sm text-green-800">
                  Votre compte WhatsApp <strong>{config.whatsappNumber}</strong> est connecté. Sara peut maintenant répondre à vos clients !
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Canal WhatsApp</h2>
                    <p className="text-sm text-gray-600">Sara répond automatiquement aux messages</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">
                    {config.enabled ? 'Activé' : 'Désactivé'}
                  </span>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="w-6 h-6 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                  />
                </label>
              </div>
            </div>

            {config.enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-900 mb-2">Tester le canal WhatsApp</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Envoyez un message WhatsApp de test pour vérifier que tout fonctionne
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Numéro WhatsApp (ex: +33612345678)"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <button
                    onClick={handleTestWhatsApp}
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

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/channels">
                <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Retour
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
        </>
        )}
      </div>
    </div>
  );
}

export default function WhatsAppConfigPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    }>
      <WhatsAppConfigContent />
    </Suspense>
  );
}

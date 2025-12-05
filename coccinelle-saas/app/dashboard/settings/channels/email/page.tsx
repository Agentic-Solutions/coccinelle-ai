'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Save, CheckCircle, AlertCircle, Settings as SettingsIcon,
  Info, Eye, EyeOff, ExternalLink, Loader2, Copy, Check, Globe
} from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

// ===================================
// INTERFACES
// ===================================

interface ProviderInfo {
  provider: string;
  providerName: string;
  nameservers: string[];
  canAutoConfig: boolean;
  requiresOAuth: boolean;
  supportsAPI: boolean;
}

interface Instructions {
  title: string;
  steps: Array<{
    step: number;
    title: string;
    description: string;
    url?: string;
    details?: string[];
  }>;
}

interface InboundEmailConfig {
  configured: boolean;
  config?: {
    domain: string;
    emailAddress: string;
    forwardingAddress: string;
    dnsProvider: string;
    status: string;
    dnsVerified: boolean;
    forwardingVerified: boolean;
    lastVerificationAt: string | null;
  };
}

export default function EmailConfigPage() {
  // ===================================
  // INBOUND EMAIL STATE (Réception)
  // ===================================
  const [inboundStep, setInboundStep] = useState<'initial' | 'detected' | 'configuring' | 'completed'>('initial');
  const [inboundLoading, setInboundLoading] = useState(false);
  const [inboundMessage, setInboundMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [forwardingAddress, setForwardingAddress] = useState('');
  const [inboundConfig, setInboundConfig] = useState<InboundEmailConfig | null>(null);
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [copiedForwarding, setCopiedForwarding] = useState(false);

  // ===================================
  // OUTBOUND EMAIL STATE (Envoi - SMTP)
  // ===================================
  const [outboundConfig, setOutboundConfig] = useState({
    enabled: false,
    configured: false,
    smtp: {
      host: '',
      port: 587,
      secure: true,
      user: '',
      password: '',
      fromEmail: '',
      fromName: ''
    },
    templates: {
      rdvConfirmation: true,
      rdvRappel: true,
      newsletter: false,
      promotions: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // ===================================
  // LOAD CONFIG ON MOUNT
  // ===================================
  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    await Promise.all([
      loadInboundConfig(),
      loadOutboundConfig()
    ]);
    setLoading(false);
  };

  // Load Inbound Config
  const loadInboundConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      let tenantId = 'test_tenant_001'; // Fallback pour développement

      // Essayer de récupérer le tenantId depuis l'auth
      try {
        const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          tenantId = userData.tenant_id;
        }
      } catch {
        // Utiliser le fallback si l'auth échoue
      }

      const configRes = await fetch(`${API_URL}/api/v1/omnichannel/email/config?tenantId=${tenantId}`);

      if (configRes.ok) {
        const data = await configRes.json();
        setInboundConfig(data);

        if (data.configured && data.config.status === 'active') {
          setInboundStep('completed');
          setEmailAddress(data.config.emailAddress);
          setForwardingAddress(data.config.forwardingAddress);
        }
      }
    } catch (error) {
      console.error('Error loading inbound config:', error);
    }
  };

  // Load Outbound Config (SMTP)
  const loadOutboundConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/email`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.channel) {
          setOutboundConfig(prev => ({
            ...prev,
            enabled: data.channel.enabled,
            configured: data.channel.configured,
            smtp: data.channel.config?.smtp || prev.smtp,
            templates: data.channel.config?.templates || prev.templates
          }));
          setTestEmail(data.channel.config?.smtp?.user || '');
        }
      } else {
        // Fallback localStorage
        const savedConfig = localStorage.getItem('email_client_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setOutboundConfig(parsed);
          setTestEmail(parsed.smtp.user || '');
        }
      }
    } catch (e) {
      console.error('Error loading outbound config:', e);
      const savedConfig = localStorage.getItem('email_client_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setOutboundConfig(parsed);
        setTestEmail(parsed.smtp.user || '');
      }
    }
  };

  // ===================================
  // INBOUND EMAIL HANDLERS
  // ===================================

  const extractDomain = (email: string) => {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : '';
  };

  const handleDetectProvider = async () => {
    if (!emailAddress.includes('@')) {
      setInboundMessage({ type: 'error', text: 'Veuillez entrer une adresse email valide' });
      return;
    }

    setInboundLoading(true);
    setInboundMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      let tenantId = 'test_tenant_001'; // Fallback pour développement

      // Essayer de récupérer le tenantId depuis l'auth
      try {
        const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          tenantId = userData.tenant_id;
        }
      } catch {
        // Utiliser le fallback si l'auth échoue
      }

      const domain = extractDomain(emailAddress);

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/detect-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, emailAddress, tenantId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la détection du provider');
      }

      const data = await res.json();
      setProviderInfo(data.provider);
      setInstructions(data.instructions);
      setForwardingAddress(data.forwardingAddress);
      setInboundStep('detected');
    } catch (error: any) {
      setInboundMessage({ type: 'error', text: error.message });
    } finally {
      setInboundLoading(false);
    }
  };

  const handleConnectCloudflare = async () => {
    if (!cloudflareToken.trim()) {
      setInboundMessage({ type: 'error', text: 'Veuillez entrer votre API Token Cloudflare' });
      return;
    }

    setInboundLoading(true);
    setInboundMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();
      const tenantId = userData.tenant_id;

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/cloudflare/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cloudflareToken, tenantId }),
      });

      if (!res.ok) throw new Error('Erreur lors de la connexion à Cloudflare');

      setInboundMessage({ type: 'success', text: 'Token Cloudflare validé !' });

      // Auto-configure DNS
      setTimeout(() => handleAutoConfigureDNS(), 1000);
    } catch (error: any) {
      setInboundMessage({ type: 'error', text: error.message });
      setInboundLoading(false);
    }
  };

  const handleAutoConfigureDNS = async () => {
    setInboundStep('configuring');
    setInboundMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();
      const tenantId = userData.tenant_id;

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/auto-configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (!res.ok) throw new Error('Erreur lors de la configuration DNS');

      const data = await res.json();

      setInboundMessage({ type: 'success', text: 'Configuration DNS automatique réussie !' });
      setInboundStep('completed');
      await loadInboundConfig();
    } catch (error: any) {
      setInboundMessage({ type: 'error', text: error.message });
      setInboundStep('detected');
    } finally {
      setInboundLoading(false);
    }
  };

  const handleVerifyForwarding = async () => {
    setInboundLoading(true);
    setInboundMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();
      const tenantId = userData.tenant_id;

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/verify-forwarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (!res.ok) throw new Error('Erreur lors de la vérification');

      setInboundMessage({ type: 'success', text: 'Redirection email vérifiée et activée !' });
      setInboundStep('completed');
      await loadInboundConfig();
    } catch (error: any) {
      setInboundMessage({ type: 'error', text: error.message });
    } finally {
      setInboundLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedForwarding(true);
    setTimeout(() => setCopiedForwarding(false), 2000);
  };

  // ===================================
  // OUTBOUND EMAIL HANDLERS (SMTP)
  // ===================================

  const handleSaveOutbound = async () => {
    setSaving(true);
    setError(null);

    if (outboundConfig.enabled && !outboundConfig.configured) {
      setError('Vous devez d\'abord configurer votre serveur SMTP.');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/email`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            smtp: outboundConfig.smtp,
            templates: outboundConfig.templates
          },
          enabled: outboundConfig.enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      localStorage.setItem('email_client_config', JSON.stringify(outboundConfig));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error('Error saving Email config:', e);
      localStorage.setItem('email_client_config', JSON.stringify(outboundConfig));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigureSMTP = () => {
    const { host, port, user, password, fromEmail, fromName } = outboundConfig.smtp;

    if (!host || !user || !password || !fromEmail || !fromName) {
      setError('Tous les champs SMTP sont requis.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      setError('L\'adresse email "De" n\'est pas valide.');
      return;
    }

    if (!emailRegex.test(user)) {
      setError('L\'adresse email de connexion n\'est pas valide.');
      return;
    }

    setOutboundConfig({
      ...outboundConfig,
      configured: true
    });

    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Veuillez saisir une adresse email pour le test.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      setError('L\'adresse email de test n\'est pas valide.');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/email/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toEmail: testEmail })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Email de test envoyé avec succès à ${testEmail} !`);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi de l\'email de test');
      }
    } catch (e: any) {
      setError('Erreur lors de l\'envoi: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  // ===================================
  // RENDER
  // ===================================

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
              <h1 className="text-2xl font-bold text-gray-900">Configuration Email</h1>
              <p className="text-sm text-gray-600">Réception et envoi d'emails pour vos clients</p>
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
          {/* ===================================
              SECTION 1: RÉCEPTION D'EMAILS
              =================================== */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">1. Réception d'emails</h2>
                <p className="text-sm text-gray-600">Configurez votre adresse email pour recevoir les messages de vos clients</p>
              </div>
            </div>

            {/* Info message */}
            {inboundStep === 'initial' && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium mb-1">Configuration simplifiée</p>
                  <p className="text-sm text-blue-800">
                    Entrez simplement votre adresse email professionnelle. Nous détecterons automatiquement
                    votre hébergeur et vous guiderons dans la configuration.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {inboundMessage && (
              <div className={`mb-6 rounded-lg p-4 flex items-center gap-3 ${
                inboundMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {inboundMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <p className={`font-medium ${
                  inboundMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {inboundMessage.text}
                </p>
              </div>
            )}

            {/* Step: Initial */}
            {inboundStep === 'initial' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre adresse email professionnelle
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="contact@votre-entreprise.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <button
                    onClick={handleDetectProvider}
                    disabled={inboundLoading}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {inboundLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Détection...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Détecter
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Detected */}
            {inboundStep === 'detected' && providerInfo && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-2">Hébergeur détecté</h3>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">{providerInfo.providerName}</p>
                      <p className="text-xs text-gray-600">
                        Domaine: {extractDomain(emailAddress)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cloudflare Auto-Config */}
                {providerInfo.canAutoConfig && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-bold text-green-900 mb-3">
                      Configuration automatique disponible !
                    </h4>
                    <p className="text-sm text-green-800 mb-4">
                      Votre domaine est hébergé sur Cloudflare. Nous pouvons configurer automatiquement
                      les redirections email avec votre API Token.
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Token Cloudflare
                    </label>
                    <div className="flex gap-3 mb-3">
                      <input
                        type="password"
                        value={cloudflareToken}
                        onChange={(e) => setCloudflareToken(e.target.value)}
                        placeholder="Collez votre API Token ici"
                        className="flex-1 px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                      />
                      <button
                        onClick={handleConnectCloudflare}
                        disabled={inboundLoading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {inboundLoading ? 'Connexion...' : 'Connecter'}
                      </button>
                    </div>

                    <a
                      href="https://dash.cloudflare.com/profile/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline flex items-center gap-1"
                    >
                      Comment créer un API Token ?
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Manual Instructions */}
                {instructions && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3">
                      {providerInfo.canAutoConfig ? 'OU configuration manuelle' : 'Configuration manuelle'}
                    </h4>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-yellow-900 mb-2">
                        Adresse de redirection email :
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm font-mono">
                          {forwardingAddress}
                        </code>
                        <button
                          onClick={() => copyToClipboard(forwardingAddress)}
                          className="p-2 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
                          title="Copier"
                        >
                          {copiedForwarding ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-yellow-700" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">{instructions.title}</p>
                      {instructions.steps.map((stepItem) => (
                        <div key={stepItem.step} className="border-l-4 border-gray-300 pl-4">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                              {stepItem.step}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{stepItem.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{stepItem.description}</p>
                              {stepItem.url && (
                                <a
                                  href={stepItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                  Accéder
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {stepItem.details && (
                                <ul className="mt-2 space-y-1">
                                  {stepItem.details.map((detail, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                      <span className="text-gray-400">•</span>
                                      <span>{detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleVerifyForwarding}
                      disabled={inboundLoading}
                      className="mt-6 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {inboundLoading ? 'Vérification...' : 'J\'ai configuré la redirection, vérifier'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step: Configuring */}
            {inboundStep === 'configuring' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
                  <span className="ml-3 text-gray-700 font-medium">Configuration en cours...</span>
                </div>
              </div>
            )}

            {/* Step: Completed */}
            {inboundStep === 'completed' && inboundConfig?.configured && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="font-bold text-green-900">Réception d'emails configurée !</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-green-800">
                    <strong>Email:</strong> {inboundConfig.config?.emailAddress}
                  </p>
                  <p className="text-green-800">
                    <strong>Statut:</strong> {inboundConfig.config?.status === 'active' ? 'Actif' : 'En attente'}
                  </p>
                  <p className="text-green-800">
                    <strong>Provider:</strong> {inboundConfig.config?.dnsProvider}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ===================================
              SECTION 2: ENVOI D'EMAILS (SMTP)
              =================================== */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">2. Envoi d'emails</h2>
                <p className="text-sm text-gray-600">Configuration SMTP pour envoyer des emails à vos clients</p>
              </div>
            </div>

            {/* Messages de statut */}
            {saved && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">Configuration Email enregistrée avec succès !</p>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Info message */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-blue-900 font-medium mb-1">Configuration SMTP requise</p>
                <p className="text-sm text-blue-800">
                  Pour envoyer des emails, vous devez configurer votre serveur SMTP. Vous pouvez utiliser Gmail, Outlook,
                  SendGrid, ou tout autre fournisseur SMTP.
                </p>
              </div>
            </div>

            {/* Configuration SMTP */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <SettingsIcon className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900">Configuration du serveur SMTP</h3>
              </div>

              {outboundConfig.configured && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    SMTP configuré : {outboundConfig.smtp.fromEmail}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {/* Fournisseur populaire - aide */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Fournisseurs SMTP populaires :</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span><strong>Gmail :</strong> smtp.gmail.com:587</span>
                      <a
                        href="https://support.google.com/mail/answer/7126229"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Guide
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span><strong>Outlook :</strong> smtp-mail.outlook.com:587</span>
                      <a
                        href="https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Guide
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span><strong>SendGrid :</strong> smtp.sendgrid.net:587</span>
                      <a
                        href="https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Guide
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Serveur SMTP */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serveur SMTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={outboundConfig.smtp.host}
                      onChange={(e) => setOutboundConfig({
                        ...outboundConfig,
                        smtp: { ...outboundConfig.smtp, host: e.target.value }
                      })}
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Port <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={outboundConfig.smtp.port}
                      onChange={(e) => setOutboundConfig({
                        ...outboundConfig,
                        smtp: { ...outboundConfig.smtp, port: parseInt(e.target.value) }
                      })}
                      placeholder="587"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Sécurité */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={outboundConfig.smtp.secure}
                      onChange={(e) => setOutboundConfig({
                        ...outboundConfig,
                        smtp: { ...outboundConfig.smtp, secure: e.target.checked }
                      })}
                      className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Utiliser TLS/SSL (recommandé)
                    </span>
                  </label>
                </div>

                {/* Email de connexion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de connexion <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={outboundConfig.smtp.user}
                    onChange={(e) => setOutboundConfig({
                      ...outboundConfig,
                      smtp: { ...outboundConfig.smtp, user: e.target.value }
                    })}
                    placeholder="votre-email@exemple.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Adresse email utilisée pour se connecter au serveur SMTP
                  </p>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe SMTP <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={outboundConfig.smtp.password}
                      onChange={(e) => setOutboundConfig({
                        ...outboundConfig,
                        smtp: { ...outboundConfig.smtp, password: e.target.value }
                      })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pour Gmail/Outlook : utilisez un "mot de passe d'application" plutôt que votre mot de passe principal
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">Informations de l'expéditeur</p>

                  {/* Email "De" */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email "De" <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={outboundConfig.smtp.fromEmail}
                      onChange={(e) => setOutboundConfig({
                        ...outboundConfig,
                        smtp: { ...outboundConfig.smtp, fromEmail: e.target.value }
                      })}
                      placeholder="contact@votre-entreprise.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Adresse qui apparaîtra comme expéditeur des emails
                    </p>
                  </div>

                  {/* Nom "De" */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'expéditeur <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={outboundConfig.smtp.fromName}
                      onChange={(e) => setOutboundConfig({
                        ...outboundConfig,
                        smtp: { ...outboundConfig.smtp, fromName: e.target.value }
                      })}
                      placeholder="Votre Entreprise"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nom qui apparaîtra comme expéditeur des emails
                    </p>
                  </div>
                </div>

                {/* Bouton de validation SMTP */}
                {!outboundConfig.configured && (
                  <button
                    onClick={handleConfigureSMTP}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Valider la configuration SMTP
                  </button>
                )}

                {outboundConfig.configured && (
                  <button
                    onClick={() => setOutboundConfig({ ...outboundConfig, configured: false })}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Modifier la configuration
                  </button>
                )}
              </div>
            </div>

            {/* Activation du canal */}
            {outboundConfig.configured && (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                        <Mail className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Canal Email</h2>
                        <p className="text-sm text-gray-600">Envoi d'emails automatisés</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm font-medium text-gray-700">
                        {outboundConfig.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                      <input
                        type="checkbox"
                        checked={outboundConfig.enabled}
                        onChange={(e) => setOutboundConfig({ ...outboundConfig, enabled: e.target.checked })}
                        className="w-6 h-6 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                      />
                    </label>
                  </div>
                </div>

                {/* Types d'emails */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <SettingsIcon className="w-5 h-5 text-gray-700" />
                    <h3 className="font-bold text-gray-900">Types d'emails</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Choisissez quels types d'emails seront envoyés à vos clients
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Confirmation de rendez-vous</p>
                        <p className="text-xs text-gray-600">Envoyé immédiatement après la prise de RDV</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={outboundConfig.templates.rdvConfirmation}
                        onChange={(e) => setOutboundConfig({
                          ...outboundConfig,
                          templates: { ...outboundConfig.templates, rdvConfirmation: e.target.checked }
                        })}
                        disabled={!outboundConfig.enabled}
                        className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Rappel de rendez-vous</p>
                        <p className="text-xs text-gray-600">Envoyé 24h avant le rendez-vous</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={outboundConfig.templates.rdvRappel}
                        onChange={(e) => setOutboundConfig({
                          ...outboundConfig,
                          templates: { ...outboundConfig.templates, rdvRappel: e.target.checked }
                        })}
                        disabled={!outboundConfig.enabled}
                        className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Newsletter</p>
                        <p className="text-xs text-gray-600">Actualités et conseils réguliers</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={outboundConfig.templates.newsletter}
                        onChange={(e) => setOutboundConfig({
                          ...outboundConfig,
                          templates: { ...outboundConfig.templates, newsletter: e.target.checked }
                        })}
                        disabled={!outboundConfig.enabled}
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
                        checked={outboundConfig.templates.promotions}
                        onChange={(e) => setOutboundConfig({
                          ...outboundConfig,
                          templates: { ...outboundConfig.templates, promotions: e.target.checked }
                        })}
                        disabled={!outboundConfig.enabled}
                        className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Test du canal */}
                {outboundConfig.enabled && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-blue-900 mb-2">Tester le canal Email</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      Envoyez un email de test pour vérifier que tout fonctionne correctement
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="email@exemple.com"
                        className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                      <button
                        onClick={handleTestEmail}
                        disabled={testing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        {testing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Envoyer un test
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/settings/channels">
              <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Annuler
              </button>
            </Link>
            <button
              onClick={handleSaveOutbound}
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

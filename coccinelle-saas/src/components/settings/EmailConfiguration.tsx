'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, AlertCircle, Loader2, ExternalLink, Copy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

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

interface EmailConfig {
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

export default function EmailConfiguration() {
  const [step, setStep] = useState<'initial' | 'detected' | 'configuring' | 'completed'>('initial');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [forwardingAddress, setForwardingAddress] = useState('');
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [cloudflareToken, setCloudflareToken] = useState('');

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) return;

      const userData = await userRes.json();
      const tenantId = userData.tenant_id;

      const configRes = await fetch(`${API_URL}/api/v1/omnichannel/email/config?tenantId=${tenantId}`);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data);

        if (data.configured && data.config.status === 'active') {
          setStep('completed');
          setEmailAddress(data.config.emailAddress);
          setForwardingAddress(data.config.forwardingAddress);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const extractDomain = (email: string) => {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : '';
  };

  const handleDetectProvider = async () => {
    if (!emailAddress.includes('@')) {
      setMessage({ type: 'error', text: 'Veuillez entrer une adresse email valide' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();
      const domain = extractDomain(emailAddress);

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/detect-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          emailAddress,
          tenantId: userData.tenant_id,
        }),
      });

      if (!res.ok) throw new Error('Erreur de détection');

      const data = await res.json();
      setProviderInfo(data.provider);
      setInstructions(data.instructions);
      setForwardingAddress(data.forwardingAddress);
      setStep('detected');

      setMessage({
        type: 'success',
        text: `Hébergeur détecté : ${data.provider.providerName}`,
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la détection' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCloudflare = async () => {
    if (!cloudflareToken.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre token Cloudflare' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/cloudflare/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cloudflareToken,
          tenantId: userData.tenant_id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Token invalide');
      }

      setMessage({ type: 'success', text: 'Cloudflare connecté avec succès !' });

      // Auto-configure DNS
      setTimeout(() => handleAutoConfigureDNS(), 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConfigureDNS = async () => {
    setLoading(true);
    setMessage(null);
    setStep('configuring');

    try {
      const token = localStorage.getItem('token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();
      const domain = extractDomain(emailAddress);

      // Get zones first
      const zonesRes = await fetch(`${API_URL}/api/v1/omnichannel/email/cloudflare/zones?tenantId=${userData.tenant_id}`);

      if (!zonesRes.ok) throw new Error('Impossible de récupérer les zones');

      const zonesData = await zonesRes.json();
      const zone = zonesData.zones.find((z: any) => z.name === domain);

      if (!zone) throw new Error(`Zone ${domain} non trouvée dans Cloudflare`);

      // Auto-configure
      const configRes = await fetch(`${API_URL}/api/v1/omnichannel/email/auto-configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: userData.tenant_id,
          domain,
          emailAddress,
          zoneId: zone.id,
        }),
      });

      if (!configRes.ok) {
        const error = await configRes.json();
        throw new Error(error.message || 'Erreur de configuration');
      }

      const configData = await configRes.json();
      setMessage({ type: 'success', text: 'Configuration DNS automatique réussie !' });
      setStep('completed');
      loadCurrentConfig();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setStep('detected');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForwarding = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const userRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Erreur d\'authentification');

      const userData = await userRes.json();

      const res = await fetch(`${API_URL}/api/v1/omnichannel/email/verify-forwarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: userData.tenant_id }),
      });

      if (!res.ok) throw new Error('Erreur de vérification');

      setMessage({ type: 'success', text: 'Configuration email activée avec succès !' });
      setStep('completed');
      loadCurrentConfig();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copié dans le presse-papiers' });
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration Email</h2>
        <p className="text-gray-600">Configurez votre adresse email pour recevoir les messages clients</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {step === 'completed' && config?.configured && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Check className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">Configuration active</h3>
              <div className="space-y-2 text-sm text-green-800">
                <p><strong>Email :</strong> {config.config?.emailAddress}</p>
                <p><strong>Hébergeur :</strong> {config.config?.dnsProvider?.toUpperCase()}</p>
                <p><strong>Transfert vers :</strong> {config.config?.forwardingAddress}</p>
                <p><strong>Status :</strong> {config.config?.status === 'active' ? '✓ Actif' : config.config?.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'initial' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4 mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Quelle adresse email souhaitez-vous utiliser ?</h3>
              <p className="text-sm text-gray-600">
                Nous allons détecter automatiquement votre hébergeur et vous guider dans la configuration.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email professionnelle
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="assistant@votre-entreprise.fr"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleDetectProvider}
              disabled={loading || !emailAddress}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Détection en cours...
                </>
              ) : (
                'Détecter mon hébergeur'
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'detected' && providerInfo && instructions && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Hébergeur détecté : {providerInfo.providerName}</h3>
                <p className="text-sm text-blue-700">
                  Email de transfert : <span className="font-mono bg-white px-2 py-1 rounded">{forwardingAddress}</span>
                  <button
                    onClick={() => copyToClipboard(forwardingAddress)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="w-4 h-4 inline" />
                  </button>
                </p>
              </div>
            </div>
          </div>

          {providerInfo.canAutoConfig && providerInfo.provider === 'cloudflare' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Configuration automatique disponible</h3>
                  <p className="text-sm text-gray-600">
                    Votre domaine est sur Cloudflare. Nous pouvons configurer les DNS automatiquement pour vous !
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token API Cloudflare
                    <a
                      href="https://dash.cloudflare.com/profile/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:text-blue-800 text-xs inline-flex items-center gap-1"
                    >
                      Créer un token <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={cloudflareToken}
                    onChange={(e) => setCloudflareToken(e.target.value)}
                    placeholder="Collez votre token Cloudflare ici"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleConnectCloudflare}
                  disabled={loading || !cloudflareToken}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2 font-medium"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Configurer automatiquement
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Permissions requises : Zone → DNS → Edit | Zone → Zone → Read
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 text-center">ou</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{instructions.title}</h3>
            <div className="space-y-4">
              {instructions.steps.map((instructionStep) => (
                <div key={instructionStep.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    {instructionStep.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{instructionStep.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{instructionStep.description}</p>
                    {instructionStep.url && (
                      <a
                        href={instructionStep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        Ouvrir <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {instructionStep.details && (
                      <ul className="mt-2 space-y-1">
                        {instructionStep.details.map((detail, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-600">→</span>
                            <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">{detail}</span>
                            {detail.includes('@') && (
                              <button
                                onClick={() => copyToClipboard(detail.split(': ')[1])}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={handleVerifyForwarding}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2 font-medium"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                J'ai configuré le transfert
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'configuring' && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Configuration en cours...</h3>
          <p className="text-sm text-gray-600">Création des enregistrements DNS automatiquement</p>
        </div>
      )}
    </div>
  );
}

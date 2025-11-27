'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Save, CheckCircle, AlertCircle, Settings as SettingsIcon, Info, Eye, EyeOff, ExternalLink } from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function EmailConfigPage() {
  const [config, setConfig] = useState({
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

  // Charger la config depuis l'API
  useEffect(() => {
    const fetchConfig = async () => {
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
            setConfig(prev => ({
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
            setConfig(parsed);
            setTestEmail(parsed.smtp.user || '');
          }
        }
      } catch (e) {
        console.error('Error loading Email config:', e);
        const savedConfig = localStorage.getItem('email_client_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
          setTestEmail(parsed.smtp.user || '');
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
      setError('Vous devez d\'abord configurer votre serveur SMTP.');
      setSaving(false);
      return;
    }

    // Sauvegarder via l'API
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
            smtp: config.smtp,
            templates: config.templates
          },
          enabled: config.enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      localStorage.setItem('email_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error('Error saving Email config:', e);
      localStorage.setItem('email_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigureSMTP = () => {
    // Validation des champs SMTP
    const { host, port, user, password, fromEmail, fromName } = config.smtp;

    if (!host || !user || !password || !fromEmail || !fromName) {
      setError('Tous les champs SMTP sont requis.');
      return;
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      setError('L\'adresse email "De" n\'est pas valide.');
      return;
    }

    if (!emailRegex.test(user)) {
      setError('L\'adresse email de connexion n\'est pas valide.');
      return;
    }

    setConfig({
      ...config,
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
              <p className="text-sm text-gray-600">Configuration du canal Email via SMTP</p>
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

          {config.configured && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                SMTP configuré : {config.smtp.fromEmail}
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
                  value={config.smtp.host}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp, host: e.target.value }
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
                  value={config.smtp.port}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp, port: parseInt(e.target.value) }
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
                  checked={config.smtp.secure}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp, secure: e.target.checked }
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
                value={config.smtp.user}
                onChange={(e) => setConfig({
                  ...config,
                  smtp: { ...config.smtp, user: e.target.value }
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
                  value={config.smtp.password}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp, password: e.target.value }
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
                  value={config.smtp.fromEmail}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp, fromEmail: e.target.value }
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
                  value={config.smtp.fromName}
                  onChange={(e) => setConfig({
                    ...config,
                    smtp: { ...config.smtp, fromName: e.target.value }
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
            {!config.configured && (
              <button
                onClick={handleConfigureSMTP}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Valider la configuration SMTP
              </button>
            )}

            {config.configured && (
              <button
                onClick={() => setConfig({ ...config, configured: false })}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Modifier la configuration
              </button>
            )}
          </div>
        </div>

        {/* Activation du canal */}
        {config.configured && (
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
                    <p className="text-xs text-gray-600">Envoyé 24h avant le rendez-vous</p>
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
                    <p className="font-medium text-gray-900 text-sm">Newsletter</p>
                    <p className="text-xs text-gray-600">Actualités et conseils réguliers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.templates.newsletter}
                    onChange={(e) => setConfig({
                      ...config,
                      templates: { ...config.templates, newsletter: e.target.checked }
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

            {/* Test du canal */}
            {config.enabled && (
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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Save, CheckCircle, AlertCircle, Settings as SettingsIcon, Info, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import Logo from '@/components/Logo';

const TWILIO_SHARED_NUMBER = '+33 9 39 03 57 61'; // Numéro Twilio mutualisé
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function PhoneConfigPage() {
  const [config, setConfig] = useState({
    enabled: false,
    configured: false, // Géré par l'admin (si Vapi est setup)
    clientPhoneNumber: '',
    twilioSharedNumber: TWILIO_SHARED_NUMBER,
    sara: {
      voice: 'female' as 'female' | 'male',
      assistantName: 'Sara',
      agentType: 'reception' as 'reception' | 'qualification' | 'appointment' | 'support',
      customInstructions: '',
      language: 'fr-FR'
    },
    transferConfigured: false
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger la config depuis l'API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/v1/channels/phone`, {
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
              ...data.channel.config
            }));
          }
        } else {
          // Fallback sur localStorage si API non disponible
          const savedConfig = localStorage.getItem('phone_client_config');
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            setConfig(prev => ({ ...prev, ...parsed }));
          } else {
            setConfig(prev => ({ ...prev, configured: true }));
          }
        }
      } catch (e) {
        console.error('Error loading Phone config:', e);
        // Fallback sur localStorage
        const savedConfig = localStorage.getItem('phone_client_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig(prev => ({ ...prev, ...parsed }));
        } else {
          setConfig(prev => ({ ...prev, configured: true }));
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
      setError('Le canal voix doit d\'abord être configuré par un administrateur. Contactez le support.');
      setSaving(false);
      return;
    }

    if (config.enabled && !config.clientPhoneNumber) {
      setError('Veuillez saisir votre numéro de téléphone professionnel.');
      setSaving(false);
      return;
    }

    // Validation format numéro
    const phoneRegex = /^\+?\d{10,15}$/;
    if (config.clientPhoneNumber && !phoneRegex.test(config.clientPhoneNumber.replace(/\s/g, ''))) {
      setError('Format de numéro invalide. Utilisez le format international (+33...)');
      setSaving(false);
      return;
    }

    // Sauvegarder via l'API
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/phone`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            clientPhoneNumber: config.clientPhoneNumber,
            twilioSharedNumber: config.twilioSharedNumber,
            sara: config.sara,
            transferConfigured: config.transferConfigured
          },
          enabled: config.enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      // Backup localStorage pour mode hors-ligne
      localStorage.setItem('phone_client_config', JSON.stringify(config));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      console.log('Phone config saved to API');
    } catch (e: any) {
      console.error('Error saving Phone config:', e);
      // Fallback: sauvegarder localement
      localStorage.setItem('phone_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(TWILIO_SHARED_NUMBER);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleTestCall = async () => {
    if (!config.clientPhoneNumber) {
      setError('Configurez d\'abord votre numéro de téléphone.');
      return;
    }

    setTesting(true);
    setError(null);

    // Simuler le test
    await new Promise(resolve => setTimeout(resolve, 2000));

    setTesting(false);
    alert(`Pour tester : Appelez votre numéro ${config.clientPhoneNumber}\nL'appel sera transféré et Sara devrait répondre.`);
  };

  const agentTypes = [
    { value: 'reception', label: 'Accueil téléphonique', description: 'Réceptionne et route les appels' },
    { value: 'qualification', label: 'Qualification de leads', description: 'Qualifie les prospects entrants' },
    { value: 'appointment', label: 'Prise de rendez-vous', description: 'Gère les prises de RDV automatiquement' },
    { value: 'support', label: 'Support client', description: 'Répond aux questions et problèmes' }
  ];

  const transferGuides = [
    {
      id: 'orange',
      name: 'Orange Business',
      steps: [
        'Depuis votre téléphone, composez **#21#** suivi du numéro : **#21#' + TWILIO_SHARED_NUMBER + '#**',
        'Appuyez sur la touche d\'appel',
        'Vous recevrez une confirmation par SMS',
        'Pour désactiver : composez **#21#**'
      ]
    },
    {
      id: 'sfr',
      name: 'SFR Pro',
      steps: [
        'Depuis votre téléphone, composez ***21*' + TWILIO_SHARED_NUMBER + '#**',
        'Appuyez sur la touche d\'appel',
        'Un message vocal confirmera l\'activation',
        'Pour désactiver : composez **#21#**'
      ]
    },
    {
      id: 'bouygues',
      name: 'Bouygues Telecom',
      steps: [
        'Depuis votre téléphone, composez ***21*' + TWILIO_SHARED_NUMBER + '#**',
        'Appuyez sur la touche d\'appel',
        'Vous recevrez un SMS de confirmation',
        'Pour désactiver : composez **##21#**'
      ]
    },
    {
      id: 'free',
      name: 'Free Pro',
      steps: [
        'Connectez-vous à votre Espace Abonné Free Pro',
        'Allez dans "Gestion de la ligne" → "Renvoi d\'appel"',
        'Activez le renvoi et saisissez : ' + TWILIO_SHARED_NUMBER,
        'Validez les modifications'
      ]
    }
  ];

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
              <h1 className="text-2xl font-bold text-gray-900">Configuration Canal Voix</h1>
              <p className="text-sm text-gray-600">Configurez Sara, votre agent IA vocal</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Chargement de la configuration...</span>
          </div>
        )}

        {!loading && (
          <>
        {/* Messages de statut */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Configuration enregistrée avec succès !</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Statut de configuration */}
        {!config.configured && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-orange-900 font-medium mb-1">Configuration requise</p>
              <p className="text-sm text-orange-800">
                Le canal voix doit être configuré par un administrateur avant utilisation.
                Contactez <a href="mailto:support@coccinelle.ai" className="underline font-medium">support@coccinelle.ai</a> pour activer ce service.
              </p>
            </div>
          </div>
        )}

        {/* Activation du canal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                config.configured ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Phone className={`w-6 h-6 ${
                  config.configured ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Canal Voix</h2>
                <p className="text-sm text-gray-600">Agent IA vocal (Sara)</p>
                {config.configured && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-700 font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Configuré
                  </span>
                )}
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
                disabled={!config.configured}
                className="w-6 h-6 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
          </div>
        </div>

        {/* Configuration du numéro */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">Votre numéro professionnel</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Saisissez votre numéro de téléphone professionnel. Il sera utilisé pour vous identifier.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={config.clientPhoneNumber}
              onChange={(e) => setConfig({ ...config, clientPhoneNumber: e.target.value })}
              placeholder="+33 9 87 65 43 21"
              disabled={!config.configured}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format international recommandé (ex: +33 9 87 65 43 21)
            </p>
          </div>
        </div>

        {/* Configuration du transfert */}
        {config.clientPhoneNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-900">Configuration du transfert d'appel</h3>
            </div>

            <p className="text-sm text-blue-800 mb-4">
              Pour que Sara réponde à vos appels, configurez un transfert depuis votre numéro vers :
            </p>

            <div className="bg-white border border-blue-300 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Numéro Coccinelle.AI</p>
                  <p className="text-2xl font-bold text-gray-900">{TWILIO_SHARED_NUMBER}</p>
                </div>
                <button
                  onClick={handleCopyNumber}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copiedNumber ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copier
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900 mb-3">Guide selon votre opérateur :</p>

              {transferGuides.map((guide) => (
                <div key={guide.id} className="bg-white border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{guide.name}</span>
                    {expandedGuide === guide.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  {expandedGuide === guide.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-blue-100">
                      <ol className="space-y-2">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex gap-2">
                            <span className="font-bold text-blue-600">{idx + 1}.</span>
                            <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>💡 Conseil :</strong> Configurez un transfert conditionnel (si occupé / si pas de réponse) pour garder la main sur vos appels tout en bénéficiant de Sara.
              </p>
            </div>
          </div>
        )}

        {/* Configuration de Sara */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">Configuration de Sara</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Personnalisez votre agent vocal
          </p>

          <div className="space-y-4">
            {/* Voix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voix de l'assistant
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfig({ ...config, sara: { ...config.sara, voice: 'female' } })}
                  disabled={!config.configured}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    config.sara.voice === 'female'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <p className="font-medium text-gray-900">Voix féminine</p>
                  <p className="text-xs text-gray-600">Voix chaleureuse et professionnelle</p>
                </button>
                <button
                  onClick={() => setConfig({ ...config, sara: { ...config.sara, voice: 'male' } })}
                  disabled={!config.configured}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    config.sara.voice === 'male'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <p className="font-medium text-gray-900">Voix masculine</p>
                  <p className="text-xs text-gray-600">Voix posée et rassurante</p>
                </button>
              </div>
            </div>

            {/* Nom de l'assistant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'assistant
              </label>
              <input
                type="text"
                value={config.sara.assistantName}
                onChange={(e) => setConfig({ ...config, sara: { ...config.sara, assistantName: e.target.value } })}
                placeholder="Sara"
                disabled={!config.configured}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Le nom utilisé lors de la présentation (ex: "Bonjour, je suis Sara...")
              </p>
            </div>

            {/* Type d'agent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'agent
              </label>
              <select
                value={config.sara.agentType}
                onChange={(e) => setConfig({ ...config, sara: { ...config.sara, agentType: e.target.value as any } })}
                disabled={!config.configured}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
              >
                {agentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Instructions personnalisées */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions personnalisées (optionnel)
              </label>
              <textarea
                value={config.sara.customInstructions}
                onChange={(e) => setConfig({ ...config, sara: { ...config.sara, customInstructions: e.target.value } })}
                placeholder="Ex: Sois chaleureuse et professionnelle. Parle de nos services immobiliers..."
                rows={4}
                disabled={!config.configured}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Personnalisez le comportement de Sara selon vos besoins
              </p>
            </div>
          </div>
        </div>

        {/* Test du canal */}
        {config.enabled && config.configured && config.clientPhoneNumber && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-green-900 mb-2">Tester votre configuration</h3>
            <p className="text-sm text-green-800 mb-4">
              Appelez votre numéro professionnel pour vérifier que Sara répond correctement
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTestCall}
                disabled={testing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Comment tester ?
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

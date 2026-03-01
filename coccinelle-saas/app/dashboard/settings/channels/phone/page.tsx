'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Phone, Save, CheckCircle, AlertCircle, Settings as SettingsIcon, Info, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import Logo from '@/components/Logo';

const TWILIO_SHARED_NUMBER = '+33 9 39 03 57 61';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface AgentType {
  id: string;
  name: string;
  description: string;
  tools?: string[];
}

function PhoneConfigContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const [config, setConfig] = useState({
    enabled: false,
    configured: false,
    clientPhoneNumber: '',
    twilioSharedNumber: TWILIO_SHARED_NUMBER,
    sara: {
      voice: 'female' as 'female' | 'male',
      assistantName: 'Assistant',
      agentType: 'multi_purpose',
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
  const [agentTypes, setAgentTypes] = useState<AgentType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const agentTypesResponse = await fetch(`${API_URL}/api/v1/onboarding/agent-types`);
        if (agentTypesResponse.ok) {
          const agentTypesData = await agentTypesResponse.json();
          if (agentTypesData.success && agentTypesData.agent_types) {
            setAgentTypes(agentTypesData.agent_types);
          }
        }

        const response = await fetch(`${API_URL}/api/v1/omnichannel/agent/config`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const onboardingConfig = sessionStorage.getItem('onboarding_assistant_config');
        let assistantConfig = null;
        if (fromOnboarding && onboardingConfig) {
          assistantConfig = JSON.parse(onboardingConfig);
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            const cfg = data.config;
            setConfig(prev => ({
              ...prev,
              enabled: true,
              configured: true,
              clientPhoneNumber: cfg.phone_number || '',
              sara: {
                voice: assistantConfig?.voice || (cfg.voice_id === 'onwK4e9ZLuTAKqWW03F9' ? 'male' : 'female'),
                assistantName: assistantConfig?.assistant_name || cfg.agent_name || 'Assistant',
                agentType: assistantConfig?.agent_type || cfg.agent_type || 'multi_purpose',
                customInstructions: cfg.system_prompt || '',
                language: cfg.voice_language || 'fr-FR'
              }
            }));
          }
        } else {
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
    fetchData();
  }, [fromOnboarding]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    if (config.enabled && !config.configured) {
      setError('Le canal voix doit d\'abord être configuré par un administrateur.');
      setSaving(false);
      return;
    }
    if (config.enabled && !config.clientPhoneNumber) {
      setError('Veuillez saisir votre numéro de téléphone professionnel.');
      setSaving(false);
      return;
    }
    const phoneRegex = /^\+?\d{10,15}$/;
    if (config.clientPhoneNumber && !phoneRegex.test(config.clientPhoneNumber.replace(/\s/g, ''))) {
      setError('Format de numéro invalide. Utilisez le format international (+33...)');
      setSaving(false);
      return;
    }
    try {
      const token = localStorage.getItem('auth_token');
      const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
      const tenantId = tenant.id;
      if (!tenantId) throw new Error('Tenant ID manquant');

      const response = await fetch(`${API_URL}/api/v1/omnichannel/agent/config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          agent_type: config.sara.agentType,
          agent_name: config.sara.assistantName,
          voice_id: config.sara.voice === 'female' ? 'pNInz6obpgDQGcFmaJgB' : 'onwK4e9ZLuTAKqWW03F9',
          voice_language: config.sara.language || 'fr-FR',
          system_prompt: config.sara.customInstructions || ''
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }
      localStorage.setItem('phone_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (fromOnboarding) setTimeout(() => router.push('/onboarding'), 1500);
    } catch (e: any) {
      console.error('Error saving Phone config:', e);
      localStorage.setItem('phone_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (fromOnboarding) setTimeout(() => router.push('/onboarding'), 1500);
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTesting(false);
    alert(`Pour tester : Appelez votre numéro ${config.clientPhoneNumber}`);
  };

  const transferGuides = [
    { id: 'orange', name: 'Orange Business', steps: ['Composez **#21#' + TWILIO_SHARED_NUMBER + '#**', 'Appuyez sur la touche d\'appel', 'Confirmation par SMS', 'Pour désactiver : **#21#**'] },
    { id: 'sfr', name: 'SFR Pro', steps: ['Composez ***21*' + TWILIO_SHARED_NUMBER + '#**', 'Appuyez sur la touche d\'appel', 'Message vocal de confirmation', 'Pour désactiver : **#21#**'] },
    { id: 'bouygues', name: 'Bouygues Telecom', steps: ['Composez ***21*' + TWILIO_SHARED_NUMBER + '#**', 'Appuyez sur la touche d\'appel', 'SMS de confirmation', 'Pour désactiver : **##21#**'] },
    { id: 'free', name: 'Free Pro', steps: ['Connectez-vous à votre Espace Abonné', 'Gestion de la ligne → Renvoi d\'appel', 'Saisissez : ' + TWILIO_SHARED_NUMBER, 'Validez'] }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings/channels"><button className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button></Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration Canal Voix</h1>
              <p className="text-sm text-gray-600">Configurez Assistant, votre agent IA vocal</p>
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
            {saved && <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-600" /><p className="text-green-800 font-medium">Configuration enregistrée !</p></div>}
            {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-red-800 font-medium">{error}</p></div>}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.configured ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Phone className={`w-6 h-6 ${config.configured ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Canal Voix</h2>
                    <p className="text-sm text-gray-600">Agent IA vocal</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{config.enabled ? 'Activé' : 'Désactivé'}</span>
                  <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} disabled={!config.configured} className="w-6 h-6 text-gray-900 rounded" />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Votre numéro professionnel</h3>
              <input type="tel" value={config.clientPhoneNumber} onChange={(e) => setConfig({ ...config, clientPhoneNumber: e.target.value })} placeholder="+33 9 87 65 43 21" disabled={!config.configured} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>

            {config.clientPhoneNumber && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-900 mb-4">Transfert d'appel</h3>
                <div className="bg-white border border-blue-300 rounded-lg p-4 mb-4 flex items-center justify-between">
                  <div><p className="text-xs text-gray-600">Numéro Coccinelle</p><p className="text-2xl font-bold">{TWILIO_SHARED_NUMBER}</p></div>
                  <button onClick={handleCopyNumber} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">{copiedNumber ? <><CheckCircle className="w-4 h-4" />Copié !</> : <><Copy className="w-4 h-4" />Copier</>}</button>
                </div>
                {transferGuides.map(g => (
                  <div key={g.id} className="bg-white border border-blue-200 rounded-lg mb-2">
                    <button onClick={() => setExpandedGuide(expandedGuide === g.id ? null : g.id)} className="w-full px-4 py-3 flex justify-between"><span className="font-medium">{g.name}</span>{expandedGuide === g.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button>
                    {expandedGuide === g.id && <div className="px-4 pb-4">{g.steps.map((s, i) => <p key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: `${i + 1}. ${s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}` }} />)}</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Configuration Assistant</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => setConfig({ ...config, sara: { ...config.sara, voice: 'female' } })} className={`p-4 border-2 rounded-lg ${config.sara.voice === 'female' ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}><p className="font-medium">Voix féminine</p></button>
                <button onClick={() => setConfig({ ...config, sara: { ...config.sara, voice: 'male' } })} className={`p-4 border-2 rounded-lg ${config.sara.voice === 'male' ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}><p className="font-medium">Voix masculine</p></button>
              </div>
              <input type="text" value={config.sara.assistantName} onChange={(e) => setConfig({ ...config, sara: { ...config.sara, assistantName: e.target.value } })} placeholder="Nom de l'assistant" className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" />
              <select value={config.sara.agentType} onChange={(e) => setConfig({ ...config, sara: { ...config.sara, agentType: e.target.value } })} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4">
                {agentTypes.length > 0 ? agentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>) : <option value="multi_purpose">Agent Polyvalent</option>}
              </select>
              <textarea value={config.sara.customInstructions} onChange={(e) => setConfig({ ...config, sara: { ...config.sara, customInstructions: e.target.value } })} placeholder="Instructions personnalisées..." rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/settings/channels"><button className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium">Annuler</button></Link>
              <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-gray-900 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                {saving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Enregistrement...</> : <><Save className="w-5 h-5" />Enregistrer</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PhoneConfigPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div></div>}>
      <PhoneConfigContent />
    </Suspense>
  );
}

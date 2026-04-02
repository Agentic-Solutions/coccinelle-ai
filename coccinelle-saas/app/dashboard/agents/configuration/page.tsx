'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bot, Phone, Mic, Brain, Volume2, History, CheckCircle,
  ChevronDown, Play, Square, Loader2, MessageCircle, Send, X,
  User, Globe, Settings, Zap, GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import { SECTORS } from '@/lib/sectors';
import { VOICE_OPTIONS } from '@/lib/voices';
import type { VoiceOption } from '@/lib/voices';
import { SECTOR_PROMPTS, getSectorPrompt } from '@/lib/prompts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Prompt {
  id: number;
  secteur: string;
  canal: string;
  version: number;
  system_prompt: string;
  is_active: number;
  performance_score: number | null;
  created_at: string;
  activated_at: string | null;
  notes: string | null;
}

interface Analytics {
  calls: {
    total: number;
    successful: number;
    avg_duration_seconds: number;
    success_rate: number;
  };
  by_canal: { canal: string; count: number }[];
  active_prompts: { secteur: string; canal: string; version: number; performance_score: number | null }[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

function getVoixIAHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const LLM_OPTIONS = [
  { provider: 'mistral', model: 'mistral-large-latest', label: 'Mistral Large' },
  { provider: 'mistral', model: 'mistral-small-latest', label: 'Mistral Small' },
  { provider: 'claude',  model: 'claude-sonnet-4-6',    label: 'Claude Sonnet' },
  { provider: 'claude',  model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku' },
];

type TabId = 'identite' | 'voix' | 'comportement' | 'avance';

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AgentConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('identite');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Identité
  const [assistantName, setAssistantName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [promptSecteur, setPromptSecteur] = useState('generaliste');
  const [agentDescription, setAgentDescription] = useState('');

  // Voix
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]?.id || '');
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'Féminin' | 'Masculin'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  // Comportement
  const [promptText, setPromptText] = useState('');
  const [promptNotes, setPromptNotes] = useState('');
  const [tonality, setTonality] = useState<'professionnel' | 'amical' | 'formel'>('professionnel');
  const [humanTransfer, setHumanTransfer] = useState(true);
  const templateBaseRef = useRef('');

  // Avancé
  const [selectedLLM, setSelectedLLM] = useState('mistral|mistral-large-latest');
  const [agentPhone, setAgentPhone] = useState('+33 9 39 03 57 60');

  // Simulation
  const [showSimulation, setShowSimulation] = useState(false);
  const [simMessages, setSimMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const simEndRef = useRef<HTMLDivElement | null>(null);

  const currentScenarios = SECTOR_PROMPTS[promptSecteur]?.quick_scenarios || [];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSimSend(text?: string) {
    const msg = text || simInput.trim();
    if (!msg || simLoading) return;
    const newMessages = [...simMessages, { role: 'user' as const, content: msg }];
    setSimMessages(newMessages);
    setSimInput('');
    setSimLoading(true);
    try {
      const [provider] = selectedLLM.split('|');
      const res = await fetch(buildApiUrl('/api/v1/ai/simulate'), {
        method: 'POST',
        headers: getVoixIAHeaders(),
        body: JSON.stringify({
          system_prompt: promptText,
          messages: newMessages,
          llm_provider: provider,
        }),
      });
      const data = await res.json();
      setSimMessages([...newMessages, {
        role: 'assistant',
        content: data.reply || 'Erreur : pas de réponse du LLM.',
      }]);
    } catch {
      setSimMessages([...newMessages, {
        role: 'assistant',
        content: 'Erreur réseau. Vérifiez la connexion.',
      }]);
    }
    setSimLoading(false);
    setTimeout(() => simEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  const playVoicePreview = async (voice: VoiceOption) => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
    }
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }
    setLoadingVoiceId(voice.id);
    try {
      const res = await fetch(buildApiUrl('/api/v1/ai/voice-preview'), {
        method: 'POST',
        headers: getVoixIAHeaders(),
        body: JSON.stringify({ voice_id: voice.id, text: voice.preview_text }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio.current = audio;
      setPlayingVoiceId(voice.id);
      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch {
      // Preview indisponible
    } finally {
      setLoadingVoiceId(null);
    }
  };

  function applyVariables(raw: string, name: string, company: string): string {
    return raw
      .replaceAll('{ASSISTANT_NAME}', name || '{ASSISTANT_NAME}')
      .replaceAll('{COMPANY_NAME}', company || '{COMPANY_NAME}');
  }

  useEffect(() => {
    loadAll();
    loadTenantInfo();
  }, []);

  useEffect(() => {
    if (!templateBaseRef.current) return;
    setPromptText(applyVariables(templateBaseRef.current, assistantName, companyName));
  }, [assistantName, companyName]);

  async function loadAll() {
    setLoading(true);
    try {
      const [prmRes, anlRes] = await Promise.all([
        fetch(buildApiUrl('/api/v1/ai/prompts'), { headers: getVoixIAHeaders() }),
        fetch(buildApiUrl('/api/v1/ai/analytics'), { headers: getVoixIAHeaders() }),
      ]);
      const prmData = await prmRes.json();
      const anlData = await anlRes.json();
      setPrompts(prmData.prompts || []);
      setAnalytics(anlData);
    } catch {
      showMsg('error', 'Erreur lors du chargement des données');
    }
    setLoading(false);
  }

  async function loadTenantInfo() {
    try {
      const res = await fetch(buildApiUrl('/api/v1/auth/me'), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const name = data.tenant?.name || data.tenant?.company_name;
      if (name) setCompanyName(name);
      const sector = data.tenant?.sector || data.tenant?.industry || '';
      if (sector) {
        const sectorKey = getSectorPrompt(sector) ? sector : 'generaliste';
        handleSectorChange(sectorKey);
      }
    } catch { /* ignore */ }
  }

  function handleSectorChange(secteur: string) {
    setPromptSecteur(secteur);
    if (!secteur) return;
    const sectorData = getSectorPrompt(secteur);
    if (!sectorData) return;
    const raw = sectorData.system_prompt;
    templateBaseRef.current = raw;
    setPromptText(applyVariables(raw, assistantName, companyName));
  }

  async function handleSaveAll() {
    if (!promptText.trim()) {
      showMsg('error', 'Le prompt ne peut pas être vide');
      return;
    }
    const finalPrompt = promptText
      .replaceAll('{ASSISTANT_NAME}', assistantName || 'Assistant')
      .replaceAll('{COMPANY_NAME}', companyName || 'Entreprise');
    setSaving(true);
    try {
      const [provider, model] = selectedLLM.split('|');
      const res = await fetch(buildApiUrl('/api/v1/ai/prompts'), {
        method: 'POST',
        headers: getVoixIAHeaders(),
        body: JSON.stringify({
          system_prompt: finalPrompt,
          secteur: promptSecteur,
          canal: 'voice',
          notes: promptNotes || null,
          llm_provider: provider,
          llm_model: model,
          voice_id: selectedVoice,
        }),
      });
      const data = await res.json();
      if (data.prompt_id) {
        const activateRes = await fetch(buildApiUrl(`/api/v1/ai/prompts/activate/${data.prompt_id}`), {
          method: 'POST',
          headers: getVoixIAHeaders(),
          body: JSON.stringify({
            voice_id: selectedVoice,
            llm_provider: provider,
            llm_model: model,
          }),
        });
        const activateData = await activateRes.json();
        if (activateData.prompt_id) {
          showMsg('success', 'Configuration sauvegardée et activée.');
        } else {
          showMsg('success', `Prompt v${data.version} créé mais l'activation a échoué.`);
        }
        loadAll();
      } else {
        showMsg('error', 'Erreur lors de la sauvegarde');
      }
    } catch {
      showMsg('error', 'Erreur réseau');
    }
    setSaving(false);
  }

  const [activating, setActivating] = useState<number | null>(null);

  async function handleActivate(promptId: number) {
    if (activating) return;
    setActivating(promptId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/ai/prompts/activate/${promptId}`), {
        method: 'POST',
        headers: getVoixIAHeaders(),
      });
      const data = await res.json();
      if (data.prompt_id) {
        showMsg('success', 'Prompt activé !');
        loadAll();
      }
    } catch {
      showMsg('error', 'Erreur lors de l\'activation');
    }
    setActivating(null);
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'identite', label: 'Identité', icon: <User className="w-4 h-4" /> },
    { id: 'voix', label: 'Voix', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'comportement', label: 'Comportement', icon: <Brain className="w-4 h-4" /> },
    { id: 'avance', label: 'Avancé', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Message flash */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
          message.type === 'success' ? 'bg-gray-900' : 'bg-gray-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="pl-10 lg:pl-0 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="w-6 h-6 text-gray-700" />
                Configuration Agent
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">Configurez votre agent vocal IA</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSimMessages([]);
                  setSimInput('');
                  setShowSimulation(true);
                }}
                disabled={!promptText.trim()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Simuler</span>
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Phone className="w-5 h-5 text-gray-700" />
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">En ligne</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">VoixIA</p>
            <p className="text-sm text-gray-600 mt-1">Agent vocal actif</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-600">Total appels</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.calls.total ?? '—'}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-600">Taux de succès</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.calls.success_rate ?? '—'}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-600">Prompts actifs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.active_prompts.length ?? '—'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                    activeTab === tab.id
                      ? 'border-b-2 border-gray-900 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              <Link
                href="/dashboard/agents/nodes"
                className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base text-gray-600 hover:text-gray-900 ml-auto"
              >
                <GitBranch className="w-4 h-4" />
                Séquences
              </Link>
            </nav>
          </div>

          <div className="p-6">

            {/* ── Onglet Identité ── */}
            {activeTab === 'identite' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Identité de l&apos;agent</h3>
                  <p className="text-sm text-gray-600">Définissez qui est votre agent vocal</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom de l&apos;agent
                  </label>
                  <input
                    type="text"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="Ex: Julien, Léa, Fati..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Le prénom sera utilisé dans le prompt et le greeting</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l&apos;entreprise
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Votre entreprise"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secteur d&apos;activité
                  </label>
                  <div className="relative">
                    <select
                      value={promptSecteur}
                      onChange={(e) => handleSectorChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
                    >
                      <option value="">— Choisir un secteur —</option>
                      {SECTORS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Le secteur charge un template de prompt adapté</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    rows={3}
                    placeholder="Décrivez brièvement le rôle de votre agent..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* ── Onglet Voix ── */}
            {activeTab === 'voix' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Voix de l&apos;agent</h3>
                  <p className="text-sm text-gray-600">Choisissez la voix ElevenLabs de votre agent</p>
                </div>

                <div className="flex gap-1 mb-3">
                  {([['all', 'Toutes'], ['Féminin', 'Féminines'], ['Masculin', 'Masculines']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setVoiceFilter(key)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        voiceFilter === key
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {VOICE_OPTIONS
                    .filter(v => voiceFilter === 'all' || v.gender === voiceFilter)
                    .map(v => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedVoice === v.id
                          ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-gray-900 truncate">{v.label}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{v.gender === 'Féminin' ? 'F' : 'M'}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{v.style}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playVoicePreview(v); }}
                        disabled={loadingVoiceId === v.id}
                        className="ml-2 flex-shrink-0 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        title="Écouter"
                      >
                        {loadingVoiceId === v.id ? (
                          <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" />
                        ) : playingVoiceId === v.id ? (
                          <Square className="w-3.5 h-3.5 text-gray-900" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Onglet Comportement ── */}
            {activeTab === 'comportement' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Comportement de l&apos;agent</h3>
                  <p className="text-sm text-gray-600">Définissez comment votre agent interagit</p>
                </div>

                {/* Tonalité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Tonalité</label>
                  <div className="flex gap-3">
                    {([
                      { value: 'professionnel', label: 'Professionnel' },
                      { value: 'amical', label: 'Amical' },
                      { value: 'formel', label: 'Formel' },
                    ] as const).map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                          tonality === opt.value
                            ? 'border-gray-900 bg-gray-50 text-gray-900'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tonality"
                          value={opt.value}
                          checked={tonality === opt.value}
                          onChange={() => setTonality(opt.value)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transfert humain */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Transfert vers un humain</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Permet à l&apos;agent de transférer l&apos;appel si nécessaire
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHumanTransfer(!humanTransfer)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      humanTransfer ? 'bg-gray-900' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      humanTransfer ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt système
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPromptText(val);
                      let raw = val;
                      if (assistantName) raw = raw.replaceAll(assistantName, '{ASSISTANT_NAME}');
                      if (companyName) raw = raw.replaceAll(companyName, '{COMPANY_NAME}');
                      templateBaseRef.current = raw;
                    }}
                    rows={12}
                    placeholder="Décrivez le comportement de votre agent vocal..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">{promptText.length} caractères</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <input
                    type="text"
                    value={promptNotes}
                    onChange={(e) => setPromptNotes(e.target.value)}
                    placeholder="Ex: Ajout gestion objections prix"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Historique des prompts */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historique des prompts
                  </h4>
                  {loading ? (
                    <p className="text-gray-500 text-sm">Chargement...</p>
                  ) : prompts.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun prompt créé.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {[...prompts].sort((a, b) => b.is_active - a.is_active).map(p => (
                        <div
                          key={p.id}
                          className={`p-3 rounded-lg border ${
                            p.is_active
                              ? 'border-gray-400 bg-gray-100'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-gray-900">
                                  {p.secteur} — v{p.version}
                                </span>
                                {p.is_active === 1 && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-900 rounded font-medium">
                                    Actif
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{p.system_prompt}</p>
                            </div>
                            {p.is_active !== 1 && (
                              <button
                                onClick={() => handleActivate(p.id)}
                                disabled={activating === p.id}
                                className="flex-shrink-0 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                              >
                                {activating === p.id ? '...' : 'Activer'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Onglet Avancé ── */}
            {activeTab === 'avance' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Paramètres avancés</h3>
                  <p className="text-sm text-gray-600">Configuration technique de l&apos;agent</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle LLM
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLLM}
                      onChange={(e) => setSelectedLLM(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
                    >
                      {LLM_OPTIONS.map(o => (
                        <option key={`${o.provider}|${o.model}`} value={`${o.provider}|${o.model}`}>
                          {o.label} ({o.provider})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Le modèle utilisé pour générer les réponses vocales</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Le numéro associé à cet agent (non modifiable)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d&apos;agent
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
                      defaultValue="inbound"
                    >
                      <option value="inbound">Entrant (réception d&apos;appels)</option>
                      <option value="outbound">Sortant (émission d&apos;appels)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Analytics résumé */}
                {analytics && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistiques</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total appels', value: analytics.calls.total },
                        { label: 'Réussis', value: analytics.calls.successful },
                        { label: 'Taux succès', value: `${analytics.calls.success_rate}%` },
                        { label: 'Durée moy.', value: `${analytics.calls.avg_duration_seconds}s` },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                          <p className="text-xl font-bold text-gray-900">{s.value}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal Simulation ── */}
      {showSimulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Simulation de conversation</h3>
                <p className="text-xs text-gray-500">Testez votre prompt en temps réel</p>
              </div>
              <button onClick={() => setShowSimulation(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {currentScenarios.length > 0 && simMessages.length === 0 && (
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Scénarios rapides :</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentScenarios.map((sc, i) => (
                    <button
                      key={i}
                      onClick={() => handleSimSend(sc.message)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: '250px' }}>
              {simMessages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Envoyez un message pour tester le prompt.</p>
                </div>
              )}
              {simMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {simLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-500 px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm">
                    <Loader2 className="w-4 h-4 animate-spin inline" /> Réflexion...
                  </div>
                </div>
              )}
              <div ref={simEndRef} />
            </div>

            <div className="px-5 py-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimSend()}
                  placeholder="Écrivez un message..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  disabled={simLoading}
                />
                <button
                  onClick={() => handleSimSend()}
                  disabled={!simInput.trim() || simLoading}
                  className="px-3.5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

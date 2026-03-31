'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Phone, Zap, Brain, Volume2, History, BarChart3, CheckCircle, Plus, ChevronDown, GitBranch, Play, Square, Loader2, MessageCircle, Send, X } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import { SECTORS } from '@/lib/sectors';
import { VOICE_OPTIONS } from '@/lib/voices';
import type { VoiceOption } from '@/lib/voices';
import { SECTOR_PROMPTS, getSectorPrompt } from '@/lib/prompts';
import type { QuickScenario } from '@/lib/prompts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Template {
  id: number;
  secteur: string;
  label: string;
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  voice_id: string;
}

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

// Sources uniques : lib/voices.ts (voix), lib/prompts.ts (prompts sectoriels)

// ─── Composant principal ──────────────────────────────────────────────────────

export default function VoixIAPage() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'historique' | 'analytics'>('prompts');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulaire nouveau prompt
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedLLM, setSelectedLLM] = useState('mistral|mistral-large-latest');
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]?.id || '');
  const [promptText, setPromptText] = useState('');
  const [promptNotes, setPromptNotes] = useState('');
  const [promptSecteur, setPromptSecteur] = useState('generaliste');
  const [assistantName, setAssistantName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const templateBaseRef = useRef('');

  // Preview audio des voix
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'Féminin' | 'Masculin'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  // Simulation
  const [showSimulation, setShowSimulation] = useState(false);
  const [simMessages, setSimMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const simEndRef = useRef<HTMLDivElement | null>(null);

  const currentScenarios = SECTOR_PROMPTS[promptSecteur]?.quick_scenarios || [];

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
      if (data.reply) {
        setSimMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setSimMessages([...newMessages, { role: 'assistant', content: 'Erreur : pas de réponse du LLM.' }]);
      }
    } catch {
      setSimMessages([...newMessages, { role: 'assistant', content: 'Erreur réseau. Vérifiez la connexion.' }]);
    }
    setSimLoading(false);
    setTimeout(() => simEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function openSimulation() {
    setSimMessages([]);
    setSimInput('');
    setShowSimulation(true);
  }

  const playVoicePreview = async (voice: VoiceOption) => {
    // Stopper l'audio en cours
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
    }
    // Toggle off si même voix
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
      // Preview indisponible — silencieux
    } finally {
      setLoadingVoiceId(null);
    }
  };

  function applyVariables(raw: string, name: string, company: string): string {
    return raw
      .replaceAll('{ASSISTANT_NAME}', name || '{ASSISTANT_NAME}')
      .replaceAll('{COMPANY_NAME}', company || '{COMPANY_NAME}');
  }

  // ─── Chargement des données ─────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
    loadTenantInfo();
  }, []);

  // Remplacement automatique quand le nom ou l'entreprise change
  useEffect(() => {
    if (!templateBaseRef.current) return;
    setPromptText(applyVariables(templateBaseRef.current, assistantName, companyName));
  }, [assistantName, companyName]);

  async function loadAll() {
    setLoading(true);
    try {
      const [tplRes, prmRes, anlRes] = await Promise.all([
        fetch(buildApiUrl('/api/v1/ai/templates'), { headers: getVoixIAHeaders() }),
        fetch(buildApiUrl('/api/v1/ai/prompts'), { headers: getVoixIAHeaders() }),
        fetch(buildApiUrl('/api/v1/ai/analytics'), { headers: getVoixIAHeaders() }),
      ]);
      const tplData = await tplRes.json();
      const prmData = await prmRes.json();
      const anlData = await anlRes.json();
      setTemplates(tplData.templates || []);
      setPrompts(prmData.prompts || []);
      setAnalytics(anlData);
    } catch {
      showMessage('error', 'Erreur lors du chargement des données');
    }
    setLoading(false);
  }

  async function loadTenantInfo() {
    try {
      const res = await fetch(buildApiUrl('/api/v1/auth/me'), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();

      // Company name
      const name = data.tenant?.name || data.tenant?.company_name;
      if (name) setCompanyName(name);

      // Pre-select tenant sector via getSectorPrompt (source unique)
      const sector = data.tenant?.sector || data.tenant?.industry || '';
      if (sector && !selectedTemplate) {
        const sectorKey = getSectorPrompt(sector) ? sector : 'generaliste';
        handleTemplateChange(sectorKey);
      }
    } catch { /* ignore */ }
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  function handleTemplateChange(secteur: string) {
    setSelectedTemplate(secteur);
    setPromptSecteur(secteur);
    if (!secteur) return;

    // Source unique : lib/prompts.ts via getSectorPrompt()
    const sectorData = getSectorPrompt(secteur);
    if (!sectorData) return;

    const raw = sectorData.system_prompt;
    templateBaseRef.current = raw;
    setPromptText(applyVariables(raw, assistantName, companyName));
  }

  async function handleSavePrompt() {
    if (!promptText.trim()) {
      showMessage('error', 'Le prompt ne peut pas être vide');
      return;
    }
    // Appliquer les remplacements finaux avant envoi
    const finalPrompt = promptText
      .replaceAll('{ASSISTANT_NAME}', assistantName || 'Assistant')
      .replaceAll('{COMPANY_NAME}', companyName || 'Entreprise');
    setSaving(true);
    try {
      const [provider, model] = selectedLLM.split('|');
      // 1. Créer le prompt
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
        // 2. Activer immédiatement + envoyer voice/LLM config
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
          showMessage('success', '✓ Prompt activé ! Votre agent vocal utilise maintenant ce prompt. Appelez le +33939035760 pour tester.');
        } else {
          showMessage('success', `Prompt v${data.version} créé mais l'activation a échoué. Activez-le dans l'historique.`);
        }
        setPromptText('');
        setPromptNotes('');
        loadAll();
      } else {
        showMessage('error', 'Erreur lors de la création du prompt');
      }
    } catch {
      showMessage('error', 'Erreur réseau');
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
        showMessage('success', '✓ Prompt activé ! Votre agent vocal utilise maintenant ce prompt. Appelez le +33939035760 pour tester.');
        loadAll();
      }
    } catch {
      showMessage('error', 'Erreur lors de l\'activation');
    }
    setActivating(null);
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Message flash */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard">
              <Logo size={48} className="hidden sm:block" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">VoixIA & Prompts</h1>
              <p className="text-xs sm:text-sm text-gray-600">Gérez votre agent vocal IA et ses prompts dynamiques</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Phone className="w-5 h-5 text-green-600" />
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">En ligne</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">VoixIA</p>
            <p className="text-sm text-gray-600 mt-1">Agent vocal actif</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total appels</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.calls.total ?? '—'}</p>
            <p className="text-sm text-gray-600 mt-1">Depuis le début</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Taux de succès</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.calls.success_rate ?? '—'}%</p>
            <p className="text-sm text-gray-600 mt-1">Appels réussis</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Prompts actifs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.active_prompts.length ?? '—'}</p>
            <p className="text-sm text-gray-600 mt-1">Configurés</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {[
                { id: 'prompts',     label: 'Nouveau Prompt',  icon: <Plus className="w-4 h-4" /> },
                { id: 'historique',  label: 'Historique',      icon: <History className="w-4 h-4" /> },
                { id: 'analytics',   label: 'Analytics',       icon: <BarChart3 className="w-4 h-4" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                href="/dashboard/voixia/sequence"
                className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base text-gray-600 hover:text-gray-900"
              >
                <GitBranch className="w-4 h-4" />
                Séquences
              </Link>
            </nav>
          </div>

          <div className="p-6">

            {/* ── Onglet Nouveau Prompt ── */}
            {activeTab === 'prompts' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Créer un nouveau prompt</h3>

                {/* Sélecteur secteur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secteur d'activité
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
                    >
                      <option value="">— Choisir un secteur (charge le template) —</option>
                      {SECTORS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Prénom de l'agent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom de l&apos;agent
                  </label>
                  <input
                    type="text"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="Ex: Sara, Julien, Léa..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Sélecteur LLM */}
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
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Sélecteur Voix avec preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voix ElevenLabs
                  </label>
                  {/* Filtres genre */}
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
                  {/* Grille voix responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
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

                {/* Éditeur prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPromptText(val);
                      // Re-insérer les placeholders pour que les futurs changements de nom fonctionnent
                      let raw = val;
                      if (assistantName) raw = raw.replaceAll(assistantName, '{ASSISTANT_NAME}');
                      if (companyName) raw = raw.replaceAll(companyName, '{COMPANY_NAME}');
                      templateBaseRef.current = raw;
                    }}
                    rows={10}
                    placeholder="Décrivez le comportement de votre agent vocal..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">{promptText.length} caractères</p>
                  {promptText.includes('{ASSISTANT_NAME}') || promptText.includes('{COMPANY_NAME}') ? (
                    <p className="text-xs text-gray-400 mt-1">
                      Les variables {'{ASSISTANT_NAME}'} et {'{COMPANY_NAME}'} sont remplacées automatiquement.
                    </p>
                  ) : null}
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

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleSavePrompt}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    {saving ? 'Activation en cours...' : 'Enregistrer et activer'}
                  </button>
                  <button
                    onClick={openSimulation}
                    disabled={!promptText.trim()}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Simuler une conversation
                  </button>
                </div>
              </div>
            )}

            {/* ── Onglet Historique ── */}
            {activeTab === 'historique' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Historique des prompts</h3>

                {loading ? (
                  <p className="text-gray-500">Chargement...</p>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun prompt créé pour l'instant.</p>
                    <p className="text-sm mt-1">Créez votre premier prompt dans l'onglet "Nouveau Prompt".</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...prompts].sort((a, b) => b.is_active - a.is_active).map(p => (
                      <div
                        key={p.id}
                        className={`p-4 rounded-lg border ${
                          p.is_active
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-900">
                                {p.secteur} — v{p.version}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {p.canal}
                              </span>
                              {p.is_active === 1 && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                  ✓ Actif
                                </span>
                              )}
                              {p.performance_score !== null && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  Score : {p.performance_score}%
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{p.system_prompt}</p>
                            {p.notes && (
                              <p className="text-xs text-gray-500 mt-1">📝 {p.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Créé le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                              {p.activated_at && ` · Activé le ${new Date(p.activated_at).toLocaleDateString('fr-FR')}`}
                            </p>
                          </div>
                          {p.is_active !== 1 && (
                            <button
                              onClick={() => handleActivate(p.id)}
                              disabled={activating === p.id}
                              className="flex-shrink-0 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
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
            )}

            {/* ── Onglet Analytics ── */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Analytics VoixIA</h3>

                {loading || !analytics ? (
                  <p className="text-gray-500">Chargement...</p>
                ) : (
                  <>
                    {/* Stats appels */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Total appels',    value: analytics.calls.total },
                        { label: 'Réussis',         value: analytics.calls.successful },
                        { label: 'Taux succès',     value: `${analytics.calls.success_rate}%` },
                        { label: 'Durée moyenne',   value: `${analytics.calls.avg_duration_seconds}s` },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                          <p className="text-sm text-gray-600 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Par canal */}
                    {analytics.by_canal.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Par canal</h4>
                        <div className="space-y-2">
                          {analytics.by_canal.map(c => (
                            <div key={c.canal} className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700 w-20">{c.canal}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-gray-900 h-2 rounded-full"
                                  style={{ width: `${Math.min((c.count / (analytics.calls.total || 1)) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-8">{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prompts actifs */}
                    {analytics.active_prompts.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Prompts actifs</h4>
                        <div className="space-y-2">
                          {analytics.active_prompts.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div>
                                <span className="font-medium text-gray-900">{p.secteur}</span>
                                <span className="text-sm text-gray-500 ml-2">({p.canal}) v{p.version}</span>
                              </div>
                              {p.performance_score !== null && (
                                <span className="text-sm font-medium text-green-700">
                                  {p.performance_score}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.calls.total === 0 && analytics.active_prompts.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Aucune donnée disponible pour l'instant.</p>
                        <p className="text-sm mt-1">Les stats apparaîtront après les premiers appels.</p>
                      </div>
                    )}
                  </>
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Simulation de conversation</h3>
                <p className="text-xs text-gray-500">Testez votre prompt en temps réel</p>
              </div>
              <button onClick={() => setShowSimulation(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Quick scenarios */}
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

            {/* Messages */}
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

            {/* Input */}
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

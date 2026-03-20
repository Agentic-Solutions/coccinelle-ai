'use client';

import { useState, useEffect } from 'react';
import { Mic, Phone, Zap, Brain, Volume2, History, BarChart3, CheckCircle, Plus, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';

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

const API_BASE = 'https://coccinelle-api.youssef-amrouche.workers.dev';
const VOIXIA_KEY = '813f882e34f8b033e398e9a3c0ed38070e98a88e50eeee485ac0e8e06de11cc9';
const VOIXIA_TENANT = 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';

const HEADERS = {
  'Content-Type': 'application/json',
  'X-VoixIA-Key': VOIXIA_KEY,
  'X-VoixIA-Tenant': VOIXIA_TENANT,
};

const LLM_OPTIONS = [
  { provider: 'mistral', model: 'mistral-large-latest', label: 'Mistral Large' },
  { provider: 'mistral', model: 'mistral-small-latest', label: 'Mistral Small' },
  { provider: 'openai',  model: 'gpt-4o',               label: 'GPT-4o' },
  { provider: 'openai',  model: 'gpt-4o-mini',          label: 'GPT-4o Mini' },
];

const VOICE_OPTIONS = [
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Charlotte (FR — Naturelle)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella (FR — Douce)' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (FR — Masculin)' },
];

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
  const [selectedVoice, setSelectedVoice] = useState('cgSgspJ2msm6clMCkdW9');
  const [promptText, setPromptText] = useState('');
  const [promptNotes, setPromptNotes] = useState('');
  const [promptSecteur, setPromptSecteur] = useState('generaliste');

  // ─── Chargement des données ─────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tplRes, prmRes, anlRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/ai/templates`, { headers: HEADERS }),
        fetch(`${API_BASE}/api/v1/ai/prompts`, { headers: HEADERS }),
        fetch(`${API_BASE}/api/v1/ai/analytics`, { headers: HEADERS }),
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

  // ─── Actions ────────────────────────────────────────────────────────────────

  function handleTemplateChange(secteur: string) {
    setSelectedTemplate(secteur);
    setPromptSecteur(secteur);
    const tpl = templates.find(t => t.secteur === secteur);
    if (tpl) setPromptText(tpl.system_prompt);
  }

  async function handleSavePrompt() {
    if (!promptText.trim()) {
      showMessage('error', 'Le prompt ne peut pas être vide');
      return;
    }
    setSaving(true);
    try {
      const [provider, model] = selectedLLM.split('|');
      const res = await fetch(`${API_BASE}/api/v1/ai/prompts`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          system_prompt: promptText,
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
        showMessage('success', `Prompt v${data.version} créé avec succès !`);
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

  async function handleActivate(promptId: number) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/prompts/activate/${promptId}`, {
        method: 'POST',
        headers: HEADERS,
      });
      const data = await res.json();
      if (data.prompt_id) {
        showMessage('success', 'Prompt activé avec succès !');
        loadAll();
      }
    } catch {
      showMessage('error', 'Erreur lors de l\'activation');
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
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
                      {templates.map(t => (
                        <option key={t.secteur} value={t.secteur}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
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

                {/* Sélecteur Voix */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voix ElevenLabs
                  </label>
                  <div className="relative">
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
                    >
                      {VOICE_OPTIONS.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Éditeur prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={10}
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

                <button
                  onClick={handleSavePrompt}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
                >
                  <Zap className="w-5 h-5" />
                  {saving ? 'Enregistrement...' : 'Enregistrer le prompt'}
                </button>
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
                    {prompts.map(p => (
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
                              className="flex-shrink-0 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              Activer
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
    </div>
  );
}

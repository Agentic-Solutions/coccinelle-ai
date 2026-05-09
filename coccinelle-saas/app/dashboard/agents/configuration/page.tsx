'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, ChevronDown, Play, Square, Loader2,
  MessageCircle, Send, X, Zap, GitBranch,
  RotateCcw, History, Check, Plus, Trash2,
  Phone, Calendar, BookOpen, UserPlus, Mail, MessageSquare,
  FileText, Mic, Settings, Upload, ArrowLeft,
  PhoneForwarded, MoreHorizontal,
  type LucideIcon
} from 'lucide-react';
import Link from 'next/link';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import { SECTORS } from '@/lib/sectors';
import { VOICE_OPTIONS } from '@/lib/voices';
import type { VoiceOption } from '@/lib/voices';
import { SECTOR_PROMPTS, getSectorPrompt } from '@/lib/prompts';
import { FLOW_TEMPLATES, type FlowTemplate } from '@/lib/flow-templates';

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface Agent {
  id: number;
  agent_name: string | null;
  agent_type: string | null;
  llm_model: string | null;
  llm_provider: string | null;
  voice_id: string | null;
  secteur: string | null;
  active_prompt_id: number | null;
  transfer_enabled: number | null;
  transfer_number: string | null;
  updated_at: string | null;
  prompt_id: number | null;
  prompt_secteur: string | null;
  is_active: number | null;
  prompt_preview: string | null;
  versions_count: number;
}

interface VersionRow {
  id: number;
  secteur: string;
  canal: string;
  version: number;
  is_active: number;
  created_at: string;
  activated_at: string | null;
  preview: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

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

const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'receptionniste', label: 'Réceptionniste' },
  { id: 'rdv', label: 'Prise de RDV' },
  { id: 'support', label: 'Support client' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'apres_heures', label: 'Après-heures' },
  { id: 'multi', label: 'Multi-services' },
];

const CATEGORY_SECTORS: Record<string, string[]> = {
  receptionniste: ['generaliste', 'restaurant', 'beaute', 'autre'],
  rdv: ['dentiste', 'sante', 'beaute', 'fitness', 'automobile'],
  support: ['ecommerce', 'artisan', 'automobile'],
  qualification: ['immobilier', 'juridique', 'education'],
  apres_heures: ['generaliste', 'autre'],
  multi: ['generaliste', 'restaurant', 'artisan', 'education', 'autre'],
};

const TEMPLATE_CAPS: Record<string, LucideIcon[]> = {
  generaliste:  [Phone, Calendar, BookOpen, UserPlus],
  immobilier:   [Phone, MessageSquare, Calendar, UserPlus],
  sante:        [Phone, Calendar, BookOpen],
  dentiste:     [Phone, Calendar],
  restaurant:   [Phone, Calendar, Mail],
  automobile:   [Phone, MessageSquare, Calendar, UserPlus],
  beaute:       [Phone, Calendar],
  fitness:      [Phone, Calendar, BookOpen],
  ecommerce:    [Phone, MessageSquare, Mail, BookOpen],
  artisan:      [Phone, Calendar, UserPlus],
  juridique:    [Phone, Calendar, BookOpen],
  education:    [Phone, Calendar, BookOpen, Mail],
  autre:        [Phone, Calendar],
};

const FLOW_CAP_ICONS: Record<string, LucideIcon> = {
  Phone, Calendar, BookOpen, UserPlus, MessageSquare, Mail, PhoneForwarded,
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  facile: { label: 'Facile', color: 'bg-green-100 text-green-700' },
  intermediaire: { label: 'Intermédiaire', color: 'bg-yellow-100 text-yellow-700' },
  avance: { label: 'Avancé', color: 'bg-red-100 text-red-700' },
};

const TEMPLATE_DESC: Record<string, string> = {
  generaliste:  'Accueil standard, qualification, prise de RDV et rappels.',
  immobilier:   'Qualification achat, vente, location et estimation.',
  sante:        'Accueil patient, screening et gestion urgences.',
  dentiste:     'Urgences dentaires, routine et première visite.',
  restaurant:   'Réservation, menu du jour et gestion groupes.',
  automobile:   'Achat, reprise, entretien et financement.',
  beaute:       'Coiffure, esthétique, spa et prise de RDV.',
  fitness:      'Inscription, cours collectifs et coaching.',
  ecommerce:    'Suivi commande, retours et réclamations.',
  artisan:      'Urgences, devis et suivi chantier.',
  juridique:    'Consultation, qualification domaine juridique.',
  education:    'Inscription, programmes et financement CPF/OPCO.',
  autre:        'Template adaptable à tout secteur d\'activité.',
};

const TYPE_LABELS: Record<string, string> = {
  single_prompt: 'Prompt libre',
  conversational_flow: 'Flux guidé',
};

// ─── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-gray-900' : 'bg-gray-300'
        }`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AgentConfigurationPage() {
  const router = useRouter();

  // ─── View state ────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'config'>('list');
  const [configTab, setConfigTab] = useState<'prompt' | 'voice' | 'behavior' | 'versions'>('prompt');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ─── Agents list ───────────────────────────────────────────────────────
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // ─── Create modal ──────────────────────────────────────────────────────
  const [agentType, setAgentType] = useState<'single_prompt' | 'conversational_flow'>('single_prompt');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState('all');
  const [createName, setCreateName] = useState('');
  const [createCompany, setCreateCompany] = useState('');
  const [createSector, setCreateSector] = useState('generaliste');

  // ─── Loading / Messages ────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Config state ──────────────────────────────────────────────────────
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [assistantName, setAssistantName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [promptSecteur, setPromptSecteur] = useState('generaliste');
  const [editingName, setEditingName] = useState(false);

  // Prompt
  const [promptText, setPromptText] = useState('');
  const [promptNotes, setPromptNotes] = useState('');
  const templateBaseRef = useRef('');
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  // Voice
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]?.id || '');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  // LLM & Temperature
  const [selectedLLM, setSelectedLLM] = useState('mistral|mistral-large-latest');
  const [temperature, setTemperature] = useState(0.1);

  // Behavior
  const [humanTransfer, setHumanTransfer] = useState(false);
  const [transferNumber, setTransferNumber] = useState('');
  const [kbRequired, setKbRequired] = useState(true);
  const [smsConfirmation, setSmsConfirmation] = useState(false);
  const [maxCallDuration, setMaxCallDuration] = useState(15);

  // Simulation
  const [showSimulation, setShowSimulation] = useState(false);
  const [simMessages, setSimMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const simEndRef = useRef<HTMLDivElement | null>(null);

  // Versions tab
  const [activating, setActivating] = useState<number | null>(null);

  // Import
  const importRef = useRef<HTMLInputElement | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────
  const activePrompt = prompts.find(p => p.is_active === 1);
  const selectedVoiceObj = VOICE_OPTIONS.find(v => v.id === selectedVoice);
  const currentScenarios = SECTOR_PROMPTS[promptSecteur]?.quick_scenarios || [];

  // ─── Helpers ──────────────────────────────────────────────────────────

  function applyVariables(raw: string, name: string, company: string): string {
    return raw
      .replaceAll('{NOM_AGENT}', name || '{NOM_AGENT}')
      .replaceAll('{NOM_ENTREPRISE}', company || '{NOM_ENTREPRISE}')
      .replaceAll('{ASSISTANT_NAME}', name || '{NOM_AGENT}')
      .replaceAll('{COMPANY_NAME}', company || '{NOM_ENTREPRISE}');
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  }

  function insertVariable(variable: string) {
    const textarea = promptRef.current;
    if (!textarea) { setPromptText(prev => prev + variable); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = promptText.substring(0, start) + variable + promptText.substring(end);
    setPromptText(newText);
    let raw = newText;
    if (assistantName) raw = raw.replaceAll(assistantName, '{NOM_AGENT}');
    if (companyName) raw = raw.replaceAll(companyName, '{NOM_ENTREPRISE}');
    templateBaseRef.current = raw;
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  }

  function getFilteredTemplates() {
    const entries = Object.entries(SECTOR_PROMPTS);
    if (templateCategory === 'all') return entries;
    const ids = CATEGORY_SECTORS[templateCategory] || [];
    return entries.filter(([key]) => ids.includes(key));
  }

  function getFilteredFlowTemplates(): FlowTemplate[] {
    if (templateCategory === 'all') return FLOW_TEMPLATES;
    return FLOW_TEMPLATES.filter(t => t.category === templateCategory);
  }

  function getVoiceName(voiceId: string | null): string {
    if (!voiceId) return '—';
    const v = VOICE_OPTIONS.find(vo => vo.id === voiceId);
    return v ? v.label : voiceId.substring(0, 8) + '...';
  }

  function getSectorLabel(secteur: string | null): string {
    if (!secteur) return '—';
    const s = SECTORS.find(sec => sec.value === secteur);
    return s ? s.label : secteur;
  }

  function formatDate(d: string | null): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  }

  // ─── Data Loading ─────────────────────────────────────────────────────

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/voixia/agents'), { headers: getVoixIAHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/voixia/agents/versions'), { headers: getVoixIAHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadPrompts = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/ai/prompts'), { headers: getVoixIAHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
        const vc = data.voixia_config;
        if (vc) {
          setHumanTransfer(vc.transfer_enabled === 1);
          setTransferNumber(vc.transfer_number || '');
          if (vc.voice_id) setSelectedVoice(vc.voice_id);
          if (vc.llm_provider && vc.llm_model) setSelectedLLM(`${vc.llm_provider}|${vc.llm_model}`);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const loadTenantInfo = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/auth/me'), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const name = data.tenant?.name || data.tenant?.company_name;
      if (name) { setCompanyName(name); setCreateCompany(name); }
      const agentName = data.tenant?.agent_name;
      if (agentName) { setAssistantName(agentName); setCreateName(agentName); }
      const sector = data.tenant?.sector || data.tenant?.industry || '';
      if (sector && getSectorPrompt(sector)) { setPromptSecteur(sector); setCreateSector(sector); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadAgents(), loadPrompts(), loadTenantInfo()]);
      setLoading(false);
    })();
  }, [loadAgents, loadPrompts, loadTenantInfo]);

  useEffect(() => {
    if (!templateBaseRef.current) return;
    setPromptText(applyVariables(templateBaseRef.current, assistantName, companyName));
  }, [assistantName, companyName]);

  // ─── Open agent config ────────────────────────────────────────────────

  function openAgentConfig(agent: Agent) {
    setSelectedAgent(agent);
    // Load agent data into config state
    if (agent.agent_name) setAssistantName(agent.agent_name);
    if (agent.secteur) setPromptSecteur(agent.secteur);
    if (agent.voice_id) setSelectedVoice(agent.voice_id);
    if (agent.llm_provider && agent.llm_model) setSelectedLLM(`${agent.llm_provider}|${agent.llm_model}`);
    setHumanTransfer(agent.transfer_enabled === 1);
    setTransferNumber(agent.transfer_number || '');

    // Load the active prompt text
    const active = prompts.find(p => p.is_active === 1);
    if (active) {
      setPromptText(active.system_prompt);
      templateBaseRef.current = active.system_prompt;
      setPromptSecteur(active.secteur || 'generaliste');
    }

    loadVersions();
    setConfigTab('prompt');
    setView('config');
  }

  function goBackToList() {
    setView('list');
    setSelectedAgent(null);
    loadAgents();
  }

  // ─── Save & Activate ─────────────────────────────────────────────────

  async function handleSaveAll() {
    if (!promptText.trim()) { showMsg('error', 'Le prompt ne peut pas être vide'); return; }
    const finalPrompt = promptText
      .replaceAll('{NOM_AGENT}', assistantName || 'Assistant')
      .replaceAll('{NOM_ENTREPRISE}', companyName || 'Entreprise')
      .replaceAll('{ASSISTANT_NAME}', assistantName || 'Assistant')
      .replaceAll('{COMPANY_NAME}', companyName || 'Entreprise');
    setSaving(true);
    try {
      const [provider, model] = selectedLLM.split('|');
      const res = await fetch(buildApiUrl('/api/v1/ai/prompts'), {
        method: 'POST',
        headers: getVoixIAHeaders(),
        body: JSON.stringify({
          system_prompt: finalPrompt, secteur: promptSecteur, canal: 'voice',
          notes: promptNotes || null, llm_provider: provider, llm_model: model, voice_id: selectedVoice,
        }),
      });
      const data = await res.json();
      if (data.prompt_id) {
        const actRes = await fetch(buildApiUrl(`/api/v1/ai/prompts/activate/${data.prompt_id}`), {
          method: 'POST', headers: getVoixIAHeaders(),
          body: JSON.stringify({
            voice_id: selectedVoice, llm_provider: provider, llm_model: model,
            transfer_enabled: humanTransfer, transfer_number: transferNumber || null,
          }),
        });
        const actData = await actRes.json();
        showMsg('success', actData.prompt_id ? 'Configuration sauvegardée et activée.' : `Prompt v${data.version} créé mais activation échouée.`);
        await Promise.all([loadPrompts(), loadVersions(), loadAgents()]);
      } else { showMsg('error', 'Erreur lors de la sauvegarde'); }
    } catch { showMsg('error', 'Erreur réseau'); }
    setSaving(false);
  }

  async function handleActivateVersion(versionId: number) {
    if (activating) return;
    setActivating(versionId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/voixia/agents/versions/${versionId}/activate`), {
        method: 'POST', headers: getVoixIAHeaders(),
      });
      const data = await res.json();
      if (data.activated) {
        showMsg('success', 'Version restaurée et activée !');
        await Promise.all([loadPrompts(), loadVersions(), loadAgents()]);
        // Reload prompt text
        const pRes = await fetch(buildApiUrl('/api/v1/ai/prompts'), { headers: getVoixIAHeaders() });
        if (pRes.ok) {
          const pData = await pRes.json();
          const active = (pData.prompts || []).find((p: Prompt) => p.is_active === 1);
          if (active) {
            setPromptText(active.system_prompt);
            templateBaseRef.current = active.system_prompt;
          }
        }
      }
    } catch { showMsg('error', 'Erreur lors de l\'activation'); }
    setActivating(null);
  }

  async function handleDeleteAgent(agentId: number) {
    if (!confirm('Désactiver cet agent ? Les prompts seront conservés mais l\'agent ne répondra plus.')) return;
    try {
      const res = await fetch(buildApiUrl(`/api/v1/voixia/agents/${agentId}`), {
        method: 'DELETE', headers: getVoixIAHeaders(),
      });
      if (res.ok) {
        showMsg('success', 'Agent désactivé');
        await loadAgents();
      }
    } catch { showMsg('error', 'Erreur lors de la suppression'); }
  }

  function handleReset() {
    const sd = getSectorPrompt(promptSecteur);
    if (sd) {
      templateBaseRef.current = sd.system_prompt;
      setPromptText(applyVariables(sd.system_prompt, assistantName, companyName));
    }
    setTemperature(0.1);
    showMsg('success', 'Réinitialisé au template');
  }

  // ─── Voice Preview ────────────────────────────────────────────────────

  async function playVoicePreview(voice: VoiceOption) {
    if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current = null; }
    if (playingVoiceId === voice.id) { setPlayingVoiceId(null); return; }
    setLoadingVoiceId(voice.id);
    try {
      const res = await fetch(buildApiUrl('/api/v1/ai/voice-preview'), {
        method: 'POST', headers: getVoixIAHeaders(),
        body: JSON.stringify({ voice_id: voice.id, text: voice.preview_text }),
      });
      if (!res.ok) throw new Error('fail');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio.current = audio;
      setPlayingVoiceId(voice.id);
      audio.onended = () => { setPlayingVoiceId(null); URL.revokeObjectURL(url); };
      audio.play();
    } catch { /* unavailable */ }
    finally { setLoadingVoiceId(null); }
  }

  // ─── Simulation ───────────────────────────────────────────────────────

  async function handleSimSend(text?: string) {
    const msg = text || simInput.trim();
    if (!msg || simLoading) return;
    const newMsgs = [...simMessages, { role: 'user' as const, content: msg }];
    setSimMessages(newMsgs);
    setSimInput('');
    setSimLoading(true);
    try {
      const [provider] = selectedLLM.split('|');
      const res = await fetch(buildApiUrl('/api/v1/ai/simulate'), {
        method: 'POST', headers: getVoixIAHeaders(),
        body: JSON.stringify({ system_prompt: promptText, messages: newMsgs, llm_provider: provider }),
      });
      const data = await res.json();
      setSimMessages([...newMsgs, { role: 'assistant', content: data.reply || 'Erreur : pas de réponse.' }]);
    } catch {
      setSimMessages([...newMsgs, { role: 'assistant', content: 'Erreur réseau.' }]);
    }
    setSimLoading(false);
    setTimeout(() => simEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ─── Create Agent ─────────────────────────────────────────────────────

  async function handleCreateAgent() {
    if (agentType === 'conversational_flow') {
      if (selectedTemplate) {
        const tmpl = FLOW_TEMPLATES.find(t => t.id === selectedTemplate);
        if (tmpl) {
          localStorage.setItem('voixia_flow_template', JSON.stringify({
            nodes: tmpl.nodes, edges: tmpl.edges, name: tmpl.name, greeting: tmpl.greeting,
          }));
        }
      }
      setShowCreateModal(false);
      router.push('/dashboard/agents/nodes');
      return;
    }

    // Single prompt — create via API
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/voixia/agents'), {
        method: 'POST',
        headers: getVoixIAHeaders(),
        body: JSON.stringify({
          agent_name: createName || 'Assistant',
          agent_type: agentType,
          template_id: selectedTemplate || null,
          secteur: selectedTemplate || createSector,
          company_name: createCompany,
        }),
      });
      const data = await res.json();
      if (data.prompt_id) {
        showMsg('success', `Agent "${createName || 'Assistant'}" créé !`);
        setShowCreateModal(false);
        await Promise.all([loadAgents(), loadPrompts()]);
        // Auto-open in config
        setTimeout(async () => {
          const agRes = await fetch(buildApiUrl('/api/v1/voixia/agents'), { headers: getVoixIAHeaders() });
          if (agRes.ok) {
            const agData = await agRes.json();
            const list = agData.agents || [];
            if (list.length > 0) openAgentConfig(list[0]);
          }
        }, 300);
      } else {
        showMsg('error', data.error || 'Erreur lors de la création');
      }
    } catch { showMsg('error', 'Erreur réseau'); }
    setSaving(false);
  }

  // ─── Import JSON ──────────────────────────────────────────────────────

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        // Detect format : Coccinelle export or Retell export
        let name = 'Agent importé';
        let prompt = '';
        let secteur = 'generaliste';

        if (json.system_prompt && json.agent_name) {
          // Format Coccinelle
          name = json.agent_name;
          prompt = json.system_prompt;
          secteur = json.secteur || 'generaliste';
        } else if (json.response_engine?.llm?.general_prompt) {
          // Format Retell
          name = json.agent_name || 'Agent Retell';
          prompt = json.response_engine.llm.general_prompt;
        } else if (json.general_prompt) {
          // Format Retell simplifié
          prompt = json.general_prompt;
        } else {
          showMsg('error', 'Format JSON non reconnu');
          return;
        }

        const res = await fetch(buildApiUrl('/api/v1/voixia/agents'), {
          method: 'POST',
          headers: getVoixIAHeaders(),
          body: JSON.stringify({ agent_name: name, agent_type: 'single_prompt', secteur }),
        });
        const data = await res.json();
        if (data.prompt_id && prompt) {
          // Update the prompt text
          await fetch(buildApiUrl('/api/v1/ai/prompts'), {
            method: 'POST',
            headers: getVoixIAHeaders(),
            body: JSON.stringify({ system_prompt: prompt, secteur, canal: 'voice', notes: 'Import JSON' }),
          });
        }
        showMsg('success', `Agent "${name}" importé !`);
        await loadAgents();
      } catch {
        showMsg('error', 'Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ─── Config tabs ──────────────────────────────────────────────────────

  const configTabs: { id: typeof configTab; label: string; icon: React.ReactNode }[] = [
    { id: 'prompt', label: 'Prompt', icon: <FileText className="w-4 h-4" /> },
    { id: 'voice', label: 'Voix', icon: <Mic className="w-4 h-4" /> },
    { id: 'behavior', label: 'Comportement', icon: <Settings className="w-4 h-4" /> },
    { id: 'versions', label: 'Historique', icon: <History className="w-4 h-4" /> },
  ];

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
          message.type === 'success' ? 'bg-gray-900' : 'bg-gray-700'
        }`}>{message.text}</div>
      )}

      {/* Hidden import input */}
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VUE 1 — LISTE DES AGENTS                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes agents</h1>
              <p className="text-sm text-gray-500 mt-1">{agents.length} agent{agents.length !== 1 ? 's' : ''} configuré{agents.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" /> Importer
              </button>
              <button
                onClick={() => {
                  setAgentType('single_prompt');
                  setSelectedTemplate(null);
                  setTemplateCategory('all');
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Créer un agent
              </button>
            </div>
          </div>

          {/* Table or Empty */}
          {agents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun agent configuré</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Créez votre premier agent vocal IA pour commencer à recevoir des appels automatiquement.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Créer un agent
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Agent</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Type</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Voix</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Secteur</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Modifié le</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agents.map(agent => (
                    <tr
                      key={agent.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openAgentConfig(agent)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{agent.agent_name || 'Agent sans nom'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {agent.active_prompt_id ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> En ligne
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" /> Hors ligne
                                </span>
                              )}
                              <span className="text-xs text-gray-400">{agent.versions_count} version{agent.versions_count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          agent.agent_type === 'conversational_flow'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {agent.agent_type === 'conversational_flow' ? (
                            <GitBranch className="w-3 h-3" />
                          ) : (
                            <span className="font-mono text-[10px]">{'{}'}</span>
                          )}
                          {TYPE_LABELS[agent.agent_type || 'single_prompt'] || 'Single prompt'}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-700">{getVoiceName(agent.voice_id)}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-700">{getSectorLabel(agent.secteur)}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-500">{formatDate(agent.updated_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openAgentConfig(agent)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
                            title="Configurer"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
                            title="Désactiver"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VUE 2 — CONFIG D'UN AGENT                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {view === 'config' && (
        <>
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={goBackToList} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <Bot className="w-6 h-6 text-gray-700 flex-shrink-0" />
                  <div className="min-w-0">
                    {editingName ? (
                      <input
                        type="text" value={assistantName} onChange={e => setAssistantName(e.target.value)}
                        onBlur={() => setEditingName(false)} onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                        autoFocus className="text-xl font-bold text-gray-900 border-b-2 border-gray-900 outline-none bg-transparent px-0"
                      />
                    ) : (
                      <h1
                        onClick={() => setEditingName(true)}
                        className="text-xl font-bold text-gray-900 cursor-text hover:text-gray-700 transition-colors"
                        title="Cliquer pour modifier"
                      >{assistantName || 'Agent sans nom'}</h1>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {activePrompt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> En ligne
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> Hors ligne
                        </span>
                      )}
                      {activePrompt && (
                        <span className="text-xs text-gray-400">v{activePrompt.version} — {activePrompt.secteur}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/agents/nodes" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <GitBranch className="w-4 h-4" /> Séquences
                  </Link>
                  <button
                    onClick={() => { setSimMessages([]); setSimInput(''); setShowSimulation(true); }}
                    disabled={!promptText.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Simuler</span>
                  </button>
                  <button
                    onClick={handleSaveAll} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto">
                  {configTabs.map(tab => (
                    <button
                      key={tab.id} onClick={() => { setConfigTab(tab.id); if (tab.id === 'versions') loadVersions(); }}
                      className={`flex items-center gap-2 px-5 py-3.5 font-medium transition-colors whitespace-nowrap text-sm ${
                        configTab === tab.id ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >{tab.icon}{tab.label}</button>
                  ))}
                </nav>
              </div>

              <div className="p-5 sm:p-6">

                {/* TAB 1: PROMPT */}
                {configTab === 'prompt' && (
                  <div className="space-y-5">
                    {activePrompt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">Version active : <span className="font-medium text-gray-900">v{activePrompt.version}</span> ({activePrompt.secteur})</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prompt système</label>
                      <textarea
                        ref={promptRef} value={promptText} rows={20}
                        onChange={e => {
                          const val = e.target.value;
                          setPromptText(val);
                          let raw = val;
                          if (assistantName) raw = raw.replaceAll(assistantName, '{NOM_AGENT}');
                          if (companyName) raw = raw.replaceAll(companyName, '{NOM_ENTREPRISE}');
                          templateBaseRef.current = raw;
                        }}
                        placeholder="Décrivez le comportement de votre agent vocal..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm leading-relaxed resize-y"
                      />
                      <p className="text-xs text-gray-400 mt-1">{promptText.length} caractères</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 self-center mr-1">Variables :</span>
                      {[
                        { var: '{NOM_AGENT}', tip: 'Sera remplacé par le prénom de l\'agent (ex: Fati)' },
                        { var: '{NOM_ENTREPRISE}', tip: 'Sera remplacé par le nom de votre entreprise' },
                        { var: '{HORAIRES}', tip: 'Sera remplacé par vos horaires d\'ouverture' },
                        { var: '{TELEPHONE}', tip: 'Numéro de transfert vers un humain' },
                      ].map(v => (
                        <button key={v.var} type="button" onClick={() => insertVariable(v.var)}
                          title={v.tip}
                          className="px-3 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border border-gray-200 cursor-pointer"
                        >{v.var}</button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                      <input type="text" value={promptNotes} onChange={e => setPromptNotes(e.target.value)}
                        placeholder="Ex: Ajout gestion objections prix"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: VOIX */}
                {configTab === 'voice' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Voix ElevenLabs</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none text-sm"
                          >
                            <optgroup label="Voix féminines">
                              {VOICE_OPTIONS.filter(v => v.gender === 'Féminin').map(v => (
                                <option key={v.id} value={v.id}>{v.label} — {v.style}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Voix masculines">
                              {VOICE_OPTIONS.filter(v => v.gender === 'Masculin').map(v => (
                                <option key={v.id} value={v.id}>{v.label} — {v.style}</option>
                              ))}
                            </optgroup>
                          </select>
                          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {selectedVoiceObj && (
                          <button type="button" onClick={() => playVoicePreview(selectedVoiceObj)}
                            disabled={loadingVoiceId === selectedVoice}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                          >
                            {loadingVoiceId === selectedVoice ? <Loader2 className="w-4 h-4 animate-spin" />
                              : playingVoiceId === selectedVoice ? <Square className="w-4 h-4 text-gray-900" />
                              : <Play className="w-4 h-4 text-gray-600" />}
                            Écouter
                          </button>
                        )}
                      </div>
                      {selectedVoiceObj && (
                        <p className="text-xs text-gray-500 mt-1.5">{selectedVoiceObj.gender} — {selectedVoiceObj.style}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vitesse</label>
                      <input type="range" min="0.5" max="2.0" step="0.1" value={voiceSpeed}
                        onChange={e => setVoiceSpeed(parseFloat(e.target.value))} className="w-full accent-gray-900" />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0.5x Lent</span>
                        <span className="font-medium text-gray-700">{voiceSpeed.toFixed(1)}x</span>
                        <span>2.0x Rapide</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Température</label>
                      <input type="range" min="0" max="1" step="0.1" value={temperature}
                        onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full accent-gray-900" />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Précis</span>
                        <span className="font-medium text-gray-700">{temperature.toFixed(1)}</span>
                        <span>Créatif</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: COMPORTEMENT */}
                {configTab === 'behavior' && (
                  <div className="max-w-xl space-y-1 divide-y divide-gray-100">
                    <Toggle checked={kbRequired} onChange={setKbRequired}
                      label="Recherche KB obligatoire avant réponse"
                      description="L'agent consulte la base de connaissances avant chaque réponse" />
                    <Toggle checked={humanTransfer} onChange={setHumanTransfer}
                      label="Transfert humain activé"
                      description="Transférer l'appel vers un humain si nécessaire" />
                    {humanTransfer && (
                      <div className="py-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de transfert</label>
                        <input type="tel" value={transferNumber} onChange={e => setTransferNumber(e.target.value)}
                          placeholder="+33 6 XX XX XX XX"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm" />
                      </div>
                    )}
                    <Toggle checked={smsConfirmation} onChange={setSmsConfirmation}
                      label="Confirmation SMS après RDV"
                      description="Envoyer un SMS de confirmation automatique" />
                    <div className="py-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modèle LLM</label>
                      <div className="relative">
                        <select value={selectedLLM} onChange={e => setSelectedLLM(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none text-sm"
                        >
                          {LLM_OPTIONS.map(o => (
                            <option key={`${o.provider}|${o.model}`} value={`${o.provider}|${o.model}`}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="py-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durée max appel (minutes)</label>
                      <input type="number" min={1} max={60} value={maxCallDuration}
                        onChange={e => setMaxCallDuration(parseInt(e.target.value) || 15)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm" />
                    </div>
                    <div className="pt-4">
                      <button onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      ><RotateCcw className="w-4 h-4" /> Réinitialiser au template</button>
                    </div>
                  </div>
                )}

                {/* TAB 4: HISTORIQUE */}
                {configTab === 'versions' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Historique des versions</h3>
                        <span className="text-xs text-gray-400">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Retrouvez toutes les versions de votre prompt. Restaurez une version précédente en un clic.</p>
                    </div>
                    {versions.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucune version créée.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {versions.map(v => (
                          <div key={v.id} className={`p-4 rounded-lg border transition-colors ${
                            v.is_active === 1 ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm text-gray-900">v{v.version}</span>
                                  <span className="text-xs text-gray-400">{v.secteur}</span>
                                  {v.is_active === 1 && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Actif</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.preview}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-gray-400">
                                    Créé le {formatDate(v.created_at)}
                                  </span>
                                  {v.activated_at && (
                                    <span className="text-xs text-gray-400">
                                      Activé le {formatDate(v.activated_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {v.is_active !== 1 && (
                                <button
                                  onClick={() => handleActivateVersion(v.id)}
                                  disabled={activating === v.id}
                                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  {activating === v.id ? '...' : 'Restaurer'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALE CRÉATION D'AGENT                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-12 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 mb-12 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Créer votre agent</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choisissez le type et personnalisez</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-8 overflow-y-auto flex-1 min-h-0">
              {/* SECTION IDENTITÉ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom de l&apos;agent</label>
                  <input
                    type="text" value={createName} onChange={e => setCreateName(e.target.value)}
                    placeholder="Ex: Fati, Sophie..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de votre entreprise</label>
                  <input
                    type="text" value={createCompany} onChange={e => setCreateCompany(e.target.value)}
                    placeholder="Ex: Agentic Solutions"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* SECTION TYPE (onglets) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Type</label>
                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setAgentType('single_prompt'); setSelectedTemplate(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-sm transition-colors ${
                      agentType === 'single_prompt'
                        ? 'border-b-2 border-gray-900 text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <div className="text-left">
                      <p>Prompt libre</p>
                      <p className="text-xs text-gray-400 font-normal mt-0.5">Facile à démarrer. Conversations naturelles.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAgentType('conversational_flow'); setSelectedTemplate(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-sm transition-colors ${
                      agentType === 'conversational_flow'
                        ? 'border-b-2 border-gray-900 text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GitBranch className="w-4 h-4" />
                    <div className="text-left">
                      <p>Flux guidé</p>
                      <p className="text-xs text-gray-400 font-normal mt-0.5">Prêt pour la production. Conversations déterministes.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2 — TEMPLATES */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Templates</label>
                <div className="flex gap-1 overflow-x-auto pb-3 -mx-1 px-1">
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                        templateCategory === cat.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >{cat.label}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                  {/* Agent vierge */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className={`text-center p-4 rounded-lg border-2 border-dashed transition-all ${
                      selectedTemplate === null ? 'border-gray-900 bg-gray-50' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <Plus className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-700 text-sm">Agent vierge</p>
                  </button>

                  {agentType === 'single_prompt' ? (
                    getFilteredTemplates().map(([key, data]) => {
                      const caps = TEMPLATE_CAPS[key] || [Phone];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setSelectedTemplate(key); setCreateSector(key); }}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${
                            selectedTemplate === key ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            {caps.map((Icon, i) => <Icon key={i} className="w-3.5 h-3.5 text-gray-400" />)}
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{data.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{TEMPLATE_DESC[key] || ''}</p>
                        </button>
                      );
                    })
                  ) : (
                    getFilteredFlowTemplates().map(tmpl => {
                      const diff = DIFFICULTY_LABELS[tmpl.difficulty] || DIFFICULTY_LABELS.facile;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedTemplate(tmpl.id)}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${
                            selectedTemplate === tmpl.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              {tmpl.capabilities.map((cap, i) => {
                                const Icon = FLOW_CAP_ICONS[cap];
                                return Icon ? <Icon key={i} className="w-3.5 h-3.5 text-gray-400" /> : null;
                              })}
                            </div>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${diff.color}`}>{diff.label}</span>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{tmpl.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tmpl.description}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{tmpl.nodes.length} nodes</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {agentType === 'conversational_flow' && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  Le flow sera ouvert dans l&apos;éditeur de séquences
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >Annuler</button>
              <button
                onClick={handleCreateAgent}
                disabled={saving}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
              >{saving ? 'Création...' : 'Créer l\'agent'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SIMULATION MODAL                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
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
                  {currentScenarios.map((sc: { label: string; message: string }, i: number) => (
                    <button key={i} onClick={() => handleSimSend(sc.message)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
                    >{sc.label}</button>
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
                    m.role === 'user' ? 'bg-gray-900 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}>{m.content}</div>
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
                <input type="text" value={simInput} onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSimSend()}
                  placeholder="Écrivez un message..." disabled={simLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                <button onClick={() => handleSimSend()} disabled={!simInput.trim() || simLoading}
                  className="px-3.5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                ><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import SequenceEditor from '@/components/SequenceEditor';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import {
  Phone, MessageSquare, Mail, Users, Zap, Plus, Trash2, RefreshCw,
  CheckCircle, XCircle, Clock, AlertCircle, ChevronDown
} from 'lucide-react';

interface OmniRule {
  id: number;
  trigger_event: string;
  trigger_channel: string;
  action_channel: string;
  action_type: string;
  action_template: string | null;
  delay_seconds: number;
  is_active: number;
  created_at: string;
}

interface Execution {
  id: number;
  rule_id: number;
  contact_phone: string;
  contact_email: string;
  status: string;
  result: string;
  executed_at: string;
  trigger_event: string;
  trigger_channel: string;
  action_channel: string;
  action_type: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  call_ended: 'Appel termine',
  message_received: 'Message recu',
  appointment_created: 'RDV cree',
};

const CHANNEL_LABELS: Record<string, string> = {
  voice: 'Telephone',
  sms: 'SMS',
  email: 'Email',
  whatsapp: 'WhatsApp',
  crm: 'CRM',
};

const ACTION_LABELS: Record<string, string> = {
  send_message: 'Envoyer SMS',
  send_email: 'Envoyer email',
  ai_reply: 'Reponse IA',
  create_prospect: 'Creer contact',
};

const CHANNEL_ICONS: Record<string, typeof Phone> = {
  voice: Phone,
  sms: MessageSquare,
  email: Mail,
  whatsapp: MessageSquare,
  crm: Users,
};

const SCENARIOS = [
  {
    title: 'Appel → SMS',
    desc: 'Apres chaque appel, confirmez par SMS',
    trigger_event: 'call_ended',
    trigger_channel: 'voice',
    action_channel: 'sms',
    action_type: 'send_message',
    template: 'Bonjour {contact_name}, merci pour votre appel chez {company_name}. Nous traitons votre demande.',
    delay: 30,
  },
  {
    title: 'Appel → Email',
    desc: 'Envoyez un recapitulatif apres l\'appel',
    trigger_event: 'call_ended',
    trigger_channel: 'voice',
    action_channel: 'email',
    action_type: 'send_email',
    template: 'Recapitulatif de votre appel avec {company_name}',
    delay: 60,
  },
  {
    title: 'SMS → Reponse IA',
    desc: 'Repondez automatiquement aux SMS entrants',
    trigger_event: 'message_received',
    trigger_channel: 'sms',
    action_channel: 'sms',
    action_type: 'ai_reply',
    template: null,
    delay: 0,
  },
  {
    title: 'WhatsApp → Contact CRM',
    desc: 'Creez automatiquement vos prospects WhatsApp',
    trigger_event: 'message_received',
    trigger_channel: 'whatsapp',
    action_channel: 'crm',
    action_type: 'create_prospect',
    template: null,
    delay: 0,
  },
  {
    title: 'Appel → Contact CRM',
    desc: 'Creez un prospect apres chaque appel',
    trigger_event: 'call_ended',
    trigger_channel: 'voice',
    action_channel: 'crm',
    action_type: 'create_prospect',
    template: null,
    delay: 0,
  },
];

export default function AgentNodesPage() {
  const [tab, setTab] = useState<'sequences' | 'rules' | 'history'>('rules');
  const [rules, setRules] = useState<OmniRule[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({
    trigger_event: 'call_ended',
    trigger_channel: 'voice',
    action_channel: 'sms',
    action_type: 'send_message',
    action_template: '',
    delay_seconds: 0,
  });

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/omnicanal/rules'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadExecutions = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/omnicanal/executions'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.executions || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab === 'rules') loadRules();
    if (tab === 'history') loadExecutions();
  }, [tab, loadRules, loadExecutions]);

  const toggleRule = async (ruleId: number, currentActive: number) => {
    try {
      const res = await fetch(buildApiUrl(`/api/v1/omnicanal/rules/${ruleId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: currentActive ? false : true }),
      });
      if (res.ok) {
        showMsg(currentActive ? 'Regle desactivee' : 'Regle activee');
        loadRules();
      }
    } catch { showMsg('Erreur', true); }
  };

  const deleteRule = async (ruleId: number) => {
    try {
      const res = await fetch(buildApiUrl(`/api/v1/omnicanal/rules/${ruleId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) { showMsg('Regle supprimee'); loadRules(); }
    } catch { showMsg('Erreur', true); }
  };

  const createRule = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/omnicanal/rules'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        showMsg('Regle creee');
        setShowCreate(false);
        loadRules();
      } else {
        const data = await res.json().catch(() => ({}));
        showMsg(data.error || 'Erreur', true);
      }
    } catch { showMsg('Erreur reseau', true); }
  };

  const activateScenario = async (scenario: typeof SCENARIOS[0]) => {
    // Verifier si la regle existe deja
    const exists = rules.find(
      r => r.trigger_event === scenario.trigger_event &&
           r.trigger_channel === scenario.trigger_channel &&
           r.action_channel === scenario.action_channel &&
           r.action_type === scenario.action_type
    );
    if (exists) {
      if (!exists.is_active) {
        await toggleRule(exists.id, 0);
      } else {
        showMsg('Ce scenario est deja actif');
      }
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/api/v1/omnicanal/rules'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          trigger_event: scenario.trigger_event,
          trigger_channel: scenario.trigger_channel,
          action_channel: scenario.action_channel,
          action_type: scenario.action_type,
          action_template: scenario.template,
          delay_seconds: scenario.delay,
        }),
      });
      if (res.ok) { showMsg('Scenario active'); loadRules(); }
    } catch { showMsg('Erreur', true); }
  };

  const isScenarioActive = (scenario: typeof SCENARIOS[0]) => {
    return rules.some(
      r => r.trigger_event === scenario.trigger_event &&
           r.trigger_channel === scenario.trigger_channel &&
           r.action_channel === scenario.action_channel &&
           r.action_type === scenario.action_type &&
           r.is_active
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-gray-700" />
                Sequences & Automatisations
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">Gerez vos regles omnicanal et sequences d&apos;appel</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-px">
            {[
              { id: 'rules' as const, label: 'Regles automatiques' },
              { id: 'sequences' as const, label: 'Editeur de sequences' },
              { id: 'history' as const, label: 'Historique' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Feedback */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-800">
            <CheckCircle className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-gray-100 border border-gray-400 rounded-lg text-sm text-gray-800">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* TAB CONTENT */}
      {tab === 'sequences' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <SequenceEditor />
        </div>
      )}

      {tab === 'rules' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Scenarios rapides */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Scenarios Coccinelle.ai</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SCENARIOS.map((s, i) => {
                const active = isScenarioActive(s);
                const TriggerIcon = CHANNEL_ICONS[s.trigger_channel] || Zap;
                const ActionIcon = CHANNEL_ICONS[s.action_channel] || Zap;
                return (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TriggerIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">→</span>
                      <ActionIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{s.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{s.desc}</p>
                    <button
                      onClick={() => activateScenario(s)}
                      disabled={active}
                      className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${
                        active
                          ? 'bg-gray-100 text-gray-500 cursor-default'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {active ? 'Actif' : 'Activer'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liste des regles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Regles actives</h2>
              <div className="flex items-center gap-2">
                <button onClick={loadRules} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCreate(!showCreate)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
            </div>

            {/* Formulaire creation */}
            {showCreate && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Declencheur</label>
                    <select
                      value={newRule.trigger_event}
                      onChange={e => setNewRule({ ...newRule, trigger_event: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="call_ended">Appel termine</option>
                      <option value="message_received">Message recu</option>
                      <option value="appointment_created">RDV cree</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Canal source</label>
                    <select
                      value={newRule.trigger_channel}
                      onChange={e => setNewRule({ ...newRule, trigger_channel: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="voice">Telephone</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                    <select
                      value={newRule.action_type}
                      onChange={e => setNewRule({ ...newRule, action_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="send_message">Envoyer SMS</option>
                      <option value="send_email">Envoyer email</option>
                      <option value="ai_reply">Reponse IA</option>
                      <option value="create_prospect">Creer contact</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Template message (optionnel)</label>
                  <textarea
                    value={newRule.action_template}
                    onChange={e => setNewRule({ ...newRule, action_template: e.target.value })}
                    placeholder="Variables : {company_name}, {contact_name}, {summary}, {rdv_date}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Delai :</label>
                    <select
                      value={newRule.delay_seconds}
                      onChange={e => setNewRule({ ...newRule, delay_seconds: parseInt(e.target.value) })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={0}>Immediat</option>
                      <option value={30}>30 secondes</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={3600}>1 heure</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                    <button onClick={createRule} className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Creer</button>
                  </div>
                </div>
              </div>
            )}

            {/* Liste */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : rules.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucune regle configuree</p>
                <p className="text-xs text-gray-400 mt-1">Activez un scenario ci-dessus pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => {
                  const TriggerIcon = CHANNEL_ICONS[rule.trigger_channel] || Zap;
                  const ActionIcon = CHANNEL_ICONS[rule.action_channel] || Zap;
                  return (
                    <div key={rule.id} className={`bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between ${!rule.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <TriggerIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">→</span>
                        <ActionIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Si {TRIGGER_LABELS[rule.trigger_event] || rule.trigger_event} ({CHANNEL_LABELS[rule.trigger_channel] || rule.trigger_channel})
                            → {ACTION_LABELS[rule.action_type] || rule.action_type}
                          </p>
                          {rule.action_template && (
                            <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">{rule.action_template}</p>
                          )}
                          {rule.delay_seconds > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Delai : {rule.delay_seconds}s
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRule(rule.id, rule.is_active)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            rule.is_active
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {rule.is_active ? 'Actif' : 'Inactif'}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Historique des executions</h2>
            <button onClick={loadExecutions} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Aucune execution pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evenement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {executions.map(exec => (
                      <tr key={exec.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{TRIGGER_LABELS[exec.trigger_event] || exec.trigger_event}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{CHANNEL_LABELS[exec.trigger_channel] || exec.trigger_channel}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ACTION_LABELS[exec.action_type] || exec.action_type} → {CHANNEL_LABELS[exec.action_channel] || exec.action_channel}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{exec.contact_phone || exec.contact_email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            exec.status === 'success' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {exec.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {exec.status === 'success' ? 'OK' : 'Erreur'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(exec.executed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

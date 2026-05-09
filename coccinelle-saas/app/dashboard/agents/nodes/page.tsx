'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const SequenceFlow = dynamic(
  () => import('@/components/sequence/SequenceFlow'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-[500px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  )}
);
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import {
  Phone, MessageSquare, Mail, Users, Zap, Bot, UserPlus, RefreshCw,
  CheckCircle, XCircle, Clock, AlertCircle
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
  const [tab, setTab] = useState<'sequences' | 'rules' | 'history'>('sequences');
  const [rules, setRules] = useState<OmniRule[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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

  // Pre-load rules on mount so toggles reflect DB state immediately
  useEffect(() => {
    loadRules();
  }, [loadRules]);

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

  const handleCardToggle = async (scenario: typeof SCENARIOS[0]) => {
    const matchingRule = rules.find(
      r => r.trigger_event === scenario.trigger_event &&
           r.trigger_channel === scenario.trigger_channel &&
           r.action_channel === scenario.action_channel &&
           r.action_type === scenario.action_type
    );
    if (matchingRule) {
      await toggleRule(matchingRule.id, matchingRule.is_active);
    } else {
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
        if (res.ok) { showMsg('Regle activee'); loadRules(); }
      } catch { showMsg('Erreur', true); }
    }
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
              { id: 'sequences' as const, label: 'Editeur de sequences' },
              { id: 'rules' as const, label: 'Regles automatiques' },
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
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <SequenceFlow />
        </div>
      )}

      {tab === 'rules' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Actions automatiques</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ces actions se declenchent automatiquement apres chaque interaction. Activez ou desactivez selon vos besoins.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { scenario: SCENARIOS[0], icon: MessageSquare, title: 'SMS de remerciement', description: "Envoie un SMS au client 30 secondes apres la fin de l'appel", badge: 'Voix \u2192 SMS', comingSoon: false, disabled: false },
                { scenario: SCENARIOS[1], icon: Mail, title: 'Email recapitulatif', description: "Envoie un email de recapitulatif 1 minute apres la fin de l'appel", badge: 'Voix \u2192 Email', comingSoon: false, disabled: false },
                { scenario: SCENARIOS[2], icon: Bot, title: 'Reponse SMS automatique', description: "Repond automatiquement aux SMS recus grace a l'IA", badge: 'SMS \u2192 IA', comingSoon: false, disabled: false },
                { scenario: SCENARIOS[3], icon: UserPlus, title: 'Contact CRM depuis WhatsApp', description: 'Cree automatiquement une fiche contact quand un message WhatsApp est recu', badge: 'WhatsApp \u2192 CRM', comingSoon: true, disabled: true },
                { scenario: SCENARIOS[4], icon: UserPlus, title: 'Contact CRM apres appel', description: 'Cree automatiquement une fiche prospect apres chaque appel', badge: 'Voix \u2192 CRM', comingSoon: false, disabled: false },
              ].map((card, i) => {
                const active = isScenarioActive(card.scenario);
                const Icon = card.icon;
                return (
                  <div key={i} className={`bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4${card.disabled ? ' opacity-50' : ''}`}>
                    <div className="bg-gray-100 p-2 rounded-lg shrink-0">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{card.title}</span>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{card.badge}</span>
                        {card.comingSoon && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">Bientot disponible</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{card.description}</p>
                    </div>
                    <button
                      onClick={() => !card.disabled && handleCardToggle(card.scenario)}
                      disabled={card.disabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        active ? 'bg-green-500' : 'bg-gray-300'
                      }${card.disabled ? ' cursor-not-allowed' : ' cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        active ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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

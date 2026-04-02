'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bot, Plus, Settings, GitBranch, FileText, Phone, Power, Loader2 } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface AgentConfig {
  id: number;
  secteur: string;
  voice_id: string;
  llm_provider: string;
  llm_model: string;
  is_active: boolean;
  assistant_name: string;
  company_name: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/ai/prompts'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      const prompts = data.prompts || [];

      // Group by active prompts to show as "agents"
      const activePrompts = prompts.filter((p: any) => p.is_active === 1);
      const agentList: AgentConfig[] = activePrompts.map((p: any) => ({
        id: p.id,
        secteur: p.secteur || 'generaliste',
        voice_id: '',
        llm_provider: '',
        llm_model: '',
        is_active: true,
        assistant_name: extractAssistantName(p.system_prompt),
        company_name: '',
      }));

      // If no active agents, show a placeholder
      if (agentList.length === 0) {
        agentList.push({
          id: 0,
          secteur: 'generaliste',
          voice_id: '',
          llm_provider: 'mistral',
          llm_model: 'mistral-large-latest',
          is_active: false,
          assistant_name: 'Agent non configuré',
          company_name: '',
        });
      }

      setAgents(agentList);
    } catch {
      // Fallback
      setAgents([{
        id: 0,
        secteur: 'generaliste',
        voice_id: '',
        llm_provider: '',
        llm_model: '',
        is_active: false,
        assistant_name: 'Agent non configuré',
        company_name: '',
      }]);
    }
    setLoading(false);
  }

  function extractAssistantName(prompt: string): string {
    const match = prompt?.match(/Tu es (\w+),/);
    return match ? match[1] : 'Agent';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
                Agents IA
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Gérez vos agents vocaux IA et leurs configurations
              </p>
            </div>
            <Link
              href="/dashboard/agents/configuration"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Configurer un agent
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            href="/dashboard/agents/configuration"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Configuration</p>
              <p className="text-xs text-gray-500">Voix, LLM, prompt</p>
            </div>
          </Link>
          <Link
            href="/dashboard/agents/scripts"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Scripts d&apos;appel</p>
              <p className="text-xs text-gray-500">Textes et scénarios</p>
            </div>
          </Link>
          <Link
            href="/dashboard/agents/nodes"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <GitBranch className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Séquences</p>
              <p className="text-xs text-gray-500">Éditeur visuel de flux</p>
            </div>
          </Link>
        </div>

        {/* Agents List */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agents configurés</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${agent.is_active ? 'bg-gray-200' : 'bg-gray-100'}`}>
                    <Bot className={`w-6 h-6 ${agent.is_active ? 'text-gray-900' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{agent.assistant_name}</h3>
                      {agent.is_active ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-200 text-gray-900 rounded-full">
                          <Power className="w-3 h-3" /> Actif
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Secteur : {agent.secteur}
                      {agent.is_active && (
                        <span className="ml-2">
                          <Phone className="w-3 h-3 inline" /> +33 9 39 03 57 60
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/agents/configuration"
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Configurer
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

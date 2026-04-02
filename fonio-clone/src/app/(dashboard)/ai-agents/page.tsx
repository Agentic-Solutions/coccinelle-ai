'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Bot, Phone, Clock, TrendingUp, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE AGENTS IA (RetellAI)
// ═══════════════════════════════════════

const agents = [
  {
    id: '1', name: 'Sophie - Accueil', description: 'Agent d\'accueil qui qualifie les appels entrants et prend les RDV',
    language: 'fr-FR', voice: 'Femme - Sophie', is_active: true,
    total_calls: 156, avg_duration: 145, satisfaction: 4.7,
    phone_number: '+33 1 00 00 00 03',
  },
  {
    id: '2', name: 'Marc - Commercial', description: 'Agent commercial qui présente les offres et qualifie les prospects',
    language: 'fr-FR', voice: 'Homme - Marc', is_active: true,
    total_calls: 89, avg_duration: 210, satisfaction: 4.5,
    phone_number: '+33 6 00 00 00 01',
  },
  {
    id: '3', name: 'Emma - Support', description: 'Agent support qui répond aux questions techniques et FAQ',
    language: 'fr-FR', voice: 'Femme - Emma', is_active: false,
    total_calls: 234, avg_duration: 180, satisfaction: 4.8,
    phone_number: null,
  },
]

export default function AIAgentsPage() {
  return (
    <div>
      <Header title="Agents IA" subtitle="Gérez vos agents vocaux intelligents (RetellAI)" />

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Link href="/ai-agents/new" className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Créer un agent IA
          </Link>
        </div>

        {/* Grille d'agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', agent.is_active ? 'bg-purple-100' : 'bg-gray-100')}>
                    <Bot className={cn('w-5 h-5', agent.is_active ? 'text-purple-600' : 'text-gray-400')} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.voice}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  {agent.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">{agent.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{agent.total_calls}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Appels</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{formatDuration(agent.avg_duration)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Moy.</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{agent.satisfaction}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Score</p>
                </div>
              </div>

              {agent.phone_number && (
                <p className="text-xs text-gray-500 mb-3">
                  Numéro : <span className="font-medium text-gray-700">{agent.phone_number}</span>
                </p>
              )}

              <Link
                href={`/ai-agents/${agent.id}`}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <Settings className="w-4 h-4" /> Configurer
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Bot, Phone, Clock, TrendingUp, Star } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE ANALYTICS AGENTS IA - Performances
// ═══════════════════════════════════════

const agentStats = [
  {
    name: 'Sophie - Accueil',
    total_calls: 156,
    avg_duration: 145,
    satisfaction: 4.7,
    resolution_rate: 89,
    transfer_rate: 11,
    top_topics: ['offre-pro', 'rdv', 'tarifs'],
  },
  {
    name: 'Marc - Commercial',
    total_calls: 89,
    avg_duration: 210,
    satisfaction: 4.5,
    resolution_rate: 82,
    transfer_rate: 18,
    top_topics: ['démo', 'onboarding', 'migration'],
  },
  {
    name: 'Emma - Support',
    total_calls: 234,
    avg_duration: 180,
    satisfaction: 4.8,
    resolution_rate: 94,
    transfer_rate: 6,
    top_topics: ['bug', 'facturation', 'config'],
  },
]

export default function AnalyticsAgentsPage() {
  return (
    <div>
      <Header title="Performances agents IA" subtitle="Métriques détaillées de vos agents vocaux" />

      <div className="p-6 space-y-6">
        <Link href="/analytics" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux analytics
        </Link>

        {/* KPIs globaux */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total appels IA', value: '479', icon: Bot, color: 'bg-purple-500' },
            { label: 'Durée moyenne', value: '2m 58s', icon: Clock, color: 'bg-blue-500' },
            { label: 'Taux résolution', value: '88%', icon: TrendingUp, color: 'bg-green-500' },
            { label: 'Satisfaction moy.', value: '4.7/5', icon: Star, color: 'bg-yellow-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Détails par agent */}
        <div className="space-y-4">
          {agentStats.map(agent => (
            <div key={agent.name} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                </div>
                <span className="text-sm font-medium text-green-600">{agent.satisfaction}/5</span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-lg font-bold text-gray-900">{agent.total_calls}</span>
                  </div>
                  <p className="text-xs text-gray-500">Appels</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-lg font-bold text-gray-900">{formatDuration(agent.avg_duration)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Durée moy.</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg font-bold text-green-600">{agent.resolution_rate}%</span>
                  <p className="text-xs text-gray-500">Résolution</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className={cn('text-lg font-bold', agent.transfer_rate > 15 ? 'text-orange-600' : 'text-gray-900')}>
                    {agent.transfer_rate}%
                  </span>
                  <p className="text-xs text-gray-500">Transferts</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Sujets fréquents :</span>
                {agent.top_topics.map(topic => (
                  <span key={topic} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{topic}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Users2, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE FILES D'ATTENTE
// ═══════════════════════════════════════

// Données de démonstration
const queues = [
  {
    id: '1',
    name: 'Support technique',
    distribution: 'round_robin',
    members_count: 3,
    max_wait_time: 300,
    is_active: true,
    callers_waiting: 0,
  },
  {
    id: '2',
    name: 'Commercial',
    distribution: 'longest_idle',
    members_count: 2,
    max_wait_time: 180,
    is_active: true,
    callers_waiting: 1,
  },
  {
    id: '3',
    name: 'VIP',
    distribution: 'skills_based',
    members_count: 1,
    max_wait_time: 60,
    is_active: false,
    callers_waiting: 0,
  },
]

const distributionLabels: Record<string, string> = {
  round_robin: 'Tour à tour',
  longest_idle: 'Plus longtemps inactif',
  skills_based: 'Compétences',
}

export default function QueuesPage() {
  return (
    <div>
      <Header title="Files d'attente" subtitle="Gérez la distribution des appels" />

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Créer une file
          </button>
        </div>

        {/* Grille des files d'attente */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map(queue => (
            <div key={queue.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', queue.is_active ? 'bg-green-100' : 'bg-gray-100')}>
                    <Users2 className={cn('w-5 h-5', queue.is_active ? 'text-green-600' : 'text-gray-400')} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{queue.name}</h3>
                    <p className="text-xs text-gray-500">{distributionLabels[queue.distribution]}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  {queue.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">{queue.members_count}</p>
                  <p className="text-[10px] text-gray-500">Agents</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">{Math.floor(queue.max_wait_time / 60)}min</p>
                  <p className="text-[10px] text-gray-500">Attente max</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className={cn('text-sm font-semibold', queue.callers_waiting > 0 ? 'text-orange-600' : 'text-gray-900')}>
                    {queue.callers_waiting}
                  </p>
                  <p className="text-[10px] text-gray-500">En attente</p>
                </div>
              </div>

              <Link
                href={`/queues/${queue.id}`}
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

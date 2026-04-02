'use client'

import Header from '@/components/layout/Header'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Users, Bot, Clock, TrendingUp } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE DASHBOARD - Vue d'ensemble
// ═══════════════════════════════════════
// KPIs principaux + graphiques + activité récente

// Données de démonstration (TODO: remplacer par les vraies données D1)
const stats = [
  { name: 'Appels aujourd\'hui', value: '47', change: '+12%', icon: Phone, color: 'bg-blue-500' },
  { name: 'Appels entrants', value: '28', change: '+8%', icon: PhoneIncoming, color: 'bg-green-500' },
  { name: 'Appels sortants', value: '19', change: '+18%', icon: PhoneOutgoing, color: 'bg-purple-500' },
  { name: 'Appels manqués', value: '3', change: '-25%', icon: PhoneMissed, color: 'bg-red-500' },
]

const recentCalls = [
  { id: '1', from: '+33 6 12 34 56 78', to: 'Ligne principale', direction: 'inbound', status: 'completed', duration: '4m 23s', time: 'Il y a 5 min', contact: 'Marie Martin' },
  { id: '2', from: 'Ligne principale', to: '+33 1 23 45 67 89', direction: 'outbound', status: 'completed', duration: '12m 05s', time: 'Il y a 15 min', contact: 'Pierre Durand' },
  { id: '3', from: '+33 7 89 01 23 45', to: 'Ligne support', direction: 'inbound', status: 'missed', duration: '-', time: 'Il y a 23 min', contact: 'Inconnu' },
  { id: '4', from: 'Agent IA - Sophie', to: '+33 6 45 67 89 01', direction: 'outbound', status: 'completed', duration: '2m 45s', time: 'Il y a 30 min', contact: 'Lucas Bernard' },
  { id: '5', from: '+33 6 78 90 12 34', to: 'Ligne commerciale', direction: 'inbound', status: 'voicemail', duration: '0m 52s', time: 'Il y a 45 min', contact: 'Sophie Petit' },
]

const quickStats = [
  { label: 'Contacts', value: '1,234', icon: Users },
  { label: 'Agents IA actifs', value: '3', icon: Bot },
  { label: 'Durée moyenne', value: '3m 42s', icon: Clock },
  { label: 'Taux de réponse', value: '94%', icon: TrendingUp },
]

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" subtitle="Vue d'ensemble de votre activité" />

      <div className="p-6 space-y-6">
        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="mt-2 text-sm">
                <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                <span className="text-gray-400 ml-1">vs hier</span>
              </p>
            </div>
          ))}
        </div>

        {/* Stats secondaires */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Appels récents */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Appels récents</h2>
            <a href="/calls" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Voir tout
            </a>
          </div>
          <div className="divide-y divide-gray-100">
            {recentCalls.map((call) => (
              <div key={call.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    call.status === 'completed' ? 'bg-green-100' :
                    call.status === 'missed' ? 'bg-red-100' :
                    'bg-purple-100'
                  }`}>
                    {call.direction === 'inbound' ? (
                      <PhoneIncoming className={`w-4 h-4 ${call.status === 'missed' ? 'text-red-600' : 'text-green-600'}`} />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{call.contact}</p>
                    <p className="text-xs text-gray-500">
                      {call.direction === 'inbound' ? call.from : call.to}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">{call.duration}</p>
                  <p className="text-xs text-gray-500">{call.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

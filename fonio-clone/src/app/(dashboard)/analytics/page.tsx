'use client'

import Header from '@/components/layout/Header'
import { Phone, PhoneIncoming, PhoneOutgoing, TrendingUp, DollarSign } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE ANALYTICS - Rapports et statistiques
// ═══════════════════════════════════════

const weeklyData = [
  { day: 'Lun', calls: 45, duration: 3200 },
  { day: 'Mar', calls: 52, duration: 3800 },
  { day: 'Mer', calls: 38, duration: 2900 },
  { day: 'Jeu', calls: 61, duration: 4500 },
  { day: 'Ven', calls: 47, duration: 3400 },
  { day: 'Sam', calls: 12, duration: 800 },
  { day: 'Dim', calls: 5, duration: 300 },
]

const maxCalls = Math.max(...weeklyData.map(d => d.calls))

const topAgents = [
  { name: 'Youssef Amrouche', calls: 89, duration: '5h 32m', satisfaction: '96%' },
  { name: 'Agent IA - Sophie', calls: 76, duration: '4h 15m', satisfaction: '94%' },
  { name: 'Agent IA - Marc', calls: 45, duration: '2h 50m', satisfaction: '91%' },
]

export default function AnalyticsPage() {
  return (
    <div>
      <Header title="Analytics" subtitle="Rapports et statistiques de votre activité" />

      <div className="p-6 space-y-6">
        {/* KPIs de la semaine */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { label: 'Appels cette semaine', value: '260', icon: Phone, color: 'bg-blue-500', change: '+15%' },
            { label: 'Entrants', value: '148', icon: PhoneIncoming, color: 'bg-green-500', change: '+8%' },
            { label: 'Sortants', value: '112', icon: PhoneOutgoing, color: 'bg-purple-500', change: '+22%' },
            { label: 'Taux de réponse', value: '94%', icon: TrendingUp, color: 'bg-emerald-500', change: '+2%' },
            { label: 'Coût total', value: '12.50€', icon: DollarSign, color: 'bg-orange-500', change: '-5%' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Graphique barres - Appels par jour */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-6">Appels par jour (cette semaine)</h3>
            <div className="flex items-end gap-4 h-48">
              {weeklyData.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{d.calls}</span>
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 w-full bg-brand-500 rounded-t-lg transition-all"
                      style={{ height: `${(d.calls / maxCalls) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top agents */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top agents</h3>
            <div className="space-y-4">
              {topAgents.map((agent, i) => (
                <div key={agent.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.calls} appels &bull; {agent.duration}</p>
                  </div>
                  <span className="text-sm font-medium text-green-600">{agent.satisfaction}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE ANALYTICS APPELS - Métriques détaillées
// ═══════════════════════════════════════

const dailyStats = [
  { date: '25 mars', inbound: 32, outbound: 18, missed: 4 },
  { date: '26 mars', inbound: 28, outbound: 22, missed: 2 },
  { date: '27 mars', inbound: 35, outbound: 15, missed: 6 },
  { date: '28 mars', inbound: 41, outbound: 25, missed: 3 },
  { date: '29 mars', inbound: 12, outbound: 5, missed: 1 },
  { date: '30 mars', inbound: 4, outbound: 2, missed: 0 },
  { date: '31 mars', inbound: 38, outbound: 20, missed: 3 },
]

const maxTotal = Math.max(...dailyStats.map(d => d.inbound + d.outbound + d.missed))

export default function AnalyticsCallsPage() {
  return (
    <div>
      <Header title="Métriques appels" subtitle="Analyse détaillée de vos appels" />

      <div className="p-6 space-y-6">
        <Link href="/analytics" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux analytics
        </Link>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total appels', value: '295', icon: Phone, color: 'bg-blue-500' },
            { label: 'Entrants', value: '190', icon: PhoneIncoming, color: 'bg-green-500' },
            { label: 'Sortants', value: '107', icon: PhoneOutgoing, color: 'bg-purple-500' },
            { label: 'Manqués', value: '19', icon: PhoneMissed, color: 'bg-red-500' },
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

        {/* Graphique barres empilées */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-6">Appels par jour (7 derniers jours)</h3>
          <div className="flex items-end gap-4 h-48">
            {dailyStats.map(d => {
              const total = d.inbound + d.outbound + d.missed
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{total}</span>
                  <div className="w-full flex flex-col gap-0.5" style={{ height: `${(total / maxTotal) * 100}%` }}>
                    <div className="bg-green-400 rounded-t" style={{ flex: d.inbound }} />
                    <div className="bg-blue-400" style={{ flex: d.outbound }} />
                    <div className="bg-red-400 rounded-b" style={{ flex: d.missed || 0.1 }} />
                  </div>
                  <span className="text-xs text-gray-500">{d.date.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
          {/* Légende */}
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400" /><span className="text-xs text-gray-500">Entrants</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400" /><span className="text-xs text-gray-500">Sortants</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-gray-500">Manqués</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

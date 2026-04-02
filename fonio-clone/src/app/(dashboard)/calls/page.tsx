'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Filter, Download, Search, Play, Voicemail } from 'lucide-react'
import { cn, formatDuration, formatRelativeTime, getStatusColor } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE LISTE DES APPELS
// ═══════════════════════════════════════

// Données de démonstration
const calls = [
  { id: '1', direction: 'inbound' as const, from: '+33 6 12 34 56 78', to: '+33 1 00 00 00 01', contact: 'Marie Martin', company: 'Acme Corp', status: 'completed', duration: 263, started_at: '2026-03-31T10:30:00Z', user: 'Youssef', has_recording: true, ai: false },
  { id: '2', direction: 'outbound' as const, from: '+33 1 00 00 00 01', to: '+33 6 23 45 67 89', contact: 'Pierre Durand', company: 'Tech SAS', status: 'completed', duration: 725, started_at: '2026-03-31T10:15:00Z', user: 'Youssef', has_recording: true, ai: false },
  { id: '3', direction: 'inbound' as const, from: '+33 7 89 01 23 45', to: '+33 1 00 00 00 02', contact: null, company: null, status: 'missed', duration: 0, started_at: '2026-03-31T10:07:00Z', user: null, has_recording: false, ai: false },
  { id: '4', direction: 'outbound' as const, from: '+33 1 00 00 00 01', to: '+33 6 45 67 89 01', contact: 'Lucas Bernard', company: 'StartupXYZ', status: 'completed', duration: 165, started_at: '2026-03-31T09:50:00Z', user: null, has_recording: true, ai: true },
  { id: '5', direction: 'inbound' as const, from: '+33 6 78 90 12 34', to: '+33 1 00 00 00 01', contact: 'Sophie Petit', company: null, status: 'voicemail', duration: 52, started_at: '2026-03-31T09:35:00Z', user: null, has_recording: true, ai: false },
  { id: '6', direction: 'outbound' as const, from: '+33 1 00 00 00 01', to: '+33 6 56 78 90 12', contact: 'Antoine Roux', company: 'MediaGroup', status: 'failed', duration: 0, started_at: '2026-03-31T09:20:00Z', user: 'Youssef', has_recording: false, ai: false },
]

const filters = ['Tous', 'Entrants', 'Sortants', 'Manqués', 'Messagerie', 'IA']

export default function CallsPage() {
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [search, setSearch] = useState('')

  const filteredCalls = calls.filter(call => {
    if (activeFilter === 'Entrants') return call.direction === 'inbound'
    if (activeFilter === 'Sortants') return call.direction === 'outbound'
    if (activeFilter === 'Manqués') return call.status === 'missed'
    if (activeFilter === 'Messagerie') return call.status === 'voicemail'
    if (activeFilter === 'IA') return call.ai
    return true
  })

  return (
    <div>
      <Header title="Appels" subtitle="Historique de tous vos appels" />

      <div className="p-6 space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  activeFilter === f
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <Link
              href="/calls/dialer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              Nouveau appel
            </Link>
          </div>
        </div>

        {/* Tableau des appels */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Direction</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Numéro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Durée</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCalls.map(call => (
                <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      call.status === 'missed' || call.status === 'failed' ? 'bg-red-100' :
                      call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {call.status === 'missed' ? <PhoneMissed className="w-4 h-4 text-red-600" /> :
                       call.status === 'voicemail' ? <Voicemail className="w-4 h-4 text-purple-600" /> :
                       call.direction === 'inbound' ? <PhoneIncoming className="w-4 h-4 text-green-600" /> :
                       <PhoneOutgoing className="w-4 h-4 text-blue-600" />}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{call.contact || 'Inconnu'}</p>
                      {call.company && <p className="text-xs text-gray-500">{call.company}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {call.direction === 'inbound' ? call.from : call.to}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(call.status))}>
                      {call.status === 'completed' ? 'Terminé' :
                       call.status === 'missed' ? 'Manqué' :
                       call.status === 'voicemail' ? 'Messagerie' :
                       call.status === 'failed' ? 'Échoué' : call.status}
                    </span>
                    {call.ai && (
                      <span className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">IA</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {call.duration > 0 ? formatDuration(call.duration) : '-'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {call.ai ? 'Agent IA' : call.user || '-'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {formatRelativeTime(call.started_at)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {call.has_recording && (
                        <button className="p-1.5 rounded-md hover:bg-gray-100" title="Écouter">
                          <Play className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                      <Link href={`/calls/${call.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                        Détails
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

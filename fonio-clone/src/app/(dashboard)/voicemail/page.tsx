'use client'

import Header from '@/components/layout/Header'
import { Play, Trash2, Check, Clock } from 'lucide-react'
import { cn, formatDuration, formatRelativeTime } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE MESSAGERIE VOCALE
// ═══════════════════════════════════════

const voicemails = [
  { id: '1', from: '+33 6 78 90 12 34', contact: 'Sophie Petit', duration: 52, transcript: 'Bonjour, c\'est Sophie Petit. Je vous rappelle concernant notre discussion. Merci de me recontacter au plus vite.', is_read: false, date: '2026-03-31T09:35:00Z', line: 'Ligne principale' },
  { id: '2', from: '+33 7 89 01 23 45', contact: null, duration: 28, transcript: 'Bonjour, je souhaite obtenir des informations sur vos tarifs. Mon numéro est le 07 89 01 23 45.', is_read: false, date: '2026-03-30T17:20:00Z', line: 'Ligne commerciale' },
  { id: '3', from: '+33 6 12 34 56 78', contact: 'Marie Martin', duration: 45, transcript: 'Bonjour Youssef, c\'est Marie d\'Acme Corp. J\'ai bien reçu votre proposition. On peut en discuter demain ? Merci.', is_read: true, date: '2026-03-30T14:10:00Z', line: 'Ligne principale' },
  { id: '4', from: '+33 6 56 78 90 12', contact: 'Antoine Roux', duration: 18, transcript: 'Message court, rappellez-moi.', is_read: true, date: '2026-03-29T11:00:00Z', line: 'Ligne support' },
]

export default function VoicemailPage() {
  return (
    <div>
      <Header title="Messagerie vocale" subtitle={`${voicemails.filter(v => !v.is_read).length} non lus`} />

      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="divide-y divide-gray-100">
            {voicemails.map(vm => (
              <div key={vm.id} className={cn('px-5 py-4 hover:bg-gray-50 transition-colors', !vm.is_read && 'bg-blue-50/50')}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {!vm.is_read && <div className="w-2 h-2 bg-brand-600 rounded-full" />}
                    <div>
                      <p className={cn('text-sm', !vm.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                        {vm.contact || vm.from}
                      </p>
                      <p className="text-xs text-gray-500">{vm.from} &bull; {vm.line}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDuration(vm.duration)}
                    </div>
                    <span className="text-xs text-gray-500">{formatRelativeTime(vm.date)}</span>
                  </div>
                </div>

                {/* Transcription */}
                <p className="text-sm text-gray-600 ml-5 mb-3">{vm.transcript}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-5">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-xs font-medium">
                    <Play className="w-3 h-3" /> Écouter
                  </button>
                  {!vm.is_read && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-600">
                      <Check className="w-3 h-3" /> Marquer comme lu
                    </button>
                  )}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-red-50 text-xs font-medium text-gray-600 hover:text-red-600">
                    <Trash2 className="w-3 h-3" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

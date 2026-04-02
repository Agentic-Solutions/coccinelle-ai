'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Plus, Copy, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE WEBHOOKS - Endpoints pour recevoir les événements
// ═══════════════════════════════════════

// Données de démonstration
const webhooks = [
  {
    id: '1',
    url: 'https://api.moncrm.com/webhooks/voxyphone',
    events: ['call.completed', 'call.missed', 'sms.received'],
    status: 'active',
    last_triggered: '2026-03-31T10:30:00Z',
    success_rate: 98,
  },
  {
    id: '2',
    url: 'https://hooks.zapier.com/hooks/catch/123456',
    events: ['contact.created', 'call.completed'],
    status: 'active',
    last_triggered: '2026-03-30T16:45:00Z',
    success_rate: 100,
  },
]

const availableEvents = [
  'call.started', 'call.completed', 'call.missed', 'call.voicemail',
  'sms.sent', 'sms.received',
  'contact.created', 'contact.updated',
  'ai_agent.call_completed',
]

export default function WebhooksPage() {
  const [showForm, setShowForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  function toggleEvent(event: string) {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  return (
    <div>
      <Header title="Webhooks" subtitle="Recevez les événements en temps réel" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Retour aux paramètres
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Ajouter un webhook
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Nouveau webhook</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de destination</label>
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://votre-api.com/webhook"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Événements</label>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map(event => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selectedEvents.includes(event)
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>

            <button className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
              Créer le webhook
            </button>
          </div>
        )}

        {/* Liste des webhooks */}
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    webhook.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  )} />
                  <code className="text-sm font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded">{webhook.url}</code>
                  <button className="p-1 hover:bg-gray-100 rounded" title="Copier l'URL">
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {webhook.events.map(event => (
                  <span key={event} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{event}</span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  {webhook.success_rate >= 95 ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  Taux de succès : {webhook.success_rate}%
                </div>
                <span>Dernier appel : {formatRelativeTime(webhook.last_triggered)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

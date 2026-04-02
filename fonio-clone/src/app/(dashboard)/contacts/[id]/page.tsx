'use client'

export const runtime = 'edge'

import { use } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Building, MapPin, Edit, Trash2, PhoneIncoming, PhoneOutgoing, MessageSquare } from 'lucide-react'
import { cn, getStatusColor, formatDuration, formatRelativeTime } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE FICHE CONTACT
// ═══════════════════════════════════════

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const contact = {
    id: id,
    first_name: 'Marie', last_name: 'Martin',
    email: 'marie@acme.com', phone: '+33 6 12 34 56 78', phone_secondary: '+33 1 45 67 89 00',
    company: 'Acme Corp', job_title: 'Directrice Marketing',
    address: '12 rue de la Paix', city: 'Paris', country: 'France',
    status: 'qualified', lead_score: 85, source: 'website',
    tags: ['prospect', 'offre-pro', 'marketing'],
    notes: 'Très intéressée par l\'offre Pro. A demandé une proposition commerciale.',
    total_calls: 12, total_call_duration: 2340,
    created_at: '2026-02-15T09:00:00Z',
  }

  const callHistory = [
    { id: '1', direction: 'inbound', status: 'completed', duration: 263, date: '2026-03-31T10:30:00Z', agent: 'Youssef' },
    { id: '2', direction: 'outbound', status: 'completed', duration: 180, date: '2026-03-28T14:15:00Z', agent: 'Agent IA' },
    { id: '3', direction: 'inbound', status: 'missed', duration: 0, date: '2026-03-25T09:45:00Z', agent: '-' },
    { id: '4', direction: 'outbound', status: 'completed', duration: 420, date: '2026-03-20T11:00:00Z', agent: 'Youssef' },
  ]

  return (
    <div>
      <Header title={`${contact.first_name} ${contact.last_name}`} subtitle={contact.company || ''} />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Retour aux contacts
          </Link>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
              <Edit className="w-4 h-4" /> Modifier
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Infos contact */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-brand-700">MM</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{contact.first_name} {contact.last_name}</h2>
                  <p className="text-sm text-gray-500">{contact.job_title}</p>
                  <span className={cn('mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(contact.status))}>
                    Qualifié
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{contact.phone}</span>
                </div>
                {contact.phone_secondary && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{contact.phone_secondary}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{contact.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{contact.company}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{contact.address}, {contact.city}</span>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="flex gap-2 mt-6">
                <Link href="/calls/dialer" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                  <Phone className="w-4 h-4" /> Appeler
                </Link>
                <Link href={`/sms/${contact.id}`} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
                  <MessageSquare className="w-4 h-4" /> SMS
                </Link>
              </div>
            </div>

            {/* Score & Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Lead Score</span>
                    <span className="font-medium text-gray-900">{contact.lead_score}/100</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${contact.lead_score}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total appels</span>
                  <span className="font-medium text-gray-900">{contact.total_calls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Temps total</span>
                  <span className="font-medium text-gray-900">{formatDuration(contact.total_call_duration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Source</span>
                  <span className="font-medium text-gray-900 capitalize">{contact.source}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historique des appels + Notes */}
          <div className="col-span-2 space-y-6">
            {/* Historique */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Historique des appels</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {callHistory.map(call => (
                  <Link key={call.id} href={`/calls/${call.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', call.status === 'missed' ? 'bg-red-100' : call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100')}>
                        {call.status === 'missed' ? <Phone className="w-4 h-4 text-red-600" /> : call.direction === 'inbound' ? <PhoneIncoming className="w-4 h-4 text-green-600" /> : <PhoneOutgoing className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {call.direction === 'inbound' ? 'Appel entrant' : 'Appel sortant'}
                          {call.status === 'missed' && ' (manqué)'}
                        </p>
                        <p className="text-xs text-gray-500">Agent: {call.agent}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{call.duration > 0 ? formatDuration(call.duration) : '-'}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(call.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
              <textarea
                defaultValue={contact.notes}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Ajouter des notes..."
              />
              <button className="mt-2 px-4 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
                Sauvegarder
              </button>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {tag} <button className="ml-1 text-gray-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
                <button className="px-3 py-1 border border-dashed border-gray-300 text-gray-400 rounded-full text-sm hover:border-gray-400">
                  + Ajouter un tag
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

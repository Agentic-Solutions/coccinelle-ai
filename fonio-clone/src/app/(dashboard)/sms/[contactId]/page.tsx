'use client'

export const runtime = 'edge'

import { use, useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Send, Phone } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE CONVERSATION SMS - Détail d'un contact
// ═══════════════════════════════════════

// Données de démonstration
const contactInfo = {
  name: 'Marie Martin',
  phone: '+33 6 12 34 56 78',
  company: 'Acme Corp',
}

const messages = [
  { id: '1', direction: 'inbound' as const, text: 'Bonjour, je suis intéressée par votre offre Pro.', time: '10:30', date: '31 mars 2026' },
  { id: '2', direction: 'outbound' as const, text: 'Bonjour Marie ! Bien sûr, l\'offre Pro inclut 3 numéros virtuels, 2 agents IA et 2000 minutes.', time: '10:32', date: '31 mars 2026' },
  { id: '3', direction: 'inbound' as const, text: 'Super, quel est le tarif ?', time: '10:35', date: '31 mars 2026' },
  { id: '4', direction: 'outbound' as const, text: 'L\'offre Pro est à 79€/mois. Je peux vous faire une démo cette semaine si vous le souhaitez.', time: '10:37', date: '31 mars 2026' },
  { id: '5', direction: 'inbound' as const, text: 'Parfait, merci pour la proposition !', time: '10:45', date: '31 mars 2026' },
]

export default function SMSConversationPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = use(params)
  const [newMessage, setNewMessage] = useState('')

  // TODO: Charger la conversation depuis D1 avec contactId
  void contactId

  function sendMessage() {
    if (!newMessage.trim()) return
    // TODO: Envoyer le SMS via Telnyx
    setNewMessage('')
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title={contactInfo.name} subtitle={contactInfo.phone} />

      {/* Barre d'infos */}
      <div className="px-6 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <Link href="/sms" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Conversations
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/calls/dialer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
          >
            <Phone className="w-3.5 h-3.5" /> Appeler
          </Link>
          <Link
            href={`/contacts/${contactId}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Voir la fiche
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
            {msg.direction === 'inbound' && (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <span className="text-xs font-medium text-brand-700">{getInitials(contactInfo.name)}</span>
              </div>
            )}
            <div className={cn(
              'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm',
              msg.direction === 'outbound' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
            )}>
              <p>{msg.text}</p>
              <p className={cn('text-[10px] mt-1', msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400')}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Zone de saisie */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
            onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
          />
          <button
            onClick={sendMessage}
            className="p-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            disabled={!newMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

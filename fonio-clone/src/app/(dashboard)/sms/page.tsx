'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import { Send, Search } from 'lucide-react'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE SMS - Conversations
// ═══════════════════════════════════════

const conversations = [
  { id: '1', contact: 'Marie Martin', phone: '+33 6 12 34 56 78', lastMessage: 'Parfait, merci pour la proposition !', time: '2026-03-31T10:45:00Z', unread: 2 },
  { id: '2', contact: 'Pierre Durand', phone: '+33 6 23 45 67 89', lastMessage: 'On peut se rappeler demain ?', time: '2026-03-31T09:30:00Z', unread: 0 },
  { id: '3', contact: 'Lucas Bernard', phone: '+33 6 45 67 89 01', lastMessage: 'Bien reçu, je regarde ça.', time: '2026-03-30T16:20:00Z', unread: 0 },
  { id: '4', contact: '+33 7 89 01 23 45', phone: '+33 7 89 01 23 45', lastMessage: 'Bonjour, je souhaite un devis.', time: '2026-03-30T14:10:00Z', unread: 1 },
]

const messages = [
  { id: '1', direction: 'inbound', text: 'Bonjour, je suis intéressée par votre offre Pro.', time: '10:30' },
  { id: '2', direction: 'outbound', text: 'Bonjour Marie ! Bien sûr, je vous envoie les détails. L\'offre Pro inclut 3 numéros virtuels, 2 agents IA et 2000 minutes.', time: '10:32' },
  { id: '3', direction: 'inbound', text: 'Super, quel est le tarif ?', time: '10:35' },
  { id: '4', direction: 'outbound', text: 'L\'offre Pro est à 79€/mois. Je peux vous faire une démo cette semaine si vous le souhaitez.', time: '10:37' },
  { id: '5', direction: 'inbound', text: 'Parfait, merci pour la proposition !', time: '10:45' },
]

export default function SMSPage() {
  const [selectedConvo, setSelectedConvo] = useState(conversations[0])
  const [newMessage, setNewMessage] = useState('')

  return (
    <div>
      <Header title="SMS" subtitle="Conversations par messages" />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Liste des conversations */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  selectedConvo.id === convo.id && 'bg-brand-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-brand-700">{getInitials(convo.contact)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{convo.contact}</p>
                      <span className="text-xs text-gray-500">{formatRelativeTime(convo.time)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{convo.lastMessage}</p>
                  </div>
                  {convo.unread > 0 && (
                    <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">{convo.unread}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Zone de chat */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Header du chat */}
          <div className="px-5 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedConvo.contact}</p>
              <p className="text-xs text-gray-500">{selectedConvo.phone}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
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
                onKeyDown={e => e.key === 'Enter' && newMessage && setNewMessage('')}
              />
              <button className="p-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700" disabled={!newMessage}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

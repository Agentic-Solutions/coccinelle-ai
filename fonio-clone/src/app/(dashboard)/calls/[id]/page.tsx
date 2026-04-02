'use client'

export const runtime = 'edge'

import { use } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Phone, User, Bot, Play, Download, FileText, Tag } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE DÉTAIL D'UN APPEL
// ═══════════════════════════════════════

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // TODO: Charger les données de l'appel depuis D1
  const call = {
    id: id,
    direction: 'inbound',
    from: '+33 6 12 34 56 78',
    to: '+33 1 00 00 00 01',
    contact: { name: 'Marie Martin', company: 'Acme Corp', email: 'marie@acme.com' },
    status: 'completed',
    duration: 263,
    started_at: '2026-03-31T10:30:00Z',
    answered_at: '2026-03-31T10:30:05Z',
    ended_at: '2026-03-31T10:34:23Z',
    user: 'Youssef Amrouche',
    recording_url: '#',
    transcript: `Agent: Bonjour, VoxyPhone, Youssef à votre service. Comment puis-je vous aider ?
Client: Bonjour, je suis Marie Martin de Acme Corp. Je vous appelle concernant votre offre Pro.
Agent: Bien sûr Marie, je serais ravi de vous présenter notre offre Pro. Qu'est-ce qui vous intéresse en particulier ?
Client: Principalement les agents vocaux IA et la possibilité d'avoir plusieurs numéros virtuels.
Agent: Excellent choix ! Avec l'offre Pro, vous avez accès à 2 agents IA, 3 numéros virtuels et 2000 minutes d'appels par mois.
Client: Ça m'intéresse beaucoup. Pouvez-vous m'envoyer une proposition par email ?
Agent: Absolument, je vous envoie ça dans la journée. Est-ce que l'adresse marie@acme.com est correcte ?
Client: Oui, parfait. Merci beaucoup !
Agent: Merci à vous Marie, bonne journée !`,
    transcript_summary: 'Marie Martin d\'Acme Corp est intéressée par l\'offre Pro, notamment les agents IA et les numéros virtuels. Une proposition doit être envoyée par email.',
    sentiment: 'positive',
    tags: ['prospect', 'offre-pro', 'relance'],
    notes: '',
    cost: 0.048,
  }

  return (
    <div>
      <Header title="Détail de l'appel" subtitle={`Appel #${id}`} />

      <div className="p-6 space-y-6">
        {/* Retour */}
        <Link href="/calls" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          Retour aux appels
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="col-span-2 space-y-6">
            {/* Infos de l'appel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{call.contact.name}</h2>
                    <p className="text-sm text-gray-500">{call.contact.company} &bull; {call.from}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Terminé
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Direction</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">Entrant</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Durée</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">4m 23s</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Agent</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{call.user}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Coût</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{call.cost.toFixed(3)}€</p>
                </div>
              </div>
            </div>

            {/* Enregistrement */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Play className="w-4 h-4" /> Enregistrement
              </h3>
              <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
                <button className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center hover:bg-brand-700">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </button>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div className="w-0 h-full bg-brand-600 rounded-full" />
                </div>
                <span className="text-sm text-gray-500">4:23</span>
                <button className="p-2 hover:bg-gray-200 rounded-lg">
                  <Download className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Transcription */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Transcription
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                {call.transcript.split('\n').map((line, i) => {
                  const isAgent = line.startsWith('Agent:')
                  return (
                    <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                        isAgent ? 'bg-white border border-gray-200 text-gray-800' : 'bg-brand-600 text-white'
                      }`}>
                        {line.replace(/^(Agent|Client): /, '')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Résumé IA */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600" /> Résumé IA
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{call.transcript_summary}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Sentiment :</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Positif
                </span>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {call.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {tag}
                  </span>
                ))}
                <button className="px-2.5 py-1 border border-dashed border-gray-300 text-gray-400 rounded-full text-xs hover:border-gray-400 hover:text-gray-500">
                  + Ajouter
                </button>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Contact
              </h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">{call.contact.name}</p>
                <p className="text-sm text-gray-500">{call.contact.company}</p>
                <p className="text-sm text-gray-500">{call.contact.email}</p>
                <p className="text-sm text-gray-500">{call.from}</p>
              </div>
              <Link href="/contacts/1" className="mt-3 block text-sm text-brand-600 hover:text-brand-700 font-medium">
                Voir la fiche contact
              </Link>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
              <textarea
                placeholder="Ajouter une note sur cet appel..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={4}
              />
              <button className="mt-2 px-4 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

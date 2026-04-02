'use client'

export const runtime = 'edge'

import { use, useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Bot, Save, Loader2, Phone, Clock, TrendingUp } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE DÉTAIL / CONFIGURATION D'UN AGENT IA
// ═══════════════════════════════════════

// Données de démonstration
const agentData = {
  id: '1',
  name: 'Sophie - Accueil',
  description: 'Agent d\'accueil qui qualifie les appels entrants et prend les RDV',
  voice_id: 'sophie-fr',
  language: 'fr-FR',
  greeting_message: 'Bonjour, merci d\'avoir appelé VoxyPhone. Comment puis-je vous aider ?',
  prompt: `Tu es Sophie, agent d'accueil pour VoxyPhone.

Ton rôle :
- Accueillir chaleureusement les appelants
- Identifier leur besoin (support, commercial, RDV)
- Qualifier le prospect (nom, entreprise, besoin)
- Prendre un RDV si nécessaire
- Transférer à un agent humain si demandé

Ton ton est professionnel mais chaleureux.`,
  max_call_duration: 300,
  transfer_phone: '+33 6 12 34 56 78',
  is_active: true,
  total_calls: 156,
  avg_duration: 145,
  satisfaction: 4.7,
  phone_number: '+33 1 00 00 00 03',
}

const voices = [
  { id: 'sophie-fr', name: 'Sophie', gender: 'Femme', language: 'Français' },
  { id: 'marc-fr', name: 'Marc', gender: 'Homme', language: 'Français' },
  { id: 'emma-fr', name: 'Emma', gender: 'Femme', language: 'Français' },
  { id: 'thomas-fr', name: 'Thomas', gender: 'Homme', language: 'Français' },
]

export default function AIAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: agentData.name,
    description: agentData.description,
    voice_id: agentData.voice_id,
    greeting_message: agentData.greeting_message,
    prompt: agentData.prompt,
    max_call_duration: agentData.max_call_duration,
    transfer_phone: agentData.transfer_phone,
  })

  function updateField(field: string, value: string | number): void {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Appeler l'API pour mettre à jour l'agent
      // PATCH /api/ai-agents/:id
      void id
      void formData
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      void message
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header title={agentData.name} subtitle={`Agent IA #${id}`} />

      <div className="p-6 space-y-6">
        <Link href="/ai-agents" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux agents
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Formulaire de configuration */}
          <form onSubmit={handleSave} className="col-span-2 space-y-6">
            {/* Infos de base */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" /> Configuration
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voix</label>
                  <select
                    value={formData.voice_id}
                    onChange={e => updateField('voice_id', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  >
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => updateField('description', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message d&apos;accueil</label>
                <input
                  type="text"
                  value={formData.greeting_message}
                  onChange={e => updateField('greeting_message', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Prompt */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Instructions (prompt)</h2>
              <textarea
                value={formData.prompt}
                onChange={e => updateField('prompt', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 font-mono"
                rows={12}
              />
            </div>

            {/* Transfert */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Escalade</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de transfert</label>
                  <input
                    type="text"
                    value={formData.transfer_phone}
                    onChange={e => updateField('transfer_phone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée max (secondes)</label>
                  <input
                    type="number"
                    min={60}
                    max={1800}
                    value={formData.max_call_duration}
                    onChange={e => updateField('max_call_duration', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bouton sauvegarder */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </form>

          {/* Statistiques */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Total appels</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{agentData.total_calls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Durée moyenne</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatDuration(agentData.avg_duration)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Satisfaction</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{agentData.satisfaction}/5</span>
                </div>
              </div>
            </div>

            {agentData.phone_number && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Numéro assigné</h3>
                <p className="text-sm text-gray-600 font-mono">{agentData.phone_number}</p>
                <Link href="/phone-numbers" className="mt-2 block text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Gérer les numéros
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

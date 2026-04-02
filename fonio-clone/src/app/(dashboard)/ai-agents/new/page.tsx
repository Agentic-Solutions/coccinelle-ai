'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Bot, Loader2 } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE CRÉER UN AGENT IA
// ═══════════════════════════════════════

const voices = [
  { id: 'sophie-fr', name: 'Sophie', gender: 'Femme', language: 'Français' },
  { id: 'marc-fr', name: 'Marc', gender: 'Homme', language: 'Français' },
  { id: 'emma-fr', name: 'Emma', gender: 'Femme', language: 'Français' },
  { id: 'thomas-fr', name: 'Thomas', gender: 'Homme', language: 'Français' },
  { id: 'sarah-en', name: 'Sarah', gender: 'Femme', language: 'Anglais' },
  { id: 'james-en', name: 'James', gender: 'Homme', language: 'Anglais' },
]

export default function NewAIAgentPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice_id: 'sophie-fr',
    language: 'fr-FR',
    greeting_message: 'Bonjour, merci d\'avoir appelé. Comment puis-je vous aider ?',
    prompt: '',
    max_call_duration: 300,
    transfer_phone: '',
  })

  function updateField(field: string, value: string | number): void {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Appeler l'API pour créer l'agent sur RetellAI
      // 1. POST /api/ai-agents → crée l'agent sur RetellAI
      // 2. Sauvegarde dans D1
      // 3. Rediriger vers /ai-agents
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
      <Header title="Nouvel agent IA" subtitle="Créez un agent vocal intelligent avec RetellAI" />

      <div className="p-6">
        <Link href="/ai-agents" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour aux agents
        </Link>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Infos de base */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" /> Informations de base
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;agent</label>
              <input
                type="text" required
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Ex: Sophie - Accueil"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Ex: Agent d'accueil qui qualifie les appels"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voix</label>
                <select
                  value={formData.voice_id}
                  onChange={e => updateField('voice_id', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  {voices.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.gender} - {v.language})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée max (secondes)</label>
                <input
                  type="number" min={60} max={1800}
                  value={formData.max_call_duration}
                  onChange={e => updateField('max_call_duration', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Script / Prompt */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Script de l&apos;agent</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message d&apos;accueil</label>
              <input
                type="text"
                value={formData.greeting_message}
                onChange={e => updateField('greeting_message', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions (prompt)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Décrivez le comportement de l&apos;agent : son rôle, les informations à collecter, quand transférer à un humain...
              </p>
              <textarea
                required
                value={formData.prompt}
                onChange={e => updateField('prompt', e.target.value)}
                placeholder={`Tu es Sophie, agent d'accueil pour VoxyPhone.\n\nTon rôle :\n- Accueillir chaleureusement les appelants\n- Identifier leur besoin (support, commercial, RDV)\n- Qualifier le prospect (nom, entreprise, besoin)\n- Prendre un RDV si nécessaire\n- Transférer à un agent humain si demandé\n\nTon ton est professionnel mais chaleureux.`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 font-mono"
                rows={12}
              />
            </div>
          </div>

          {/* Transfert */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Escalade vers un humain</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de transfert (optionnel)
              </label>
              <input
                type="text"
                value={formData.transfer_phone}
                onChange={e => updateField('transfer_phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">L&apos;agent transférera l&apos;appel à ce numéro si nécessaire</p>
            </div>
          </div>

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {loading ? 'Création en cours...' : 'Créer l\'agent IA'}
          </button>
        </form>
      </div>
    </div>
  )
}

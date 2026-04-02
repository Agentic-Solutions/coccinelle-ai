'use client'

export const runtime = 'edge'

import { use, useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE DÉTAIL IVR - Configuration d'un menu
// ═══════════════════════════════════════

interface IVROptionForm {
  key: string
  label: string
  action: string
  target: string
}

export default function IVRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('Menu principal')
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Bienvenue chez VoxyPhone. Appuyez sur 1 pour le commercial, 2 pour le support, 3 pour laisser un message.'
  )
  const [options, setOptions] = useState<IVROptionForm[]>([
    { key: '1', label: 'Commercial', action: 'transfer_user', target: 'Youssef Amrouche' },
    { key: '2', label: 'Support', action: 'transfer_queue', target: 'File Support' },
    { key: '3', label: 'Message', action: 'voicemail', target: '' },
  ])

  function addOption() {
    setOptions(prev => [...prev, { key: String(prev.length + 1), label: '', action: 'transfer_user', target: '' }])
  }

  function removeOption(index: number) {
    setOptions(prev => prev.filter((_, i) => i !== index))
  }

  function updateOption(index: number, field: keyof IVROptionForm, value: string) {
    setOptions(prev => prev.map((opt, i) => i === index ? { ...opt, [field]: value } : opt))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Sauvegarder la config IVR dans D1
      void id
    } catch (err: unknown) {
      void (err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header title={name} subtitle={`Menu IVR #${id}`} />

      <div className="p-6 space-y-6">
        <Link href="/ivr" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux menus IVR
        </Link>

        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          {/* Infos de base */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du menu</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message d&apos;accueil</label>
              <textarea
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                rows={3}
              />
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Options du menu</h2>
              <button type="button" onClick={addOption} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-3">
              {options.map((option, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={option.key}
                    onChange={e => updateOption(i, 'key', e.target.value)}
                    className="w-12 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center font-mono"
                    placeholder="1"
                  />
                  <input
                    type="text"
                    value={option.label}
                    onChange={e => updateOption(i, 'label', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Libellé"
                  />
                  <select
                    value={option.action}
                    onChange={e => updateOption(i, 'action', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="transfer_user">Transférer à un agent</option>
                    <option value="transfer_queue">Transférer à une file</option>
                    <option value="transfer_ai">Transférer à un agent IA</option>
                    <option value="voicemail">Messagerie vocale</option>
                    <option value="submenu">Sous-menu</option>
                  </select>
                  <input
                    type="text"
                    value={option.target}
                    onChange={e => updateOption(i, 'target', e.target.value)}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Cible"
                  />
                  <button type="button" onClick={() => removeOption(i)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </form>
      </div>
    </div>
  )
}

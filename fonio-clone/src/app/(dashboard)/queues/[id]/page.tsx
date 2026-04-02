'use client'

export const runtime = 'edge'

import { use, useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE DÉTAIL FILE D'ATTENTE
// ═══════════════════════════════════════

// Données de démonstration
const queueMembers = [
  { id: '1', name: 'Youssef Amrouche', role: 'owner', is_available: true },
  { id: '2', name: 'Sophie Agent', role: 'agent', is_available: true },
  { id: '3', name: 'Marc Manager', role: 'manager', is_available: false },
]

export default function QueueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('Support technique')
  const [distribution, setDistribution] = useState('round_robin')
  const [maxWait, setMaxWait] = useState(300)
  const [maxSize, setMaxSize] = useState(10)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Sauvegarder la config dans D1
      void id
    } catch (err: unknown) {
      void (err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header title={name} subtitle={`File d'attente #${id}`} />

      <div className="p-6 space-y-6">
        <Link href="/queues" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux files d&apos;attente
        </Link>

        <div className="grid grid-cols-3 gap-6">
          <form onSubmit={handleSave} className="col-span-2 space-y-6">
            {/* Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la file</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de distribution</label>
                <select
                  value={distribution}
                  onChange={e => setDistribution(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="round_robin">Tour à tour (Round Robin)</option>
                  <option value="longest_idle">Agent le plus longtemps inactif</option>
                  <option value="skills_based">Basé sur les compétences</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attente max (sec)</label>
                  <input
                    type="number"
                    min={30}
                    max={600}
                    value={maxWait}
                    onChange={e => setMaxWait(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taille max</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxSize}
                    onChange={e => setMaxSize(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
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

          {/* Membres de la file */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Membres ({queueMembers.length})</h3>
                <button className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
              <div className="space-y-3">
                {queueMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-brand-700">{getInitials(member.name)}</span>
                        </div>
                        <div className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full',
                          member.is_available ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

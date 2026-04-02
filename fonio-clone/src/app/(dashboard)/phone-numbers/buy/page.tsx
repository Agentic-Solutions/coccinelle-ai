'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Search, ShoppingCart, Phone, MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE ACHETER UN NUMÉRO - Via Telnyx
// ═══════════════════════════════════════

const countries = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
]

// Résultats de démonstration
const availableNumbers = [
  { phone_number: '+33 1 86 95 00 12', type: 'local', voice: true, sms: true, monthly: 1.50, setup: 0 },
  { phone_number: '+33 1 86 95 00 34', type: 'local', voice: true, sms: true, monthly: 1.50, setup: 0 },
  { phone_number: '+33 6 44 60 00 78', type: 'mobile', voice: true, sms: true, monthly: 5.00, setup: 1.00 },
  { phone_number: '+33 1 86 95 00 56', type: 'local', voice: true, sms: false, monthly: 1.00, setup: 0 },
  { phone_number: '+33 8 05 00 12 34', type: 'toll_free', voice: true, sms: false, monthly: 7.00, setup: 0 },
]

export default function BuyNumberPage() {
  const [country, setCountry] = useState('FR')
  const [numberType, setNumberType] = useState('local')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null)

  async function searchNumbers() {
    setLoading(true)
    // TODO: Appeler l'API Telnyx pour rechercher des numéros
    // const response = await fetch('/api/phone-numbers/search', { body: { country, type: numberType, contains: search } })
    setTimeout(() => setLoading(false), 1000)
  }

  async function purchaseNumber() {
    if (!selectedNumber) return
    // TODO: Appeler l'API Telnyx pour acheter le numéro
    // const response = await fetch('/api/phone-numbers/purchase', { body: { phone_number: selectedNumber } })
    alert(`Numéro ${selectedNumber} acheté avec succès !`)
  }

  return (
    <div>
      <Header title="Acheter un numéro" subtitle="Recherchez et achetez un numéro virtuel via Telnyx" />

      <div className="p-6 space-y-6">
        <Link href="/phone-numbers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux numéros
        </Link>

        {/* Filtres de recherche */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rechercher un numéro</h2>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={numberType}
                onChange={e => setNumberType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="local">Local</option>
                <option value="mobile">Mobile</option>
                <option value="toll_free">Numéro vert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contient (optionnel)</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ex: 06, 800..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={searchNumbers}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Rechercher
              </button>
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Numéros disponibles ({availableNumbers.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {availableNumbers.map(num => (
              <div
                key={num.phone_number}
                onClick={() => setSelectedNumber(num.phone_number)}
                className={cn(
                  'flex items-center justify-between px-5 py-4 cursor-pointer transition-colors',
                  selectedNumber === num.phone_number ? 'bg-brand-50 border-l-4 border-brand-600' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900">{num.phone_number}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs uppercase">{num.type}</span>
                  <div className="flex items-center gap-2">
                    {num.voice && <Phone className="w-4 h-4 text-green-500" />}
                    {num.sms && <MessageSquare className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{num.monthly.toFixed(2)}€/mois</p>
                  {num.setup > 0 && <p className="text-xs text-gray-500">+ {num.setup.toFixed(2)}€ d&apos;activation</p>}
                </div>
              </div>
            ))}
          </div>

          {selectedNumber && (
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Numéro sélectionné : <strong>{selectedNumber}</strong>
              </p>
              <button
                onClick={purchaseNumber}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <ShoppingCart className="w-4 h-4" /> Acheter ce numéro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

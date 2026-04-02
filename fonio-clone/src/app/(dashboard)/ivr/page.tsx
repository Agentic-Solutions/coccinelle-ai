'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, ListTree, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE IVR / SVI - Menus vocaux interactifs
// ═══════════════════════════════════════

// Données de démonstration
const ivrMenus = [
  {
    id: '1',
    name: 'Menu principal',
    welcome_message: 'Bienvenue chez VoxyPhone. Appuyez sur 1 pour le commercial, 2 pour le support, 3 pour laisser un message.',
    options_count: 3,
    is_active: true,
    phone_number: '+33 6 00 00 00 01',
  },
  {
    id: '2',
    name: 'Menu support',
    welcome_message: 'Service support. Appuyez sur 1 pour un problème technique, 2 pour la facturation.',
    options_count: 2,
    is_active: true,
    phone_number: null,
  },
  {
    id: '3',
    name: 'Menu horaires fermés',
    welcome_message: 'Nos bureaux sont actuellement fermés. Veuillez laisser un message après le bip.',
    options_count: 1,
    is_active: false,
    phone_number: null,
  },
]

export default function IVRPage() {
  return (
    <div>
      <Header title="IVR / SVI" subtitle="Menus vocaux interactifs" />

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Créer un menu
          </button>
        </div>

        {/* Grille des menus IVR */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ivrMenus.map(menu => (
            <div key={menu.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', menu.is_active ? 'bg-blue-100' : 'bg-gray-100')}>
                    <ListTree className={cn('w-5 h-5', menu.is_active ? 'text-blue-600' : 'text-gray-400')} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{menu.name}</h3>
                    <p className="text-xs text-gray-500">{menu.options_count} options</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  {menu.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{menu.welcome_message}</p>

              {menu.phone_number && (
                <p className="text-xs text-gray-500 mb-3">
                  Numéro : <span className="font-medium text-gray-700">{menu.phone_number}</span>
                </p>
              )}

              <Link
                href={`/ivr/${menu.id}`}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <Settings className="w-4 h-4" /> Configurer
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

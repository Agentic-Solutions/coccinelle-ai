'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Phone, MessageSquare, Bot, User, Settings, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE NUMÉROS VIRTUELS
// ═══════════════════════════════════════

const phoneNumbers = [
  { id: '1', number: '+33 1 00 00 00 01', friendly_name: 'Ligne principale', country: 'FR', type: 'local', routing: 'user', assigned_to: 'Youssef Amrouche', capabilities: { voice: true, sms: true }, monthly_cost: 1.50, status: 'active' },
  { id: '2', number: '+33 1 00 00 00 02', friendly_name: 'Ligne support', country: 'FR', type: 'local', routing: 'queue', assigned_to: 'File Support', capabilities: { voice: true, sms: true }, monthly_cost: 1.50, status: 'active' },
  { id: '3', number: '+33 1 00 00 00 03', friendly_name: 'Ligne commerciale', country: 'FR', type: 'local', routing: 'ai_agent', assigned_to: 'Agent IA - Sophie', capabilities: { voice: true, sms: false }, monthly_cost: 1.50, status: 'active' },
  { id: '4', number: '+33 6 00 00 00 01', friendly_name: 'Mobile marketing', country: 'FR', type: 'mobile', routing: 'ivr', assigned_to: 'Menu IVR principal', capabilities: { voice: true, sms: true }, monthly_cost: 5.00, status: 'active' },
]

const routingIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  queue: Phone,
  ai_agent: Bot,
  ivr: Settings,
}

export default function PhoneNumbersPage() {
  return (
    <div>
      <Header title="Numéros virtuels" subtitle={`${phoneNumbers.length} numéros actifs`} />

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex justify-end">
          <Link href="/phone-numbers/buy" className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Acheter un numéro
          </Link>
        </div>

        {/* Grille de numéros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phoneNumbers.map(num => {
            const RoutingIcon = routingIcons[num.routing] || Phone
            return (
              <div key={num.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-semibold text-gray-900">{num.number}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{num.friendly_name}</p>
                  </div>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', num.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                    {num.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-2 h-2 rounded-full', num.capabilities.voice ? 'bg-green-500' : 'bg-gray-300')} />
                    <span className="text-xs text-gray-500">Voix</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-2 h-2 rounded-full', num.capabilities.sms ? 'bg-green-500' : 'bg-gray-300')} />
                    <span className="text-xs text-gray-500">SMS</span>
                  </div>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500 uppercase">{num.type}</span>
                  <span className="text-xs text-gray-500">{num.country}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <RoutingIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{num.assigned_to}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{num.monthly_cost.toFixed(2)}€/mois</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

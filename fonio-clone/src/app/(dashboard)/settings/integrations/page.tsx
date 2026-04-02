'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Plug, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE INTÉGRATIONS - CRM, calendrier, outils
// ═══════════════════════════════════════

// Données de démonstration
const integrations = [
  { id: 'telnyx', name: 'Telnyx', description: 'Téléphonie cloud, SIP, SMS et numéros virtuels', category: 'Téléphonie', status: 'connected', icon: '/integrations/telnyx.svg' },
  { id: 'retellai', name: 'RetellAI', description: 'Agents vocaux IA conversationnels', category: 'IA', status: 'connected', icon: '/integrations/retellai.svg' },
  { id: 'stripe', name: 'Stripe', description: 'Paiements et gestion des abonnements', category: 'Paiement', status: 'connected', icon: '/integrations/stripe.svg' },
  { id: 'google-calendar', name: 'Google Calendar', description: 'Synchronisation des rendez-vous', category: 'Productivité', status: 'disconnected', icon: '/integrations/google.svg' },
  { id: 'hubspot', name: 'HubSpot', description: 'Synchronisation CRM et contacts', category: 'CRM', status: 'disconnected', icon: '/integrations/hubspot.svg' },
  { id: 'slack', name: 'Slack', description: 'Notifications d\'appels et résumés IA', category: 'Communication', status: 'disconnected', icon: '/integrations/slack.svg' },
]

export default function IntegrationsPage() {
  return (
    <div>
      <Header title="Intégrations" subtitle="Connectez vos outils préférés" />

      <div className="p-6 space-y-6">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux paramètres
        </Link>

        {/* Grille des intégrations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map(integration => (
            <div key={integration.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Plug className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                    <span className="text-xs text-gray-400">{integration.category}</span>
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  integration.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {integration.status === 'connected' ? 'Connecté' : 'Disponible'}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4">{integration.description}</p>

              <button className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                integration.status === 'connected'
                  ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              )}>
                {integration.status === 'connected' ? (
                  <>Configurer</>
                ) : (
                  <><ExternalLink className="w-4 h-4" /> Connecter</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

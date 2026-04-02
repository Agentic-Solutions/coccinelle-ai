'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Building, Users, CreditCard, Plug, Webhook } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE PARAMÈTRES - Vue générale
// ═══════════════════════════════════════

const settingsGroups = [
  {
    title: 'Organisation',
    items: [
      { name: 'Général', description: 'Nom, logo, fuseau horaire et préférences', icon: Building, href: '/settings' },
      { name: 'Équipe', description: 'Gérer les membres et les rôles', icon: Users, href: '/settings/team' },
    ],
  },
  {
    title: 'Facturation',
    items: [
      { name: 'Abonnement', description: 'Plan actuel, factures et moyens de paiement', icon: CreditCard, href: '/settings/billing' },
    ],
  },
  {
    title: 'Technique',
    items: [
      { name: 'Intégrations', description: 'CRM, calendrier et outils connectés', icon: Plug, href: '/settings/integrations' },
      { name: 'Webhooks', description: 'Endpoints pour recevoir les événements', icon: Webhook, href: '/settings/webhooks' },
    ],
  },
]

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('VoxyPhone Demo')
  const [orgEmail, setOrgEmail] = useState('contact@voxyphone.com')
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [language, setLanguage] = useState('fr')

  return (
    <div>
      <Header title="Paramètres" subtitle="Configuration de votre organisation" />

      <div className="p-6 space-y-6">
        {/* Navigation rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {settingsGroups.map(group => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.title}</h3>
              <div className="space-y-2">
                {group.items.map(item => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-brand-300 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire paramètres généraux */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Paramètres généraux</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;organisation</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email principal</label>
              <input
                type="email"
                value={orgEmail}
                onChange={e => setOrgEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            <button className="mt-4 px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
              Sauvegarder les modifications
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

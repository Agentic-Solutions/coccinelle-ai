'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Download, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE FACTURATION - Abonnement et factures
// ═══════════════════════════════════════

// Données de démonstration
const currentPlan = {
  name: 'Pro',
  price: 79,
  period: 'mois',
  status: 'active',
  next_billing: '2026-05-01',
  features: [
    '3 numéros virtuels',
    '2 agents IA',
    '2000 minutes/mois',
    'SMS illimités',
    'Enregistrements 30j',
    'Support prioritaire',
  ],
}

const invoices = [
  { id: 'INV-2026-003', date: '2026-03-01', amount: 79.00, status: 'paid' },
  { id: 'INV-2026-002', date: '2026-02-01', amount: 79.00, status: 'paid' },
  { id: 'INV-2026-001', date: '2026-01-01', amount: 79.00, status: 'paid' },
]

export default function BillingPage() {
  return (
    <div>
      <Header title="Facturation" subtitle="Abonnement, factures et moyens de paiement" />

      <div className="p-6 space-y-6">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux paramètres
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Plan actuel */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Plan {currentPlan.name}</h2>
                <p className="text-sm text-gray-500">
                  Prochaine facturation le {new Date(currentPlan.next_billing).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{currentPlan.price}€<span className="text-base font-normal text-gray-500">/{currentPlan.period}</span></p>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Actif</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentPlan.features.map(feature => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
                Changer de plan
              </button>
              <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
                Annuler l&apos;abonnement
              </button>
            </div>
          </div>

          {/* Moyen de paiement */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Moyen de paiement</h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <CreditCard className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">**** **** **** 4242</p>
                <p className="text-xs text-gray-500">Expire 12/2028</p>
              </div>
            </div>
            <button className="w-full px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
              Modifier
            </button>
          </div>
        </div>

        {/* Historique des factures */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Historique des factures</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Facture</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{invoice.id}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {new Date(invoice.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 font-medium">{invoice.amount.toFixed(2)}€</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {invoice.status === 'paid' ? 'Payée' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

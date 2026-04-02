'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Search, Filter, Upload, Download, Phone, Mail, MoreHorizontal } from 'lucide-react'
import { cn, getStatusColor, getInitials } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE CONTACTS / CRM
// ═══════════════════════════════════════

const contacts = [
  { id: '1', first_name: 'Marie', last_name: 'Martin', email: 'marie@acme.com', phone: '+33 6 12 34 56 78', company: 'Acme Corp', status: 'qualified', lead_score: 85, total_calls: 12, tags: ['prospect', 'offre-pro'] },
  { id: '2', first_name: 'Pierre', last_name: 'Durand', email: 'pierre@tech.com', phone: '+33 6 23 45 67 89', company: 'Tech SAS', status: 'customer', lead_score: 92, total_calls: 28, tags: ['client', 'pro'] },
  { id: '3', first_name: 'Lucas', last_name: 'Bernard', email: 'lucas@startupxyz.com', phone: '+33 6 45 67 89 01', company: 'StartupXYZ', status: 'new', lead_score: 45, total_calls: 2, tags: ['nouveau'] },
  { id: '4', first_name: 'Sophie', last_name: 'Petit', email: 'sophie@media.fr', phone: '+33 6 78 90 12 34', company: null, status: 'contacted', lead_score: 60, total_calls: 5, tags: ['relance'] },
  { id: '5', first_name: 'Antoine', last_name: 'Roux', email: 'antoine@mediagroup.com', phone: '+33 6 56 78 90 12', company: 'MediaGroup', status: 'lost', lead_score: 20, total_calls: 3, tags: ['perdu'] },
]

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  qualified: 'Qualifié',
  customer: 'Client',
  lost: 'Perdu',
}

export default function ContactsPage() {
  const [search, setSearch] = useState('')

  return (
    <div>
      <Header title="Contacts" subtitle={`${contacts.length} contacts`} />

      <div className="p-6 space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un contact..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-80 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
              <Filter className="w-4 h-4" /> Filtres
            </button>
            <Link href="/contacts/import" className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
              <Upload className="w-4 h-4" /> Importer
            </Link>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
              <Download className="w-4 h-4" /> Exporter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Ajouter un contact
            </button>
          </div>
        </div>

        {/* Tableau des contacts */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Entreprise</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Téléphone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Appels</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tags</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(contact => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-brand-700">
                          {getInitials(`${contact.first_name} ${contact.last_name}`)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                        <p className="text-xs text-gray-500">{contact.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{contact.company || '-'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{contact.phone}</td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(contact.status))}>
                      {statusLabels[contact.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                        <div
                          className={cn('h-full rounded-full', contact.lead_score >= 70 ? 'bg-green-500' : contact.lead_score >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
                          style={{ width: `${contact.lead_score}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{contact.lead_score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{contact.total_calls}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {contact.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-md hover:bg-gray-100" title="Appeler">
                        <Phone className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-100" title="Email">
                        <Mail className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-100">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
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

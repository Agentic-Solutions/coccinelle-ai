'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Plus, MoreHorizontal, Mail } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE GESTION D'ÉQUIPE
// ═══════════════════════════════════════

// Données de démonstration
const members = [
  { id: '1', name: 'Youssef Amrouche', email: 'youssef@voxyphone.com', role: 'owner', status: 'active', extension: '101' },
  { id: '2', name: 'Sophie Agent', email: 'sophie@voxyphone.com', role: 'agent', status: 'active', extension: '102' },
  { id: '3', name: 'Marc Manager', email: 'marc@voxyphone.com', role: 'manager', status: 'active', extension: '103' },
  { id: '4', name: 'Emma Support', email: 'emma@voxyphone.com', role: 'agent', status: 'invited', extension: null },
]

const roleLabels: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  manager: 'Manager',
  agent: 'Agent',
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  agent: 'bg-gray-100 text-gray-600',
}

export default function TeamPage() {
  const [inviteEmail, setInviteEmail] = useState('')

  return (
    <div>
      <Header title="Équipe" subtitle="Gérer les membres et les rôles" />

      <div className="p-6 space-y-6">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux paramètres
        </Link>

        {/* Inviter un membre */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inviter un membre</h2>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@entreprise.com"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Inviter
            </button>
          </div>
        </div>

        {/* Liste des membres */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Membre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Rôle</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Extension</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-brand-700">{getInitials(member.name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', roleColors[member.role])}>
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{member.extension || '-'}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {member.status === 'active' ? 'Actif' : 'Invité'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="p-1.5 rounded-md hover:bg-gray-100">
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
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
